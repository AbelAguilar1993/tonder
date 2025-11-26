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

    console.log('[Webhook] Received payload:', JSON.stringify(payload, null, 2));

    const webhookSecret = process.env.TONDER_WEBHOOK_SECRET;

    if (webhookSecret) {
      const isValid = await verifySignature(payload, signature, webhookSecret);

      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      console.log('[Webhook] Signature verification skipped (no secret configured)');
    }

    // Determine webhook structure (Card vs APM)
    const isCardWebhook = payload.card_brand !== undefined;
    const isAPMWebhook = payload.type === "apm" || payload.data?.payment_method_name !== undefined;

    // Extract common fields
    let eventId, transactionRef, status, metadata, paymentMethodName;

    if (isAPMWebhook && payload.data) {
      // APM Webhook structure (OXXO, SPEI, Mercado Pago, etc.)
      eventId = payload.data.id;
      transactionRef = payload.data.transaction_reference;
      status = payload.data.transaction_status; // "Success", "Pending", "Failed"
      metadata = payload.data.metadata || {};
      paymentMethodName = payload.data.payment_method_name; // "oxxopay", "spei", etc.
      
      console.log('[Webhook] APM Payment:', {
        method: paymentMethodName,
        reference: payload.data.reference,
        barcode: payload.data.response?.barcode,
        status
      });
    } else {
      // Card Webhook structure
      eventId = payload.transaction_reference;
      transactionRef = payload.transaction_reference;
      status = payload.status; // "Success", "Failed"
      metadata = payload.metadata || {};
      paymentMethodName = payload.card_brand?.toLowerCase(); // "visa", "mastercard"
      
      console.log('[Webhook] Card Payment:', {
        brand: payload.card_brand,
        lastFour: payload.response?.binInfo?.lastFourDigits,
        status
      });
    }

    console.log('[Webhook] Parsed webhook data:', {
      eventId,
      transactionRef,
      status,
      paymentMethodName,
      metadata
    });

    // Normalize status
    const normalizedStatus = status === "Success" ? "succeeded" : 
                             status === "Pending" ? "pending" : 
                             status === "Failed" ? "failed" : 
                             status.toLowerCase();

    console.log('[Webhook] Normalized status:', normalizedStatus);
    console.log('[Webhook] Order ID from metadata:', metadata.order_id);

    return NextResponse.json({ 
      success: true,
      message: "Webhook received and processed",
      data: {
        eventId,
        transactionRef,
        status: normalizedStatus,
        paymentMethodName,
        orderId: metadata.order_id
      }
    });
  } catch (error) {
    console.error('[Webhook] Error:', error);
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