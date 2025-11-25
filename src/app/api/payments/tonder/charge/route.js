import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const data = await request.json();
    const { intent_id, method } = data;

    const tonderApiKey = process.env.TONDER_API_KEY;
    const tonderApiBaseUrl =
      process.env.TONDER_API_BASE_URL || "https://stage.tonder.io/api/v1";

    if (!tonderApiKey) {
      return NextResponse.json(
        { error: "Tonder API key not configured" },
        { status: 500 }
      );
    }

    const chargePayload = {
      intent_id,
      method,
    };

    const tonderResponse = await fetch(`${tonderApiBaseUrl}/charges`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tonderApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargePayload),
    });

    if (!tonderResponse.ok) {
      const errorData = await tonderResponse.json();

      return NextResponse.json(
        { error: "Payment failed", details: errorData },
        { status: 400 }
      );
    }

    const chargeData = await tonderResponse.json();

    return NextResponse.json({
      success: true,
      data: chargeData,
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
