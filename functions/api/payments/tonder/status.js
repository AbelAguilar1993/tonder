import { createResponse } from "../../../utils/cors.js";

export async function handleStatus(request, env, paymentId) {
  try {
    const payment = await env.DB.prepare(
      "SELECT * FROM tonder_payments WHERE payment_id = ?",
    )
      .bind(paymentId)
      .first();

    if (!payment) {
      return createResponse({ error: "Payment not found" }, 404);
    }

    return createResponse(
      {
        success: true,
        data: {
          payment_id: payment.payment_id,
          status: payment.status,
          payment_method: payment.payment_method,
          spei_reference: payment.spei_reference,
          oxxo_voucher: payment.oxxo_voucher,
          oxxo_expires_at: payment.oxxo_expires_at,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Error getting payment status:", error);
    return createResponse(
      { error: "Internal server error", message: error.message },
      500,
    );
  }
}

