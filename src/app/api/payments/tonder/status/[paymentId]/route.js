import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { paymentId } = await params;

    const mockPayment = {
      payment_id: paymentId,
      status: 'pending',
      payment_method: null,
      spei_reference: null,
      oxxo_voucher: null,
      oxxo_expires_at: null,
    };

    return NextResponse.json({
      success: true,
      data: mockPayment,
    });
  } catch (error) {
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