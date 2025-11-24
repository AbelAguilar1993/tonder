import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";

export async function handleAttributesRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const cache = new CloudflareCache(env);

  // Extract resource info
  const resource = pathParts[2]; // /api/attributes/{resource}

  try {
    let response;

    switch (resource) {
      case "companies":
        response = await getCompaniesAttributes(env);
        break;
      case "jobs":
        response = await getJobsAttributes(env);
        break;
    }

    return response;
  } catch (error) {
    console.error("Attributes API error:", error);
    return createResponse(
      { error: "Internal server error", details: error.message },
      500,
    );
  }
}

async function getCompaniesAttributes(env) {
  try {
    const stmt = env.DB.prepare(`
      SELECT id, name FROM companies
    `);
    const { results } = await stmt.all();
    const attributes = results.map((result) => {
      return {
        id: result.id,
        slug: result.name.toLowerCase().replace(/ /g, "-"),
      };
    });
    return createResponse({ success: true, data: attributes });
  } catch (error) {
    return createResponse(
      { error: "Internal server error", details: error.message },
      500,
    );
  }
}

async function getJobsAttributes(env) {
  try {
    const stmt = env.DB.prepare(`
      SELECT id, title FROM jobs
    `);
    const { results } = await stmt.all();
    const attributes = results.map((result) => {
      return {
        id: result.id,
        title: result.title,
      };
    });
    return createResponse({ success: true, data: attributes });
  } catch (error) {
    return createResponse(
      { error: "Internal server error", details: error.message },
      500,
    );
  }
}
