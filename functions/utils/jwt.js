/**
 * JWT utility functions for authentication in Cloudflare Workers
 */

// JWT secret from environment variables (secure)
const getJWTSecret = (env) => {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error("JWT_SECRET is not configured or is empty");
  }
  return secret;
};

/**
 * Create a JWT token
 */
export async function createJWT(payload, expiresIn = "24h", env) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresIn === "24h" ? 24 * 60 * 60 : parseInt(expiresIn));

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp,
  };

  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(jwtPayload))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await sign(data, getJWTSecret(env));

  return `${data}.${signature}`;
}

/**
 * Verify a JWT token (legacy function name for compatibility)
 */
export async function verifyJWT(request, env) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "No token provided" };
  }

  const token = authHeader.substring(7);
  const parts = token.split(".");

  if (parts.length !== 3) {
    return { valid: false, error: "Invalid token format" };
  }

  try {
    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const expectedSignature = await sign(data, getJWTSecret(env));
    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid signature" };
    }

    // Decode payload
    const payload = JSON.parse(
      atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")),
    );

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: "Token verification failed" };
  }
}

/**
 * Verify a JWT token (alias for verifyJWT)
 * Provides consistent naming for newer API endpoints
 */
export async function verifyToken(request, env) {
  return await verifyJWT(request, env);
}

/**
 * Sign data with HMAC-SHA256
 */
async function sign(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  const signatureArray = new Uint8Array(signature);

  return btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
