// worker.mjs
/**
 * @version 1.5.2-nocache-cf-only-header
 * Geo policy: ONLY Cloudflare request.cf.city (no QA override, no meta, no cookies).
 * Behavior: sets 'x-geo-city' on ALL responses and forwards it to origin requests.
 * Edge cache: DISABLED (no caches.default usage).
 */

// --------------------------- GEO (CF-only) ---------------------------
function getCfCity(request) {
  return request?.cf?.city || "";
}

// ------------------------------- Imports --------------------------------
import { handleAuth } from "./api/auth.js";
import { handleProfile } from "./api/profile.js";
import { handleAdminRequest } from "./api/admin/index.js";
import { handleAttributesRequest } from "./api/attributes/index.js";
import { handleUploadRequest } from "./api/upload.js";
import { handleContactsRequest } from "./api/contacts/index.js";
import { handleJobsRequest } from "./api/jobs/index.js";
import { handleCompaniesRequest } from "./api/companies/index.js";
import { handleJobApplicationsRequest } from "./api/job_applications/index.js";
import { handleGptRequest } from "./api/gpt.js";
import { handleContactRequest } from "./api/contact.js";
import { handleSupportRequest } from "./api/support.js";
import { handleDLocalGoRequest } from "./api/payments/d_local_go/index.js";
import { handleTonderRequest } from "./api/payments/tonder/index.js";
import { handleCreditsRequest } from "./api/credits/index.js";
import { handleMessagesRequest } from "./api/messages/index.js";
import { handleCORS, createResponse } from "./utils/cors.js";
import { verifyJWT } from "./utils/jwt.js";

// -------------------------------- Main ----------------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") return handleCORS();

    // ---------------- API routes (uændret) ----------------
    if (path.startsWith("/api/")) {
      try {
        if (path.startsWith("/api/attributes"))
          return await handleAttributesRequest(request, env);
        if (path.startsWith("/api/jobs"))
          return await handleJobsRequest(request, env);
        if (path.startsWith("/api/companies"))
          return await handleCompaniesRequest(request, env);

        const authResult = await verifyJWT(request, env);
        const user = authResult?.payload || null;

        if (path.startsWith("/api/contacts"))
          return await handleContactsRequest(request, env, user);
        if (path.startsWith("/api/payments/d_local_go"))
          return await handleDLocalGoRequest(request, env, user);
        if (path.startsWith("/api/payments/tonder"))
          return await handleTonderRequest(request, env, user);
        if (path.startsWith("/api/contact"))
          return await handleContactRequest(request, env);
        if (path.startsWith("/api/support"))
          return await handleSupportRequest(request, env);
        if (path.startsWith("/api/auth")) return await handleAuth(request, env);
        if (path.startsWith("/api/messages"))
          return await handleMessagesRequest(request, env);
        if (path.startsWith("/api/job-applications"))
          return await handleJobApplicationsRequest(request, env, user);
        if (path.startsWith("/api/profile")) {
          if (!authResult?.valid)
            return createResponse({ error: "Unauthorized" }, 401);
          return await handleProfile(request, env);
        }
        if (path.startsWith("/api/admin"))
          return await handleAdminRequest(request, env);
        if (!authResult.valid)
          return createResponse({ error: "Unauthorized" }, 401);
        if (path.startsWith("/api/gpt"))
          return await handleGptRequest(request, env);
        if (path.startsWith("/api/upload"))
          return await handleUploadRequest(
            request.method,
            request,
            env,
            authResult.payload,
          );
        if (path.startsWith("/api/credits"))
          return await handleCreditsRequest(request, env);
        if (path.startsWith("/api/messages"))
          return await handleMessagesRequest(request, env);

        return createResponse({ error: "API endpoint not found" }, 404);
      } catch (error) {
        console.error("Worker error:", error);
        return createResponse(
          {
            error: "Internal server error",
            timestamp: new Date().toISOString(),
          },
          500,
        );
      }
    }

    // ---------------- passthrough (no cache) ----------------
    const city = getCfCity(request); // CF ONLY
    const h2 = new Headers(request.headers);
    h2.set("x-geo-city", city || "");
    const upstreamReq = new Request(request, { headers: h2 });

    const upstreamResp = await fetch(upstreamReq);
    const base = new Response(upstreamResp.body, upstreamResp);
    base.headers.set("x-geo-city", city || "");
    return base;
  },
};
