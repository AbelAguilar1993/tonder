/**
 * Cloudflare Cache API utility for edge caching
 *
 * This utility provides global edge caching across Cloudflare's 275+ locations,
 * optimized for LATAM performance with smart cache headers and CORS support.
 *
 * Features:
 * - Edge caching with configurable TTL
 * - CORS header preservation and enforcement
 * - ETag generation for cache validation
 * - Geographic region tracking
 * - Stale-while-revalidate support
 *
 * @author Empleo Safari Platform
 * @version 1.0.0
 */

export class CloudflareCache {
  constructor(env) {
    this.env = env;
    this.cache = caches.default;
  }
  // Build a stable cache key: normalize query order and force GET.
  generateCacheKey(request, customKey = null) {
    const base = new URL(request.url);
    const u = new URL(base.toString());
    if (customKey) {
      const [pathOnly, searchOnly] = customKey.split("?");
      u.pathname = pathOnly || base.pathname;
      u.search = searchOnly ? `?${searchOnly}` : "";
    }
    // Sort query keys for stability (values kept as is).
    const sp = new URLSearchParams(u.search);
    const sorted = new URLSearchParams();
    const keys = Array.from(sp.keys()).sort();
    for (const k of keys) {
      for (const v of sp.getAll(k)) sorted.append(k, v);
    }
    u.search = sorted.toString() ? `?${sorted.toString()}` : "";
    return new Request(u.toString(), {
      method: "GET",
      headers: request.headers,
    });
  }
  // Read from cache and apply clean debug headers.
  async get(request, customKey = null) {
    try {
      const cacheKey = this.generateCacheKey(request, customKey);
      const cached = await this.cache.match(cacheKey);
      if (!cached) return null;
      const h = new Headers(cached.headers);
      // Remove previous debug headers to avoid duplication
      for (const k of [
        "x-cache-status",
        "x-cache-date",
        "x-worker-cache",
        "x-worker-cache-date",
        "x-worker-cache-region",
      ])
        h.delete(k);
      h.set("X-Worker-Cache", "HIT");
      h.set(
        "X-Worker-Cache-Date",
        cached.headers.get("x-worker-cache-date") || new Date().toISOString(),
      );
      h.set("X-Worker-Cache-Region", request.cf?.colo || "unknown");
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: h,
      });
    } catch (e) {
      console.error("Cache get error:", e);
      return null;
    }
  }
  // Put result into cache with safe Cache-Control, merged Vary and clean debug headers.
  async put(request, response, options = {}) {
    try {
      const cacheKey = this.generateCacheKey(request, options.customKey);
      const defaults = {
        maxAge: 300,
        sMaxAge: 432000,
        staleWhileRevalidate: 3600,
        publicCache: true,
        vary: "", // e.g. "CF-IPCountry" when geo fallback is used
      };
      const settings = { ...defaults, ...options };
      const h = new Headers(response.headers);
      // Cache control for browser + edge
      h.set("Cache-Control", this.buildCacheControl(settings));
      h.set("CDN-Cache-Control", `max-age=${settings.sMaxAge}`);
      // Clean previous debug headers
      for (const k of [
        "x-cache-status",
        "x-cache-date",
        "x-worker-cache",
        "x-worker-cache-date",
        "x-worker-cache-region",
      ])
        h.delete(k);
      h.set("X-Worker-Cache", "MISS");
      h.set("X-Worker-Cache-Date", new Date().toISOString());
      h.set("X-Worker-Cache-Region", request.cf?.colo || "unknown");
      // Add Last-Modified and a lightweight ETag (no stream reading)
      const lm =
        response.headers.get("Last-Modified") || new Date().toUTCString();
      h.set("Last-Modified", lm);
      if (!response.headers.get("ETag")) {
        h.set("ETag", `"${this.generateETagFrom(cacheKey.url, response)}"`);
      }
      // Merge Vary
      if (settings.vary) {
        const incoming = settings.vary
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const prev = h.get("Vary") || "";
        const have = prev
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const merged = [...have];
        for (const v of incoming)
          if (!have.includes(v.toLowerCase())) merged.push(v);
        if (merged.length) h.set("Vary", merged.join(", "));
      }
      const cachedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: h,
      });
      await this.cache.put(cacheKey, cachedResponse.clone());
      return cachedResponse;
    } catch (e) {
      console.error("Cache put error:", e);
      return response;
    }
  }
  async delete(request, customKey = null) {
    try {
      const cacheKey = this.generateCacheKey(request, customKey);
      return await this.cache.delete(cacheKey);
    } catch (e) {
      console.error("Cache delete error:", e);
      return false;
    }
  }
  buildCacheControl(options) {
    const parts = [];
    parts.push(options.publicCache ? "public" : "private");
    if (options.maxAge) parts.push(`max-age=${options.maxAge}`);
    if (options.sMaxAge) parts.push(`s-maxage=${options.sMaxAge}`);
    if (options.staleWhileRevalidate)
      parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    if (options.noStore) parts.push("no-store");
    if (options.noCache) parts.push("no-cache");
    return parts.join(", ");
  }
  // ETag based on URL + Content-Length + Last-Modified (no stream reading)
  generateETagFrom(cacheUrl, response) {
    const cl = response.headers.get("content-length") || "";
    const lm = response.headers.get("last-modified") || "";
    return `cf-${this.simpleHash(`${cacheUrl}|${cl}|${lm}`)}`;
  }
  simpleHash(str) {
    let hash = 0;
    if (!str || !str.length) return "0";
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      hash = (hash << 5) - hash + c;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}
