import { NextResponse } from "next/server";

const CURRENCY_CODES = {
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  EC: "USD",
  MX: "MXN",
  PE: "PEN",
  UY: "UYU",
};

export async function POST(request) {
  try {
    const data = await request.json();
    const { amount, currency, payment_type, } = data;

    const countryCode = "MX";
    const currencyCode = currency || CURRENCY_CODES[countryCode] || "MXN";

    console.log("[Tonder] creating payment intent:");
    console.log("Amount:", amount);
    console.log("currency:", currencyCode);
    console.log("payment Type:", payment_type)

    const secureToken = crypto.randomUUID();
    const paymentId = `pay_${crypto.randomUUID}`;
    const intentId = `intent_${crypto.randomUUID()}`;

    console.log('[Tonder] Secure token generated successfully');
    console.log('Intent ID', intentId);
    console.log('Payment ID', paymentId);
    console.log('secure token', secureToken);

    return NextResponse.json({
      success: true,
      data: {
        intent_id: intentId,
        payment_id: paymentId,
        secure_token: secureToken,
        amount,
        currency: currencyCode,
      },
    });
  } catch (error) {
    console.error("[Tonder] unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
