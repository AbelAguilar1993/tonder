import axios from "axios";
import { generateRandomPassword, hashPassword } from "../../auth.js";
import { createResponse } from "../../../utils/cors.js";
import { getLocationDetails, getCountryCode } from "../../../utils/index.js";
import {
  CURRENCY_CODES,
  CREDIT_AMOUNTS,
  CREDIT_PRICE,
} from "../../../utils/const.js";
import { sendWelcomeEmail } from "../../../utils/email.js";

function createHeaders(env) {
  const authToken = `${env.DLOCALGO_API_KEY}:${env.DLOCALGO_API_SECRET}`;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };
}

/**
 * Handle credits purchase notification
 */
async function handleCreditsPurchaseNotification(env, data, user_id, metadata) {
  const invoiceId = metadata.invoice_id;

  if (!invoiceId) {
    console.error("Missing invoice_id for credits purchase");
    return createResponse({ success: false, error: "Missing invoice_id" }, 400);
  }

  if (!user_id) {
    console.error("Missing user_id for credits purchase");
    return createResponse({ success: false, error: "Missing user_id" }, 400);
  }

  // Get invoice
  const invoice = await env.DB.prepare(`SELECT * FROM invoices WHERE id = ?`)
    .bind(invoiceId)
    .first();

  if (!invoice) {
    console.error("Invoice not found:", invoiceId);
    return createResponse({ success: false, error: "Invoice not found" }, 404);
  }

  // Check if invoice is already paid
  if (invoice.status === "paid") {
    console.log("Invoice already marked as paid:", invoiceId);
    return createResponse({ success: true, message: "Already processed" }, 200);
  }

  // Update invoice status to paid
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE invoices
     SET status = 'paid', payment_gateway_id = ?, paid_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(data.payment_id || "N/A", now, now, invoiceId)
    .run();

  // Get current user balance
  const user = await env.DB.prepare(`SELECT credits FROM users WHERE id = ?`)
    .bind(user_id)
    .first();

  const currentBalance = user?.credits || 0;
  const newBalance = currentBalance + invoice.credits_purchased;

  // Update user balance
  await env.DB.prepare(
    `UPDATE users SET credits = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(newBalance, now, user_id)
    .run();

  // Create transaction record
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

  console.log(
    `Credits purchase completed: User ${user_id} purchased ${invoice.credits_purchased} credits. New balance: ${newBalance}`,
  );

  return createResponse(
    { success: true, message: "Credits added successfully" },
    200,
  );
}

/**
 * Handle job unlock notification
 */
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
    console.error("Missing user_id for job unlock");
    return createResponse({ success: false, error: "Missing user_id" }, 400);
  }

  // Check if already unlocked
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

  // Parse the chips and convert back to JSON string for database storage
  const presetChipsJson = JSON.stringify(chips);
  const now = new Date().toISOString();

  // Create new application
  await env.DB.prepare(
    `INSERT INTO user_job_applications (user_id, job_id, contact_id, status, credits_spent, unlocked_at, created_at, updated_at, preset_chips)
    VALUES (?, ?, ?, 'unlocked', 0, ?, ?, ?, ?)`,
  )
    .bind(user_id, job_id, contact_id, now, now, now, presetChipsJson)
    .run();

  console.log(
    `Job unlocked: User ${user_id} unlocked job ${job_id}, contact ${contact_id}`,
  );

  return createResponse(
    { success: true, message: "Job unlocked successfully" },
    200,
  );
}

export async function handleDLocalGoRequest(request, env, user = null) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const gateway = pathParts[2];
  const action = pathParts[3];

  const { _, countryName, __ } = getLocationDetails(request);
  const countryCode = getCountryCode(countryName);
  const currencyCode = CURRENCY_CODES[countryCode];

  if (method === "GET") {
    return createResponse({ error: "Action not found" }, 404);
  }

  if (method === "POST") {
    const data = await request.json();

    if (action == "create-checkout") {
      // Determine payment type (default to 'job_unlock' for backward compatibility)
      const paymentType = data.payment_type || "job_unlock";

      // [EMAIL] normalize email from client or user
      const normalizedEmail =
        (data.email || user?.email || "").toString().trim().toLowerCase() || null;

      // Prepare payment metadata
      const metadata = {
        payment_type: paymentType,
        user_id: user?.id || null,
        // [EMAIL] keep email in metadata as fallback for webhook user creation
        email: normalizedEmail || undefined,
        ...(data.metadata || {}),
      };

      let requestBody;

      // Build checkout request based on payment type
      if (paymentType === "credits_purchase") {
        // Credits purchase flow
        if (!data.amount || !data.credits_quantity) {
          return createResponse(
            { error: "Missing required fields: amount, credits_quantity" },
            400,
          );
        }

        metadata.invoice_id = data.invoice_id;
        metadata.credits_quantity = data.credits_quantity;

        requestBody = {
          currency: currencyCode,
          amount: Number(data.amount),
          country: countryCode,
          order_id: data.order_id || Math.floor(Math.random() * 100000),
          description: `Compra de ${data.credits_quantity} crédito${
            data.credits_quantity > 1 ? "s" : ""
          } - ${currencyCode} ${Number(data.amount).toLocaleString()}`,
          success_url: `${env.APP_URL}/pagos/success?redirect=creditos`,
          back_url: `${env.APP_URL}/creditos`,
          notification_url: `${
            env.API_URL
          }/api/payments/d_local_go/notifications?metadata=${encodeURIComponent(
            JSON.stringify(metadata),
          )}`,
          // [EMAIL] prefill to dLocal
          ...(normalizedEmail
            ? { payer: { email: normalizedEmail } }
            : {}),
        };
      } else if (paymentType === "job_unlock") {
        // Job unlock flow (original functionality)
        if (!data.job_id || !data.contact_id) {
          return createResponse(
            { error: "Missing required fields: job_id, contact_id" },
            400,
          );
        }

        metadata.job_id = data.job_id;
        metadata.contact_id = data.contact_id;
        metadata.chips = data.extras || [];

        requestBody = {
          currency: currencyCode,
          amount: Number(CREDIT_AMOUNTS[countryCode]),
          country: countryCode,
          order_id: data.order_id || Math.floor(Math.random() * 100000),
          description:
            "Estás a un paso de acceder al reclutador verificado - Activacion automatica tras el pago.",
          success_url: `${env.APP_URL}/pagos/success${
            user ? "?redirect=panel" : ""
          }`,
          back_url: `${env.APP_URL}/empleos/${data.job_id}`,
          notification_url: `${
            env.API_URL
          }/api/payments/d_local_go/notifications?metadata=${encodeURIComponent(
            JSON.stringify(metadata),
          )}`,
          // [EMAIL] prefill to dLocal
          ...(normalizedEmail
            ? { payer: { email: normalizedEmail } }
            : {}),
        };
      } else {
        return createResponse(
          { error: `Unsupported payment type: ${paymentType}` },
          400,
        );
      }

      try {
        const response = await axios.post(
          env.DLOCALGO_API_BASE_URL,
          requestBody,
          { headers: createHeaders(env) },
        );
        return createResponse({ success: true, data: response.data }, 200);
      } catch (error) {
        console.error(
          "Error creating checkout:",
          error.response?.data || error.message,
        );
        return createResponse({ error: "Error creating checkout" }, 500);
      }
    }

    if (action == "notifications") {
      try {
        // Parse metadata from query params
        const metadataParam = url.searchParams.get("metadata");
        let metadata = {};

        if (metadataParam) {
          try {
            metadata = JSON.parse(decodeURIComponent(metadataParam));
          } catch (e) {
            console.error("Error parsing metadata:", e);
            return createResponse(
              { success: false, error: "Invalid metadata format" },
              400,
            );
          }
        } else {
          // Backward compatibility: try old format with separate params
          const job_id = url.searchParams.get("job_id");
          const contact_id = url.searchParams.get("contact_id");
          const chipsParam = url.searchParams.get("chips");

          if (job_id && contact_id) {
            metadata = {
              payment_type: "job_unlock",
              job_id: job_id,
              contact_id: contact_id,
              chips: chipsParam ? JSON.parse(chipsParam) : [],
              user_id: url.searchParams.get("user_id") || null,
            };
          } else {
            console.error("Missing metadata and unable to parse legacy format");
            return createResponse(
              { success: false, error: "Missing payment metadata" },
              400,
            );
          }
        }

        const paymentType = metadata.payment_type || "job_unlock";
        let user_id = metadata.user_id;

        // If no user_id, try to get/create user from payment data
        if (!user_id) {
          // [EMAIL] fallback email from metadata (sent when creating checkout)
          let fallbackEmail =
            (metadata.email || "").toString().trim().toLowerCase() || null;

          // Try to fetch payer from dLocal if payment_id is present in webhook body
          let payer = null;
          try {
            if (data?.payment_id) {
              const paymentResp = await axios.get(
                `${env.DLOCALGO_API_BASE_URL}/${data.payment_id}`,
                { headers: createHeaders(env) },
              );
              const p =
                paymentResp?.data?.payer ||
                paymentResp?.data?.payment?.payer ||
                null;
              if (p) {
                payer = {
                  first_name: p.first_name || p.name?.split(" ")?.[0] || null,
                  last_name:
                    p.last_name ||
                    (p.name ? p.name.split(" ").slice(1).join(" ") : null),
                  email: (p.email || "").toString().trim().toLowerCase() || null,
                };
              }
            }
          } catch (fetchErr) {
            console.warn("Could not fetch payer from dLocal:", fetchErr?.message);
          }

          const emailForUser = (payer?.email || fallbackEmail || "").trim().toLowerCase();

          if (!emailForUser) {
            console.error("No email available to resolve/create user");
            return createResponse(
              { success: false, error: "Missing payer email" },
              400,
            );
          }

          // Find or create user by email
          const existingUser = await env.DB.prepare(
            `SELECT id FROM users WHERE email = ?`,
          )
            .bind(emailForUser)
            .first();

          if (!existingUser) {
            const password = generateRandomPassword(12);
            const passwordHash = await hashPassword(password);
            const result = await env.DB.prepare(
              `INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)`,
            )
              .bind(
                payer?.first_name || null,
                payer?.last_name || null,
                emailForUser,
                passwordHash,
              )
              .run();
            user_id = result.meta.last_row_id;

            // Send welcome email with password information
            try {
              const emailResult = await sendWelcomeEmail(env, {
                email: emailForUser,
                first_name: payer?.first_name || null,
                last_name: payer?.last_name || null,
                password: password,
                role: "user",
                company_name: null,
              });

              if (!emailResult.success) {
                console.warn(
                  "Failed to send welcome email:",
                  emailResult.error,
                );
              } else {
                console.log("Welcome email sent successfully to:", emailForUser);
              }
            } catch (emailError) {
              console.error("Error sending welcome email:", emailError);
            }
          } else {
            user_id = existingUser.id;
          }
        }

        // Route to appropriate handler based on payment type
        if (paymentType === "credits_purchase") {
          return await handleCreditsPurchaseNotification(
            env,
            data,
            user_id,
            metadata,
          );
        } else if (paymentType === "job_unlock") {
          return await handleJobUnlockNotification(
            env,
            data,
            user_id,
            metadata,
          );
        } else {
          console.error("Unknown payment type:", paymentType);
          return createResponse(
            { success: false, error: "Unknown payment type" },
            400,
          );
        }
      } catch (error) {
        console.error("Error creating/updating user job application:", error);
        return createResponse({ success: false, error: error.message }, 400);
      }
    }

    return createResponse({ error: "Action not found" }, 404);
  }

  return createResponse({ error: "Method not allowed" }, 405);
}
