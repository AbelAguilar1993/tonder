import { createResponse } from "../../../utils/cors.js";

async function handleCreditsPurchaseNotification(env, data, user_id, metadata) {
  const invoiceId = metadata.invoice_id;

  if (!invoiceId) {
    return createResponse({ success: false, error: "Missing invoice_id" }, 400);
  }

  if (!user_id) {
    return createResponse({ success: false, error: "Missing user_id" }, 400);
  }

  const invoice = await env.DB.prepare(`SELECT * FROM invoices WHERE id = ?`)
    .bind(invoiceId)
    .first();

  if (!invoice) {
    return createResponse({ success: false, error: "Invoice not found" }, 404);
  }

  if (invoice.status === "paid") {
    return createResponse({ success: true, message: "Already processed" }, 200);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE invoices
     SET status = 'paid', payment_gateway_id = ?, paid_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(data.payment_id || "N/A", now, now, invoiceId)
    .run();

  const user = await env.DB.prepare(`SELECT credits FROM users WHERE id = ?`)
    .bind(user_id)
    .first();

  const currentBalance = user?.credits || 0;
  const newBalance = currentBalance + invoice.credits_purchased;

  await env.DB.prepare(
    `UPDATE users SET credits = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(newBalance, now, user_id)
    .run();

  const description = `Compra de ${invoice.credits_purchased} crédito${
    invoice.credits_purchased > 1 ? "s" : ""
  }${
    invoice.discount_rate > 0
      ? ` (${Math.round(invoice.discount_rate * 100)}% descuento)`
      : ""
  }`;

  await env.DB.prepare(
    `INSERT INTO credit_transactions (
      user_id, type, amount, balance_after, description,
      reference_type, reference_id, created_at
    ) VALUES (?, 'purchase', ?, ?, ?, 'invoice', ?, ?)`,
  )
    .bind(
      user_id,
      invoice.credits_purchased,
      newBalance,
      description,
      invoiceId,
      now,
    )
    .run();

  return createResponse(
    { success: true, message: "Credits added successfully" },
    200,
  );
}

async function handleJobUnlockNotification(env, data, user_id, metadata) {
  const job_id = metadata.job_id;
  const contact_id = metadata.contact_id;
  const chips = metadata.chips || [];

  if (!job_id || !contact_id) {
    console.error("Missing job_id or contact_id for job unlock");
    return createResponse(
      { success: false, error: "Missing job_id or contact_id" },
      400,
    );
  }

  if (!user_id) {
    return createResponse({ success: false, error: "Missing user_id" }, 400);
  }

  const existJobApplication = await env.DB.prepare(
    `SELECT id FROM user_job_applications WHERE user_id = ? AND job_id = ? AND contact_id = ?`,
  )
    .bind(user_id, job_id, contact_id)
    .first();

  if (existJobApplication) {
    console.log("Job application already exists:", existJobApplication.id);
    return createResponse(
      { success: true, message: "Job application already exists" },
      200,
    );
  }

  const presetChipsJson = JSON.stringify(chips);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO user_job_applications (user_id, job_id, contact_id, status, credits_spent, unlocked_at, created_at, updated_at, preset_chips)
    VALUES (?, ?, ?, 'unlocked', 0, ?, ?, ?, ?)`,
  )
    .bind(user_id, job_id, contact_id, now, now, now, presetChipsJson)
    .run();

  return createResponse(
    { success: true, message: "Job unlocked successfully" },
    200,
  );
}

function verifySignature(payload, signature, secret) {
  const payloadString = JSON.stringify(payload);
  
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(payloadString);

  return crypto.subtle
    .importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    .then((key) => crypto.subtle.sign("HMAC", key, data))
    .then((signatureBuffer) => {
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `sha256=${hashHex}` === signature;
    });
}

export async function handleWebhook(request, env) {
  try {
    const payload = await request.json();
    const signature = request.headers.get("x-tonder-signature");

    console.log('[Webhook] Received payload:', JSON.stringify(payload, null, 2));

    // Verify signature if secret is configured
    if (env.TONDER_WEBHOOK_SECRET) {
      const isValid = await verifySignature(
        payload,
        signature,
        env.TONDER_WEBHOOK_SECRET,
      );

      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        return createResponse({ error: "Invalid signature" }, 401);
      }
    }

    // Determine webhook structure (Card vs APM)
    const isCardWebhook = payload.card_brand !== undefined;
    const isAPMWebhook = payload.type === "apm" || payload.data?.payment_method_name !== undefined;

    // Extract common fields
    let eventId, transactionRef, status, metadata, paymentMethodName;

    if (isAPMWebhook && payload.data) {
      // APM Webhook structure (OXXO, SPEI, Mercado Pago, etc.)
      eventId = payload.data.id;
      transactionRef = payload.data.transaction_reference;
      status = payload.data.transaction_status; // "Success", "Pending", "Failed"
      metadata = payload.data.metadata || {};
      paymentMethodName = payload.data.payment_method_name; // "oxxopay", "spei", etc.
    } else {
      // Card Webhook structure
      eventId = payload.transaction_reference;
      transactionRef = payload.transaction_reference;
      status = payload.status; // "Success", "Failed"
      metadata = payload.metadata || {};
      paymentMethodName = payload.card_brand?.toLowerCase(); // "visa", "mastercard"
    }

    console.log('[Webhook] Parsed data:', {
      eventId,
      transactionRef,
      status,
      paymentMethodName,
      metadata
    });

    // Check for duplicate processing
    const existingEvent = await env.DB.prepare(
      "SELECT * FROM tonder_webhook_events WHERE event_id = ?",
    )
      .bind(eventId)
      .first();

    if (existingEvent?.processed) {
      console.log('[Webhook] Already processed:', eventId);
      return createResponse(
        { success: true, message: "Already processed" },
        200,
      );
    }

    // Store webhook event for audit trail
    await env.DB.prepare(
      `INSERT INTO tonder_webhook_events (event_id, payment_id, event_type, payload)
      VALUES (?, ?, ?, ?)`,
    )
      .bind(
        eventId,
        transactionRef,
        isAPMWebhook ? 'apm' : 'card',
        JSON.stringify(payload),
      )
      .run();

    // Find payment in database by matching transaction_reference or order_id from metadata
    let payment = null;
    
    // Try to match by order_id in metadata (most reliable)
    if (metadata.order_id) {
      const payments = await env.DB.prepare(
        `SELECT * FROM tonder_payments WHERE json_extract(metadata, '$.order_id') = ?`
      )
        .bind(metadata.order_id)
        .all();
      
      payment = payments.results?.[0];
      console.log('[Webhook] Found payment by order_id:', payment?.payment_id);
    }

    // Fallback: try to match by transaction_reference stored in payment_id or intent_id
    if (!payment && transactionRef) {
      payment = await env.DB.prepare(
        "SELECT * FROM tonder_payments WHERE payment_id = ? OR intent_id = ?",
      )
        .bind(transactionRef, transactionRef)
        .first();
      
      console.log('[Webhook] Found payment by transaction_reference:', payment?.payment_id);
    }

    if (!payment) {
      console.error('[Webhook] Payment not found for transaction:', transactionRef);
      // Still mark webhook as processed to avoid retries
      await env.DB.prepare(
        `UPDATE tonder_webhook_events SET processed = 1 WHERE event_id = ?`,
      )
        .bind(eventId)
        .run();
      
      return createResponse(
        { success: true, message: "Payment not found, but webhook logged" },
        200,
      );
    }

    // Normalize status to database format
    const normalizedStatus = status === "Success" ? "succeeded" : 
                             status === "Pending" ? "pending" : 
                             status === "Failed" ? "failed" : 
                             status.toLowerCase();

    // Update payment status in database
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE tonder_payments 
      SET status = ?, payment_method = ?, updated_at = ?, paid_at = ?
      WHERE payment_id = ?`,
    )
      .bind(
        normalizedStatus,
        paymentMethodName || payment.payment_method,
        now,
        normalizedStatus === "succeeded" ? now : null,
        payment.payment_id,
      )
      .run();

    console.log('[Webhook] Updated payment status:', {
      payment_id: payment.payment_id,
      status: normalizedStatus,
      payment_method: paymentMethodName
    });

    // Trigger business logic only for successful payments
    if (normalizedStatus === "succeeded") {
      const paymentMetadata = JSON.parse(payment.metadata || "{}");

      if (payment.payment_type === "job_unlock") {
        console.log('[Webhook] Processing job unlock...');
        await handleJobUnlockNotification(
          env,
          { transaction_reference: transactionRef },
          payment.user_id,
          paymentMetadata,
        );
      } else if (payment.payment_type === "credits_purchase") {
        console.log('[Webhook] Processing credits purchase...');
        await handleCreditsPurchaseNotification(
          env,
          { transaction_reference: transactionRef },
          payment.user_id,
          paymentMetadata,
        );
      }
    }

    // Mark webhook as processed
    await env.DB.prepare(
      `UPDATE tonder_webhook_events SET processed = 1 WHERE event_id = ?`,
    )
      .bind(eventId)
      .run();

    console.log('[Webhook] Successfully processed webhook:', eventId);
    return createResponse({ success: true }, 200);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return createResponse(
      { error: "Internal server error", message: error.message },
      500,
    );
  }
}

