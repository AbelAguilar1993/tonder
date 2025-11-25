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

async function getUserFromRequest(request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) {
      return null;
    }

    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => c.split("="))
    );

    if (!cookies.auth_session) {
      return null;
    }

    return {
      id: 1,
      email: "est@example.com",
    };
  } catch (error) {
    console.error("[Tonder] Error getting user from cookies:", error);
    return null;
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { amount, currency, payment_type, metadata } = data;

    const user = await getUserFromRequest(request);
    const idempotencyKey = crypto.randomUUID();

    const countryCode = "MX";
    const currencyCode = currency || CURRENCY_CODES[countryCode] || "MXN";
    const tonderApiKey =
      process.env.TONDER_API_SECRET || process.env.TONDER_API_KEY;
    const tonderApiBaseUrl =
      process.env.TONDER_API_BASE_URL || "https://stage.tonder.io/api/v1";

    if (!tonderApiKey) {
      console.error("[Tonder] API key not configured.");
      return NextResponse.json(
        { error: "Tonder API key not configured." },
        { status: 500 }
      );
    }

    console.log("[Tonder] creating payment intent:", {
      amount,
      currency: currencyCode,
      payment_type,
      url: `${tonderApiBaseUrl}/intents`,
    });

    const tonderResponse = await fetch(`${tonderApiBaseUrl}/intents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tonderApiKey}`,
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
      const errorData = await tonderResponse
        .json()
        .catch(() => ({ message: "Unknown error" }));
      console.error("[Tonder] Failed to create intent:", {
        status: tonderResponse.status,
        statusText: tonderResponse.statusText,
        error: errorData,
      });

      return NextResponse.json(
        {
          error: "Failed to create payment intent",
          details: errorData,
          status: tonderResponse.status,
          message: `Tonder API returned ${tonderResponse.status}: ${
            errorData.message || errorData.error || "Unknown error"
          }`,
        },
        { status: 500 }
      );
    }

    const intentData = await tonderResponse.json();
    console.log("[Tonder] Intent created successfully:", {
      intent_id: intentData.intent_id,
      payment_id: intentData.id,
    });
    const secureToken = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      data: {
        intent_id: intentData.intent_id,
        payment_id: intentData.id,
        secure_token: secureToken,
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
