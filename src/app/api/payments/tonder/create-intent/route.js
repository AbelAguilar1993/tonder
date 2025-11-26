import { NextResponse } from 'next/server';

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
    const { amount, currency, payment_type, metadata } = data;

    const countryCode = 'MX';
    const currencyCode = currency || CURRENCY_CODES[countryCode] || "MXN";

    console.log('[Tonder] Creating payment intent:');
    console.log('  Amount:', amount);
    console.log('  Currency:', currencyCode);
    console.log('  Payment Type:', payment_type);
    console.log('  Metadata:', metadata);

    const secureToken = crypto.randomUUID();
    const paymentId = `pay_${crypto.randomUUID()}`;
    const intentId = `intent_${crypto.randomUUID()}`;
    
    // Generate order_id that will be used in payment and webhook
    const orderId = `${payment_type?.toUpperCase() || 'ORDER'}-${Date.now()}`;

    console.log('[Tonder] Secure token generated successfully!');
    console.log('  Intent ID:', intentId);
    console.log('  Payment ID:', paymentId);
    console.log('  Order ID:', orderId);
    console.log('  Secure Token:', secureToken);

    return NextResponse.json({
      success: true,
      data: {
        intent_id: intentId,
        payment_id: paymentId,
        secure_token: secureToken,
        order_id: orderId,
        amount,
        currency: currencyCode,
      },
    });
  } catch (error) {
    console.error('[Tonder] Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
