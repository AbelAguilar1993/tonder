import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";

export async function handleChildJobsRequest(
  method,
  childJobId,
  request,
  env,
  user,
) {
  const cache = new CloudflareCache(env);

  // Handle caching for GET requests
  if (method === "GET") {
    // Generate cache key that includes user context for security
    const url = new URL(request.url);
    const cacheKey = `${
      url.pathname
    }?${url.searchParams.toString()}&user_role=${user.role}&company_id=${
      user.company_id || "all"
    }`;

    // Try cache first for GET requests
    // const cached = await cache.get(request, cacheKey);
    // if (cached) {
    //   return cached;
    // }

    // Get fresh data
    let response;
    if (childJobId) {
      response = await getChildJob(childJobId, env, user);
    } else {
      response = await getChildJobs(env, user, url);
    }

    return response;

    // // Cache successful responses with shorter TTL for admin data
    // if (response.status === 200) {
    //   const cacheSettings = {
    //     maxAge: 180, // 3 minutes browser cache
    //     sMaxAge: 600, // 10 minutes edge cache
    //     staleWhileRevalidate: 1200, // 20 minutes stale allowed
    //     publicCache: false, // Private cache for admin data
    //   };
    //   response = await cache.put(request, response, {
    //     ...cacheSettings,
    //     customKey: cacheKey,
    //   });
    // }

    // return response;
  }

  // Handle non-GET requests (with cache invalidation)
  let response;
  switch (method) {
    case "POST":
      response = await createChildJob(request, env, user);
      if (response.status === 200 || response.status === 201) {
        await invalidateChildJobsCache(cache, user, env);
      }
      break;
    case "PUT":
      response = await updateChildJob(childJobId, request, env, user);
      if (response.status === 200) {
        await invalidateChildJobsCache(cache, user, env, childJobId);
      }
      break;
    case "DELETE":
      response = await deleteChildJob(childJobId, env, user);
      if (response.status === 200) {
        await invalidateChildJobsCache(cache, user, env, childJobId);
      }
      break;
    default:
      return createResponse({ error: "Method not allowed" }, 405);
  }

  return response;
}

// Child Job CRUD implementations
async function getChildJobs(env, user, url) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "20");
    const search = params.get("search") || "";
    const parent_job_id = params.get("parent_job_id") || "";
    const source = params.get("source") || "";
    const country = params.get("country") || "";

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    // Role-based filtering - company admins can only see child jobs for their company's jobs
    if (user.role === "company_admin") {
      whereConditions.push("j.company_id = ?");
      queryParams.push(user.company_id);
    }

    // Parent job filtering
    if (parent_job_id) {
      whereConditions.push("cj.parent_job_id = ?");
      queryParams.push(parent_job_id);
    }

    // Search filtering
    if (search) {
      const searchUnits = search
        .split(/\s*,\s*/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0);
      if (searchUnits.length > 0) {
        const searchConditions = searchUnits.map(
          () => "(cj.title LIKE ? OR cj.city LIKE ? OR cj.source LIKE ?)",
        );
        whereConditions.push(`(${searchConditions.join(" OR ")})`);

        // Add parameters for each search term
        searchUnits.forEach((term) => {
          const searchTerm = `%${term}%`;
          queryParams.push(searchTerm, searchTerm, searchTerm);
        });
      }
    }

    // Source filtering
    if (source) {
      whereConditions.push("cj.source = ?");
      queryParams.push(source);
    }

    // Country filtering
    if (country) {
      whereConditions.push("cj.country = ?");
      queryParams.push(country);
    }

    // Only active child jobs
    whereConditions.push("cj.is_active = ?");
    queryParams.push(true);

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countStmt = env.DB.prepare(`
      SELECT COUNT(*) as total 
      FROM child_jobs cj
      LEFT JOIN jobs j ON cj.parent_job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      ${whereClause}
    `);
    const { total } = await countStmt.bind(...queryParams).first();

    // Get paginated results
    const stmt = env.DB.prepare(`
      SELECT 
        cj.*,
        j.title as parent_job_title,
        j.company_id as parent_company_id,
        c.name as company_name,
        c.logo_url as company_logo_url
      FROM child_jobs cj
      LEFT JOIN jobs j ON cj.parent_job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      ${whereClause}
      ORDER BY cj.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const { results } = await stmt.bind(...queryParams, limit, offset).all();

    const totalPages = Math.ceil(total / limit);

    return createResponse({
      success: true,
      data: results,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Get child jobs error:", error);
    return createResponse({ error: "Failed to fetch child jobs" }, 500);
  }
}

async function createChildJob(request, env, user) {
  try {
    const data = await request.json();

    // Validate required fields
    if (
      !data.parent_job_id ||
      !data.title ||
      !data.city ||
      !data.country ||
      !data.link ||
      !data.source
    ) {
      return createResponse(
        {
          error:
            "Parent job ID, title, city, country, link, and source are required",
        },
        400,
      );
    }

    // Check if parent job exists and user has permission
    const parentJobStmt = env.DB.prepare(`
      SELECT j.*, c.id as company_id 
      FROM jobs j 
      LEFT JOIN companies c ON j.company_id = c.id 
      WHERE j.id = ?
    `);
    const parentJob = await parentJobStmt.bind(data.parent_job_id).first();

    if (!parentJob) {
      return createResponse({ error: "Parent job not found" }, 404);
    }

    // Company admin can only create child jobs for their company's jobs
    if (
      user.role === "company_admin" &&
      parentJob.company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    // Validate country
    const validCountries = [
      "México",
      "Peru",
      "Argentina",
      "Chile",
      "Colombia",
      "Ecuador",
      "Uruguay",
    ];
    if (!validCountries.includes(data.country)) {
      return createResponse(
        {
          error: `Invalid country. Valid options are: ${validCountries.join(
            ", ",
          )}`,
        },
        400,
      );
    }

    // Validate URL format
    try {
      new URL(data.link);
    } catch {
      return createResponse({ error: "Invalid URL format for link" }, 400);
    }

    // Check for duplicate link for same parent job
    const duplicateStmt = env.DB.prepare(`
      SELECT id FROM child_jobs 
      WHERE parent_job_id = ? AND link = ?
    `);
    const duplicate = await duplicateStmt
      .bind(data.parent_job_id, data.link)
      .first();

    if (duplicate) {
      return createResponse(
        {
          error:
            "A child job with this link already exists for this parent job",
        },
        400,
      );
    }

    const stmt = env.DB.prepare(`
      INSERT INTO child_jobs (parent_job_id, title, city, country, link, source)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt
      .bind(
        data.parent_job_id,
        data.title,
        data.city,
        data.country,
        data.link,
        data.source,
      )
      .run();

    return createResponse(
      {
        success: true,
        data: {
          id: result.meta.last_row_id,
          ...data,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Create child job error:", error);
    return createResponse(
      {
        error: "Failed to create child job",
        details: error.message,
      },
      500,
    );
  }
}

async function getChildJob(childJobId, env, user) {
  try {
    const stmt = env.DB.prepare(`
      SELECT 
        cj.*,
        j.title as parent_job_title,
        j.company_id as parent_company_id,
        c.name as company_name
      FROM child_jobs cj
      LEFT JOIN jobs j ON cj.parent_job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE cj.id = ?
    `);

    const childJob = await stmt.bind(childJobId).first();

    if (!childJob) {
      return createResponse({ error: "Child job not found" }, 404);
    }

    // Company admin can only view child jobs for their company's jobs
    if (
      user.role === "company_admin" &&
      childJob.parent_company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    return createResponse({ success: true, data: childJob });
  } catch (error) {
    console.error("Get child job error:", error);
    return createResponse({ error: "Failed to fetch child job" }, 500);
  }
}

async function updateChildJob(childJobId, request, env, user) {
  try {
    const data = await request.json();

    // Check if child job exists and user has permission
    const existingStmt = env.DB.prepare(`
      SELECT 
        cj.*,
        j.company_id as parent_company_id
      FROM child_jobs cj
      LEFT JOIN jobs j ON cj.parent_job_id = j.id
      WHERE cj.id = ?
    `);
    const existingChildJob = await existingStmt.bind(childJobId).first();

    if (!existingChildJob) {
      return createResponse({ error: "Child job not found" }, 404);
    }

    // Company admin can only update child jobs for their company's jobs
    if (
      user.role === "company_admin" &&
      existingChildJob.parent_company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    // Validate required fields
    if (
      !data.title ||
      !data.city ||
      !data.country ||
      !data.link ||
      !data.source
    ) {
      return createResponse(
        {
          error: "Title, city, country, link, and source are required",
        },
        400,
      );
    }

    // Validate country
    const validCountries = [
      "México",
      "Peru",
      "Argentina",
      "Chile",
      "Colombia",
      "Ecuador",
      "Uruguay",
    ];
    if (!validCountries.includes(data.country)) {
      return createResponse(
        {
          error: `Invalid country. Valid options are: ${validCountries.join(
            ", ",
          )}`,
        },
        400,
      );
    }

    // Validate URL format
    try {
      new URL(data.link);
    } catch {
      return createResponse({ error: "Invalid URL format for link" }, 400);
    }

    // Check for duplicate link (excluding current child job)
    const duplicateStmt = env.DB.prepare(`
      SELECT id FROM child_jobs 
      WHERE parent_job_id = ? AND link = ? AND id != ?
    `);
    const duplicate = await duplicateStmt
      .bind(existingChildJob.parent_job_id, data.link, childJobId)
      .first();

    if (duplicate) {
      return createResponse(
        {
          error:
            "A child job with this link already exists for this parent job",
        },
        400,
      );
    }

    const stmt = env.DB.prepare(`
      UPDATE child_jobs 
      SET title = ?, city = ?, country = ?, link = ?, source = ?, 
          is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = await stmt
      .bind(
        data.title,
        data.city,
        data.country,
        data.link,
        data.source,
        data.is_active !== undefined ? data.is_active : true,
        childJobId,
      )
      .run();

    if (result.changes === 0) {
      return createResponse({ error: "Child job not found" }, 404);
    }

    return createResponse({
      success: true,
      data: {
        id: childJobId,
        ...data,
      },
    });
  } catch (error) {
    console.error("Update child job error:", error);
    return createResponse(
      {
        error: "Failed to update child job",
        details: error.message,
      },
      500,
    );
  }
}

async function deleteChildJob(childJobId, env, user) {
  try {
    // Check if child job exists and user has permission
    const existingStmt = env.DB.prepare(`
      SELECT 
        cj.*,
        j.company_id as parent_company_id
      FROM child_jobs cj
      LEFT JOIN jobs j ON cj.parent_job_id = j.id
      WHERE cj.id = ?
    `);
    const existingChildJob = await existingStmt.bind(childJobId).first();

    if (!existingChildJob) {
      return createResponse({ error: "Child job not found" }, 404);
    }

    // Company admin can only delete child jobs for their company's jobs
    if (
      user.role === "company_admin" &&
      existingChildJob.parent_company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    const stmt = env.DB.prepare("DELETE FROM child_jobs WHERE id = ?");
    const result = await stmt.bind(childJobId).run();

    if (result.changes === 0) {
      return createResponse({ error: "Child job not found" }, 404);
    }

    return createResponse({
      success: true,
      message: "Child job deleted successfully",
    });
  } catch (error) {
    console.error("Delete child job error:", error);
    return createResponse(
      {
        error: "Failed to delete child job",
        details: error.message,
      },
      500,
    );
  }
}

// Cache invalidation helper for child jobs
async function invalidateChildJobsCache(cache, user, env, childJobId = null) {
  try {
    // Get child job details if childJobId provided to invalidate related caches
    let parentJobId = null;
    if (childJobId) {
      const childJob = await env.DB.prepare(
        "SELECT parent_job_id FROM child_jobs WHERE id = ?",
      )
        .bind(childJobId)
        .first();
      parentJobId = childJob?.parent_job_id;
    }

    // Patterns to invalidate
    const patterns = [
      `/api/admin/child-jobs`, // Child jobs list
      `/api/admin/child-jobs/${childJobId}`, // Specific child job
      `/api/jobs/${parentJobId}`, // Public job details (includes child jobs)
    ];

    // Add parent job specific patterns if we have a parent job ID
    if (parentJobId) {
      patterns.push(`/api/admin/child-jobs?parent_job_id=${parentJobId}`);
    }

    // Add user-role specific patterns
    if (user.role === "company_admin" && user.company_id) {
      patterns.push(`/api/admin/child-jobs?company_id=${user.company_id}`);
    }

    // Delete cache entries
    for (const pattern of patterns) {
      const testUrl = new URL(`https://example.com${pattern}`);
      const testRequest = new Request(testUrl.toString());
      await cache.delete(testRequest);
    }

    // Cache invalidation completed
  } catch (error) {
    console.error("Cache invalidation error for child jobs:", error);
    // Don't fail the main operation if cache invalidation fails
  }
}
