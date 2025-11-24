/**
 * CORS utility functions for Cloudflare Workers
 *
 * Provides standardized CORS handling for all API endpoints,
 * ensuring consistent cross-origin access from frontend applications.
 *
 * Features:
 * - Preflight request handling
 * - Automatic CORS header injection
 * - Standardized response creation
 * - Cache-friendly response generation
 *
 * @author Empleo Safari Platform
 * @version 1.0.0
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

export function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function addCorsHeaders(response) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function createResponse(data, status = 200, additionalHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...corsHeaders,
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export function createCachedResponse(data, status = 200, cacheOptions = {}) {
  const defaultCacheHeaders = {
    "Cache-Control": "public, max-age=300, s-maxage=1800",
    Vary: "Accept-Encoding, User-Agent",
    "X-Content-Type-Options": "nosniff",
  };

  const headers = {
    "Content-Type": "application/json",
    ...corsHeaders,
    ...defaultCacheHeaders,
    ...cacheOptions,
  };

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}
