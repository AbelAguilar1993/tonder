import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";
import { COUNTRY_LABELS } from "../../utils/const.js";
import { getLocationDetails } from "../../utils/index.js";

export async function handleCompaniesRequest(request, env) {
  const cache = new CloudflareCache(env);
  const url = new URL(request.url);

  const { chosenCity, countryName, locationText } = getLocationDetails(request);

  // If country is NOT explicitly in the query, add geo variation to cache key and Vary.
  const cacheKey = `${
    url.pathname
  }?${url.searchParams.toString()}country=${countryName}&city=${chosenCity}`;

  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const companyId = pathParts[2];

  if (method !== "GET") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  let response;
  if (companyId) {
    response = await getCompany(env, companyId, locationText);
  } else {
    const cached = await cache.get(request, cacheKey);
    if (cached) return cached;

    response = await getCompanies(env, url, chosenCity, countryName);
  }

  if (response.status === 200) {
    response = await cache.put(request, response, {
      customKey: cacheKey,
      maxAge: 600, // 10 min browser
      sMaxAge: 432000, // 30 min edge
      staleWhileRevalidate: 14400,
      publicCache: true,
      vary: "CF-IPCountry",
    });
  }

  return response;
}

// Exact JSON match against location array (case-insensitive)
async function getCompanies(env, url, chosenCity, countryName) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "20", 10);
    const search = params.get("search") || "";
    const status = params.get("status") || "";

    const where = [];
    const bind = [];

    const country = COUNTRY_LABELS[countryName] || countryName;

    if (search) {
      const like = `%${search}%`;
      where.push(
        "(name LIKE ? OR short_description LIKE ? OR full_description LIKE ? OR location LIKE ?)",
      );
      bind.push(like, like, like, like);
    }

    if (country) {
      // Simple LIKE on the location JSON string (location is stored as JSON array of names)
      where.push("(location LIKE ?)");
      bind.push(`%${country}%`);
    }

    if (status) {
      if (status === "active") where.push("is_active = 1");
      if (status === "inactive") where.push("is_active = 0");
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    // Count
    const { total } = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM companies ${whereClause}`,
    )
      .bind(...bind)
      .first();

    // Page
    const { results } = await env.DB.prepare(
      `
        SELECT id, name, short_description, full_description, location,
               is_active, logo_url, color, created_at, updated_at
        FROM companies
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `,
    )
      .bind(...bind, limit, offset)
      .all();

    if (!results || results.length === 0) {
      return createResponse(
        {
          success: true,
          data: {
            companies: [],
            chosenCity,
            countryName: country,
          },
          meta: {
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil((total || 0) / limit),
            },
          },
        },
        200,
        {
          "X-Companies-Country": country || "",
          "X-Companies-Country-Source": countryName,
        },
      );
    }

    // Aggregate counts in batch
    const companyIds = results.map((r) => r.id);
    const placeholders = companyIds.map(() => "?").join(",");

    const [jobsAggRes, contactsAggRes] = await Promise.all([
      env.DB.prepare(
        `SELECT company_id, COUNT(*) as cnt FROM jobs WHERE company_id IN (${placeholders}) GROUP BY company_id`,
      )
        .bind(...companyIds)
        .all(),
      env.DB.prepare(
        `SELECT company_id, COUNT(*) as cnt FROM contacts WHERE company_id IN (${placeholders}) GROUP BY company_id`,
      )
        .bind(...companyIds)
        .all(),
    ]);

    const jobsMap = new Map(
      (jobsAggRes.results || []).map((r) => [r.company_id, r.cnt]),
    );
    const contactsMap = new Map(
      (contactsAggRes.results || []).map((r) => [r.company_id, r.cnt]),
    );

    const companies = results.map((c) => ({
      ...c,
      location: c.location ? JSON.parse(c.location) : [],
      jobs_count: jobsMap.get(c.id) || 0,
      contacts_count: contactsMap.get(c.id) || 0,
    }));

    const totalPages = Math.ceil(total / limit);
    return createResponse(
      {
        success: true,
        data: {
          companies,
          chosenCity,
          countryName: country,
        },
        meta: { pagination: { page, limit, total, totalPages } },
      },
      200,
      {
        "X-Companies-Country": country || "",
        "X-Companies-Country-Source": countryName,
      },
    );
  } catch (err) {
    console.error("Get companies (public) error:", err);
    return createResponse({ error: "Failed to fetch companies" }, 500);
  }
}

async function getCompany(env, companyId, locationText) {
  try {
    // Check if companyId is a number (ID) or a string (slug)
    const isNumeric = /^\d+$/.test(companyId);

    let company;
    if (isNumeric) {
      // Query by ID
      company = await env.DB.prepare(
        `
        SELECT id, name, short_description, full_description, location,
               is_active, logo_url, color, created_at, updated_at
        FROM companies
        WHERE id = ?
      `,
      )
        .bind(companyId)
        .first();
    } else {
      // Query by slug (company name)
      // Convert slug to approximate name for searching
      const searchName = companyId.replace(/-/g, " ");

      // Get companies with similar names (for efficiency)
      const { results } = await env.DB.prepare(
        `
        SELECT id, name, short_description, full_description, location,
               is_active, logo_url, color, created_at, updated_at
        FROM companies
        WHERE LOWER(name) LIKE LOWER(?)
        LIMIT 10
      `,
      )
        .bind(`%${searchName}%`)
        .all();

      // Find exact match by slug
      const normalizedSlug = companyId.toLowerCase();
      company = results.find((c) => {
        const companySlug = c.name.toLowerCase().replace(/ /g, "-");
        return companySlug === normalizedSlug;
      });
    }

    if (!company) return createResponse({ error: "Company not found" }, 404);

    company.location = company.location ? JSON.parse(company.location) : [];

    const jobsCount = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM jobs WHERE company_id = ?`,
    )
      .bind(company.id)
      .first();
    const contactsCount = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM contacts WHERE company_id = ?`,
    )
      .bind(company.id)
      .first();

    company.jobs_count = jobsCount?.total || 0;
    company.contacts_count = contactsCount?.total || 0;

    return createResponse({ success: true, data: { company, locationText } });
  } catch (err) {
    console.error("Get company error:", err);
    return createResponse({ error: "Failed to fetch company" }, 500);
  }
}
