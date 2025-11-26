import { NextResponse } from 'next/server';

async function verifySignature(payload, signature, secret) {
  const payloadString = JSON.stringify(payload);
  
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(payloadString);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    
    return `sha256=${hashHex}` === signature;
  } catch (error) {
    return false;
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const signature = request.headers.get("x-tonder-signature");

    const webhookSecret = process.env.TONDER_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json({ 
        success: true, 
        message: "Webhook received (signature verification skipped in dev)" 
      });
    }

    const isValid = await verifySignature(payload, signature, webhookSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Webhook received and processed"
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tonder-signature',
    },
  });
}