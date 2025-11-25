import { createResponse } from "../../../utils/cors.js";
import { getLocationDetails, getCountryCode } from "../../../utils/index.js";
import { CURRENCY_CODES } from "../../../utils/const.js";

export async function handleCreateIntent(request, env, user) {
  try {
    const data = await request.json();
    const { amount, currency, payment_type, metadata } = data;

    const idempotencyKey = crypto.randomUUID();

    const { _, countryName } = getLocationDetails(request);
    const countryCode = getCountryCode(countryName);
    const currencyCode = currency || CURRENCY_CODES[countryCode] || "MXN";

    const tonderResponse = await fetch(`${env.TONDER_API_BASE_URL}/intents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TONDER_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: Number(amount),
        currency: currencyCode,
        metadata: {
          ...metadata,
          user_id: user?.id,
          payment_type,
        },
      }),
    });

    if (!tonderResponse.ok) {
      const errorData = await tonderResponse.json();
      return createResponse(
        { error: "Failed to create payment intent", details: errorData },
        500,
      );
    }

    const intentData = await tonderResponse.json();

    const secureToken = crypto.randomUUID();

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO tonder_payments (
        payment_id, intent_id, user_id, payment_type, amount, currency,
        status, metadata, idempotency_key, secure_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    )
      .bind(
        intentData.id,
        intentData.intent_id,
        user?.id || null,
        payment_type,
        amount,
        currencyCode,
        JSON.stringify(metadata || {}),
        idempotencyKey,
        secureToken,
        now,
        now,
      )
      .run();

    return createResponse(
      {
        success: true,
        data: {
          intent_id: intentData.intent_id,
          payment_id: intentData.id,
          secure_token: secureToken,
        },
      },
      200,
    );
  } catch (error) {
    return createResponse(
      { error: "Internal server error", message: error.message },
      500,
    );
  }
}

