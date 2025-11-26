import { createResponse } from "../../../utils/cors.js";

export async function handleCharge(request, env, user) {
  try {
    const data = await request.json();
    const { payment_id, method, customer } = data;

    const payment = await env.DB.prepare(
      "SELECT * FROM tonder_payments WHERE payment_id = ?",
    )
      .bind(payment_id)
      .first();

    if (!payment) {
      return createResponse({ error: "Payment not found" }, 404);
    }

    const now = new Date().toISOString();

    const mockReference = method === "spei" 
      ? `SPEI${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`
      : null;
    
    const mockVoucher = method === "oxxo"
      ? `OXXO${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`
      : null;
    
    const mockExpiresAt = method === "oxxo"
      ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
      : null;

    await env.DB.prepare(
      `UPDATE tonder_payments 
      SET status = ?, payment_method = ?, spei_reference = ?, 
          oxxo_voucher = ?, oxxo_expires_at = ?, updated_at = ?
      WHERE payment_id = ?`,
    )
      .bind(
        'pending',
        method,
        mockReference,
        mockVoucher,
        mockExpiresAt,
        now,
        payment_id,
      )
      .run();

    const responseData = {
      payment_id,
      status: 'pending',
      payment_method: method,
    };

    if (method === "spei") {
      responseData.reference = mockReference;
      responseData.instructions = "Transfer the exact amount using this reference";
    }

    if (method === "oxxo") {
      responseData.voucher = mockVoucher;
      responseData.expires_at = mockExpiresAt;
      responseData.instructions = "Pay at any OXXO with this voucher code";
    }

    return createResponse(
      {
        success: true,
        data: responseData,
      },
      200,
    );
  } catch (error) {
    console.error('[Tonder] Charge error:', error);
    return createResponse(
      { error: "Internal server error", message: error.message },
      500,
    );
  }
}

