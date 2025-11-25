import { createResponse } from "../../../utils/cors.js";

export async function handleCharge(request, env, user) {
  try {
    const data = await request.json();
    const { intent_id, method } = data;

    const payment = await env.DB.prepare(
      "SELECT * FROM tonder_payments WHERE intent_id = ?",
    )
      .bind(intent_id)
      .first();

    if (!payment) {
      return createResponse({ error: "Payment intent not found" }, 404);
    }

    const chargePayload = {
      intent_id,
      method,
    };

    const tonderResponse = await fetch(
      `${env.TONDER_API_BASE_URL}/charges`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TONDER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chargePayload),
      },
    );

    if (!tonderResponse.ok) {
      const errorData = await tonderResponse.json();
      return createResponse(
        { error: "Payment failed", details: errorData },
        400,
      );
    }

    const chargeData = await tonderResponse.json();

    const now = new Date().toISOString();
    const updateData = {
      status: chargeData.status,
      payment_method: method,
      updated_at: now,
    };

    if (method === "spei" && chargeData.reference) {
      updateData.spei_reference = chargeData.reference;
    }

    if (method === "oxxo" && chargeData.voucher) {
      updateData.oxxo_voucher = chargeData.voucher.barcode;
      updateData.oxxo_expires_at = chargeData.voucher.expires_at;
    }

    await env.DB.prepare(
      `UPDATE tonder_payments 
      SET status = ?, payment_method = ?, spei_reference = ?, 
          oxxo_voucher = ?, oxxo_expires_at = ?, updated_at = ?
      WHERE intent_id = ?`,
    )
      .bind(
        updateData.status,
        updateData.payment_method,
        updateData.spei_reference || null,
        updateData.oxxo_voucher || null,
        updateData.oxxo_expires_at || null,
        now,
        intent_id,
      )
      .run();

    return createResponse(
      {
        success: true,
        data: chargeData,
      },
      200,
    )
  } catch (error) {
    return createResponse(
      { error: "Internal server error", message: error.message },
      500,
    );
  }
}

