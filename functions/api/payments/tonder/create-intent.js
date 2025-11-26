import { createResponse } from "../../../utils/cors.js";
import { getLocationDetails, getCountryCode } from "../../../utils/index.js";
import { CURRENCY_CODES } from "../../../utils/const.js";

export async function handleCreateIntent(request, env, user) {
  try {
    const data = await request.json();
    const { amount, currency, payment_type, metadata } = data;

    const secureToken = crypto.randomUUID();
    const paymentId = `pay_${crypto.randomUUID()}`;
    const intentId = `intent_${crypto.randomUUID()}`;
    const idempotencyKey = crypto.randomUUID();
    
    const orderId = `${payment_type?.toUpperCase() || 'ORDER'}-${Date.now()}`;

    const { _, countryName } = getLocationDetails(request);
    const countryCode = getCountryCode(countryName);
    const currencyCode = currency || CURRENCY_CODES[countryCode] || "MXN";

    const paymentMetadata = {
      ...(metadata || {}),
      order_id: orderId
    };

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO tonder_payments (
        payment_id, intent_id, user_id, payment_type, amount, currency,
        status, metadata, idempotency_key, secure_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    )
      .bind(
        paymentId,
        intentId,
        user?.id || null,
        payment_type,
        amount,
        currencyCode,
        JSON.stringify(paymentMetadata),
        idempotencyKey,
        secureToken,
        now,
        now,
      )
      .run();

    console.log('[Tonder] Created payment intent:', {
      payment_id: paymentId,
      intent_id: intentId,
      order_id: orderId
    });
      
    return createResponse(
      {
        success: true,
        data: {
          intent_id: intentId,
          payment_id: paymentId,
          secure_token: secureToken,
          order_id: orderId,
          amount,
          currency: currencyCode,
        },
      },
      200,
    );
  } catch (error) {
    console.error('[Tonder] Create intent error:', error);
    return createResponse(
      { error: "Internal server error", message: error.message },
      500,
    );
  }
}

