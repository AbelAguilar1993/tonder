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
    `INSERT INTO user_job_applications (
      user_id, job_id, contact_id, status, credits_spent,
      unlocked_at, created_at, updated_at, preset_chips
    )
    VALUES (?, ?, ?, 'unlocked', 0, ?, ?, ?, ?)`,
  )
    .bind(user_id, job_id, contact_id, now, now, now, presetChipsJson)
    .run();

  return createResponse(
    { success: true, message: "Job unlocked successfully" },
    200,
  );
}


export async function handleWebhook(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== env.TONDER_WEBHOOK_API_TOKEN) {
      console.error("[Webhook] Unauthorized request:", authHeader);
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const payload = await request.json();

    console.log("[Webhook] ========== WEBHOOK RECEIVED ==========");
    console.log("[Webhook] Full payload:", JSON.stringify(payload, null, 2));

    const isAPMWebhook =
      payload.type === "apm" ||
      payload.data?.payment_method_name !== undefined;
    const isCardWebhook = payload.card_brand !== undefined;

    let eventId, transactionRef, status, metadata, paymentMethodName;

    if (isAPMWebhook && payload.data) {
      eventId = payload.data.id;
      transactionRef = payload.data.transaction_reference;
      status = payload.data.transaction_status;
      metadata = payload.data.metadata || {};
      paymentMethodName = payload.data.payment_method_name;
    } else {
      eventId = payload.transaction_reference;
      transactionRef = payload.transaction_reference;
      status = payload.status;
      metadata = payload.metadata || {};
      paymentMethodName = payload.card_brand?.toLowerCase();
    }

    console.log("[Webhook] Parsed data:", {
      eventId,
      transactionRef,
      status,
      paymentMethodName,
      metadata,
    });

    const existingEvent = await env.DB.prepare(
      "SELECT processed FROM tonder_webhook_events WHERE event_id = ?",
    )
      .bind(eventId)
      .first();

    if (existingEvent?.processed) {
      console.log("[Webhook] Already processed:", eventId);
      return createResponse(
        { success: true, message: "Already processed" },
        200,
      );
    }

    let payment = null;

    if (metadata.order_id) {
      console.log("[Webhook] Searching payment by metadata.order_id:", metadata.order_id);
      const payments = await env.DB.prepare(
        `SELECT * FROM tonder_payments WHERE json_extract(metadata, '$.order_id') = ?`,
      )
        .bind(metadata.order_id)
        .all();

      payment = payments.results?.[0] || null;

      if (payment) {
        console.log("[Webhook] ✅ Found payment by order_id:", payment.payment_id);
      }
    }

    if (!payment && transactionRef) {
      console.log("[Webhook] Searching payment by transaction_reference:", transactionRef);
      payment = await env.DB.prepare(
        "SELECT * FROM tonder_payments WHERE payment_id = ? OR intent_id = ?",
      )
        .bind(transactionRef, transactionRef)
        .first();

      if (payment) {
        console.log("[Webhook] ✅ Found payment by transaction_reference:", payment.payment_id);
      }
    }

    if (!payment && isAPMWebhook && payload.data?.payment_id != null) {
      const tonderPaymentId = String(payload.data.payment_id);
      console.log("[Webhook] Searching payment by data.payment_id:", tonderPaymentId);

      payment = await env.DB.prepare(
        "SELECT * FROM tonder_payments WHERE payment_id = ?",
      )
        .bind(tonderPaymentId)
        .first();

      if (payment) {
        console.log("[Webhook] ✅ Found payment by data.payment_id:", payment.payment_id);
      }
    }

    if (!payment) {
      console.error(
        "[Webhook] ❌ Payment not found for transaction:",
        transactionRef,
      );

      return createResponse(
        {
          success: false,
          message: "Payment not found, but webhook received. Check logs.",
          debug: {
            event_id: eventId,
            transaction_reference: transactionRef,
            metadata,
          },
        },
        200,
      );
    }

    try {
      await env.DB.prepare(
        `INSERT INTO tonder_webhook_events (event_id, payment_id, event_type, payload)
         VALUES (?, ?, ?, ?)`,
      )
        .bind(
          eventId,
          payment.payment_id,
          isAPMWebhook ? "apm" : isCardWebhook ? "card" : "unknown",
          JSON.stringify(payload),
        )
        .run();
    } catch (err) {
      if (String(err).includes("UNIQUE constraint failed: tonder_webhook_events.event_id")) {
        console.warn("[Webhook] Event already logged, continuing:", eventId);
      } else {
        console.error("[Webhook] Error inserting webhook event:", err);
      }
    }

    const normalizedStatus =
      status === "Success"
        ? "succeeded"
        : status === "Pending"
        ? "pending"
        : status === "Failed"
        ? "failed"
        : status?.toLowerCase?.() || "unknown";

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

    console.log("[Webhook] Updated payment status:", {
      payment_id: payment.payment_id,
      status: normalizedStatus,
      payment_method: paymentMethodName,
    });

    if (normalizedStatus === "succeeded") {
      const paymentMetadata = JSON.parse(payment.metadata || "{}");

      if (payment.payment_type === "job_unlock") {
        console.log("[Webhook] Processing job unlock...");
        await handleJobUnlockNotification(
          env,
          { transaction_reference: transactionRef },
          payment.user_id,
          paymentMetadata,
        );
      } else if (payment.payment_type === "credits_purchase") {
        console.log("[Webhook] Processing credits purchase...");
        await handleCreditsPurchaseNotification(
          env,
          { transaction_reference: transactionRef },
          payment.user_id,
          paymentMetadata,
        );
      }
    }

    try {
      await env.DB.prepare(
        `UPDATE tonder_webhook_events SET processed = 1 WHERE event_id = ?`,
      )
        .bind(eventId)
        .run();
    } catch (err) {
      console.error("[Webhook] Error marking event as processed:", err);
    }

    console.log("[Webhook] Successfully processed webhook:", eventId);
    return createResponse({ success: true }, 200);
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return createResponse(
      { error: "Internal server error", message: error.message },
      500,
    );
  }
}
