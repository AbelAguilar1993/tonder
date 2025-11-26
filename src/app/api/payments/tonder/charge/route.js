import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { payment_id, method } = data;

    console.log('[Tonder Charge] Processing charge for local dev:');
    console.log('  Payment ID:', payment_id);
    console.log('  Method:', method);

    // For local development, return mock data
    // In production, Tonder SDK handles this directly from frontend
    const responseData = {
      payment_id,
      status: 'pending',
      payment_method: method,
    };

    if (method === "spei" || method === "Spei") {
      responseData.reference = `SPEI${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;
      responseData.instructions = "Transfer the exact amount using this reference";
      console.log('  SPEI Reference:', responseData.reference);
    }

    if (method === "oxxo" || method === "oxxopay") {
      responseData.voucher = `OXXO${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;
      responseData.expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours
      responseData.instructions = "Pay at any OXXO with this voucher code";
      console.log('  OXXO Voucher:', responseData.voucher);
      console.log('  Expires:', responseData.expires_at);
    }

    console.log('[Tonder Charge] Mock charge created successfully');

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('[Tonder Charge] Error:', error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
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
