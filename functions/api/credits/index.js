import { createResponse } from "../../utils/cors.js";
import { verifyJWT } from "../../utils/jwt.js";
import { getLocationDetails, getCountryCode } from "../../utils/index.js";
import {
  CURRENCY_CODES,
  CREDIT_UNIT_PRICE,
  CREDIT_PRICE,
} from "../../utils/const.js";

/**
 * Get user's current credit balance
 */
async function getUserBalance(env, userId) {
  try {
    const user = await env.DB.prepare(
      `SELECT id, credits, email, first_name, last_name FROM users WHERE id = ?`,
    )
      .bind(userId)
      .first();

    if (!user) {
      return createResponse({ error: "User not found" }, 404);
    }

    return createResponse({
      success: true,
      data: {
        balance: user.credits || 0,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user balance:", error);
    return createResponse({ error: "Failed to fetch balance" }, 500);
  }
}

/**
 * Get user's credit transactions (movements)
 */
async function getUserTransactions(env, userId, limit = 50, offset = 0) {
  try {
    // Get transactions with pagination
    const transactions = await env.DB.prepare(
      `SELECT 
        id,
        type,
        amount,
        balance_after,
        description,
        reference_type,
        reference_id,
        created_at
      FROM credit_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    )
      .bind(userId, limit, offset)
      .all();

    // Get total count
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM credit_transactions WHERE user_id = ?`,
    )
      .bind(userId)
      .first();

    return createResponse({
      success: true,
      data: {
        transactions: transactions.results || [],
        total: countResult?.total || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return createResponse({ error: "Failed to fetch transactions" }, 500);
  }
}

/**
 * Get user's invoices
 */
async function getUserInvoices(env, userId, limit = 50, offset = 0) {
  try {
    // Get invoices with pagination
    const invoices = await env.DB.prepare(
      `SELECT 
        id,
        invoice_number,
        amount,
        currency,
        credits_purchased,
        discount_rate,
        discount_amount,
        subtotal,
        status,
        payment_method,
        payment_gateway,
        payment_gateway_id,
        paid_at,
        pdf_url,
        notes,
        created_at,
        updated_at
      FROM invoices
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    )
      .bind(userId, limit, offset)
      .all();

    // Get total count
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM invoices WHERE user_id = ?`,
    )
      .bind(userId)
      .first();

    return createResponse({
      success: true,
      data: {
        invoices: invoices.results || [],
        total: countResult?.total || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return createResponse({ error: "Failed to fetch invoices" }, 500);
  }
}

/**
 * Get credit pricing information for the user's country
 */
async function getCreditPricing(request, env) {
  try {
    const { _, countryName, __ } = getLocationDetails(request);
    const countryCode = getCountryCode(countryName);
    const currencyCode = CURRENCY_CODES[countryCode];
    const unitPrice = CREDIT_UNIT_PRICE[countryCode];
    const priceText = CREDIT_PRICE[countryCode];

    // Discount tiers
    const discountTiers = [
      { min: 1, max: 4, rate: 0 },
      { min: 5, max: 9, rate: 0.05 },
      { min: 10, max: 19, rate: 0.1 },
      { min: 20, max: 49, rate: 0.15 },
      { min: 50, max: Infinity, rate: 0.2 },
    ];

    return createResponse({
      success: true,
      data: {
        unit_price: unitPrice,
        currency: currencyCode,
        country: countryCode,
        discount_tiers: discountTiers,
        price_text: priceText,
      },
    });
  } catch (error) {
    console.error("Error fetching credit pricing:", error);
    return createResponse({ error: "Failed to fetch pricing" }, 500);
  }
}

/**
 * Create an invoice and initiate payment
 */
async function createCreditPurchase(request, env, userId) {
  try {
    const { quantity } = await request.json();

    if (!quantity || quantity < 1 || quantity > 100) {
      return createResponse(
        { error: "Invalid quantity. Must be between 1 and 100." },
        400,
      );
    }

    const { _, countryName, __ } = getLocationDetails(request);
    const countryCode = getCountryCode(countryName);
    const currencyCode = CURRENCY_CODES[countryCode];
    const unitPrice = CREDIT_UNIT_PRICE[countryCode];

    // Calculate discount
    let discountRate = 0;
    if (quantity >= 50) discountRate = 0.2;
    else if (quantity >= 20) discountRate = 0.15;
    else if (quantity >= 10) discountRate = 0.1;
    else if (quantity >= 5) discountRate = 0.05;

    const subtotal = quantity * unitPrice;
    const discountAmount = Math.round(subtotal * discountRate);
    const total = subtotal - discountAmount;

    // Generate invoice number
    const timestamp = Date.now();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(
      timestamp,
    ).slice(-8)}`;

    // Create invoice record
    const invoiceResult = await env.DB.prepare(
      `INSERT INTO invoices (
        user_id, invoice_number, amount, currency, credits_purchased,
        discount_rate, discount_amount, subtotal, status, payment_gateway
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'dLocalGo')`,
    )
      .bind(
        userId,
        invoiceNumber,
        total,
        currencyCode,
        quantity,
        discountRate,
        discountAmount,
        subtotal,
      )
      .run();

    const invoiceId = invoiceResult.meta.last_row_id;

    // Create payment checkout URL using dLocalGo
    // This will redirect to the payment gateway
    return createResponse({
      success: true,
      data: {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        amount: total,
        currency: currencyCode,
        credits: quantity,
        discount_rate: discountRate,
        discount_amount: discountAmount,
        subtotal,
        // Payment will be initiated from the frontend using the existing payment flow
      },
    });
  } catch (error) {
    console.error("Error creating credit purchase:", error);
    return createResponse({ error: "Failed to create purchase" }, 500);
  }
}

/**
 * Process payment notification (webhook from payment gateway)
 * This completes the purchase by updating invoice and adding credits
 */
async function processPaymentNotification(request, env) {
  try {
    const data = await request.json();
    const { invoice_id, payment_gateway_id, status } = data;

    if (!invoice_id) {
      return createResponse({ error: "Invoice ID required" }, 400);
    }

    // Get invoice
    const invoice = await env.DB.prepare(`SELECT * FROM invoices WHERE id = ?`)
      .bind(invoice_id)
      .first();

    if (!invoice) {
      return createResponse({ error: "Invoice not found" }, 404);
    }

    // Update invoice status
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE invoices 
       SET status = ?, payment_gateway_id = ?, paid_at = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(status, payment_gateway_id, now, now, invoice_id)
      .run();

    // If payment is successful, add credits and create transaction
    if (status === "paid") {
      // Get current user balance
      const user = await env.DB.prepare(
        `SELECT credits FROM users WHERE id = ?`,
      )
        .bind(invoice.user_id)
        .first();

      const currentBalance = user?.credits || 0;
      const newBalance = currentBalance + invoice.credits_purchased;

      // Update user balance
      await env.DB.prepare(
        `UPDATE users SET credits = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(newBalance, now, invoice.user_id)
        .run();

      // Create transaction record
      const description = `Compra de ${invoice.credits_purchased} créditos${
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
          invoice.user_id,
          invoice.credits_purchased,
          newBalance,
          description,
          invoice_id,
          now,
        )
        .run();
    }

    return createResponse({ success: true });
  } catch (error) {
    console.error("Error processing payment notification:", error);
    return createResponse({ error: "Failed to process notification" }, 500);
  }
}

/**
 * Create a credit transaction (for internal use, e.g., when unlocking contacts)
 */
export async function recordCreditTransaction(
  env,
  userId,
  amount,
  type,
  description,
  referenceType = null,
  referenceId = null,
) {
  try {
    // Get current balance
    const user = await env.DB.prepare(`SELECT credits FROM users WHERE id = ?`)
      .bind(userId)
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const balanceAfter = user.credits;
    const now = new Date().toISOString();

    // Insert transaction record
    await env.DB.prepare(
      `INSERT INTO credit_transactions (
        user_id, type, amount, balance_after, description,
        reference_type, reference_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        userId,
        type,
        amount,
        balanceAfter,
        description,
        referenceType,
        referenceId,
        now,
      )
      .run();

    return { success: true };
  } catch (error) {
    console.error("Error recording credit transaction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Main handler for credits API
 */
export async function handleCreditsRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[2]; // api/credits/{action}

  // Public endpoints (no auth required)
  if (action === "pricing" && method === "GET") {
    return getCreditPricing(request, env);
  }

  // Webhook endpoint (no user auth, but should verify signature in production)
  if (action === "payment-notification" && method === "POST") {
    return processPaymentNotification(request, env);
  }

  // Protected endpoints - require authentication
  const authResult = await verifyJWT(request, env);
  if (!authResult || !authResult.valid) {
    return createResponse({ error: "Unauthorized" }, 401);
  }

  const user = authResult.payload;

  // Handle different actions
  switch (action) {
    case "balance":
      if (method === "GET") {
        return getUserBalance(env, user.id);
      }
      break;

    case "transactions":
      if (method === "GET") {
        const limit = parseInt(url.searchParams.get("limit")) || 50;
        const offset = parseInt(url.searchParams.get("offset")) || 0;
        return getUserTransactions(env, user.id, limit, offset);
      }
      break;

    case "invoices":
      if (method === "GET") {
        const limit = parseInt(url.searchParams.get("limit")) || 50;
        const offset = parseInt(url.searchParams.get("offset")) || 0;
        return getUserInvoices(env, user.id, limit, offset);
      }
      break;

    case "purchase":
      if (method === "POST") {
        return createCreditPurchase(request, env, user.id);
      }
      break;

    default:
      return createResponse({ error: "Invalid action" }, 404);
  }

  return createResponse({ error: "Method not allowed" }, 405);
}
