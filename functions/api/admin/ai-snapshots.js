import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";

export async function handleAISnapshotsRequest(
  method,
  snapshotId,
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
    if (snapshotId) {
      response = await getAISnapshot(snapshotId, env, user);
    } else {
      response = await getAISnapshots(env, user, url);
    }

    return response;

    // // Cache successful responses with longer TTL for AI snapshots
    // if (response.status === 200) {
    //   const cacheSettings = {
    //     maxAge: 300, // 5 minutes browser cache
    //     sMaxAge: 1800, // 30 minutes edge cache
    //     staleWhileRevalidate: 3600, // 1 hour stale allowed
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
      response = await createAISnapshot(request, env, user);
      if (response.status === 200 || response.status === 201) {
        await invalidateAISnapshotsCache(cache, user, env);
      }
      break;
    case "PUT":
      response = await updateAISnapshot(snapshotId, request, env, user);
      if (response.status === 200) {
        await invalidateAISnapshotsCache(cache, user, env, snapshotId);
      }
      break;
    case "DELETE":
      response = await deleteAISnapshot(snapshotId, env, user);
      if (response.status === 200) {
        await invalidateAISnapshotsCache(cache, user, env, snapshotId);
      }
      break;
    default:
      return createResponse({ error: "Method not allowed" }, 405);
  }

  return response;
}

// AI Snapshots CRUD implementations
async function getAISnapshots(env, user, url) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "20");
    const search = params.get("search") || "";
    const job_title = params.get("job_title") || "";
    const city = params.get("city") || "";
    const country = params.get("country") || "";
    const employment_type = params.get("employment_type") || "";

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    // Search filtering
    if (search) {
      const searchUnits = search
        .split(/\s*,\s*/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0);
      if (searchUnits.length > 0) {
        const searchConditions = searchUnits.map(
          () => "(job_title LIKE ? OR city LIKE ? OR country LIKE ?)",
        );
        whereConditions.push(`(${searchConditions.join(" OR ")})`);

        // Add parameters for each search term
        searchUnits.forEach((term) => {
          const searchTerm = `%${term}%`;
          queryParams.push(searchTerm, searchTerm, searchTerm);
        });
      }
    }

    // Specific filtering
    if (job_title) {
      whereConditions.push("job_title = ?");
      queryParams.push(job_title);
    }

    if (city) {
      whereConditions.push("city = ?");
      queryParams.push(city);
    }

    if (country) {
      whereConditions.push("country = ?");
      queryParams.push(country);
    }

    if (employment_type) {
      whereConditions.push("employment_type = ?");
      queryParams.push(employment_type);
    }

    // // Only active snapshots
    // whereConditions.push("is_active = ?");
    // queryParams.push(true);

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countStmt = env.DB.prepare(`
      SELECT COUNT(*) as total 
      FROM ai_snapshots
      ${whereClause}
    `);
    const { total } = await countStmt.bind(...queryParams).first();

    // Get paginated results
    const stmt = env.DB.prepare(`
      SELECT 
        ai.*,
        u.first_name as created_by_name,
        u.last_name as created_by_lastname
      FROM ai_snapshots ai
      LEFT JOIN users u ON ai.created_by = u.id
      ${whereClause}
      ORDER BY ai.priority DESC, ai.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const { results } = await stmt.bind(...queryParams, limit, offset).all();

    // Parse JSON fields for each result
    const snapshots = results.map((snapshot) => ({
      ...snapshot,
      market_insights: snapshot.market_insights
        ? JSON.parse(snapshot.market_insights)
        : null,
      salary_range: snapshot.salary_range
        ? JSON.parse(snapshot.salary_range)
        : null,
      required_skills: snapshot.required_skills
        ? JSON.parse(snapshot.required_skills)
        : null,
      created_by_full_name: snapshot.created_by_name
        ? `${snapshot.created_by_name} ${
            snapshot.created_by_lastname || ""
          }`.trim()
        : null,
    }));

    const totalPages = Math.ceil(total / limit);

    return createResponse({
      success: true,
      data: snapshots,
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
    console.error("Get AI snapshots error:", error);
    return createResponse(
      { error: "Failed to fetch AI snapshots", data: error },
      500,
    );
  }
}

async function createAISnapshot(request, env, user) {
  try {
    const data = await request.json();

    // Validate JSON fields
    let market_insights_json = "{}";
    let salary_range_json = "{}";
    let required_skills_json = "[]";

    if (data.market_insights) {
      try {
        market_insights_json =
          typeof data.market_insights === "string"
            ? data.market_insights
            : JSON.stringify(data.market_insights);
        JSON.parse(market_insights_json); // Validate JSON
      } catch {
        return createResponse(
          { error: "Invalid JSON format for market_insights" },
          400,
        );
      }
    }

    if (data.salary_range) {
      try {
        salary_range_json =
          typeof data.salary_range === "string"
            ? data.salary_range
            : JSON.stringify(data.salary_range);
        JSON.parse(salary_range_json); // Validate JSON
      } catch {
        return createResponse(
          { error: "Invalid JSON format for salary_range" },
          400,
        );
      }
    }

    if (data.required_skills) {
      try {
        required_skills_json =
          typeof data.required_skills === "string"
            ? data.required_skills
            : JSON.stringify(data.required_skills);
        JSON.parse(required_skills_json); // Validate JSON
      } catch {
        return createResponse(
          { error: "Invalid JSON format for required_skills" },
          400,
        );
      }
    }

    // Validate employment type if provided
    if (data.employment_type) {
      const validTypes = [
        "full-time",
        "part-time",
        "contract",
        "internship",
        "temporary",
      ];
      if (!validTypes.includes(data.employment_type)) {
        return createResponse(
          {
            error: `Invalid employment type. Valid options are: ${validTypes.join(
              ", ",
            )}`,
          },
          400,
        );
      }
    }

    // Validate country if provided
    if (data.country) {
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
    }

    const stmt = env.DB.prepare(`
      INSERT INTO ai_snapshots (
        job_title, city, country, employment_type,
        market_insights, salary_range, required_skills,
        application_tips, company_specific_tips,
        priority, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt
      .bind(
        data.job_title || null,
        data.city || null,
        data.country || null,
        data.employment_type || null,
        market_insights_json,
        salary_range_json,
        required_skills_json,
        data.application_tips || null,
        data.company_specific_tips || null,
        data.priority || 0,
        user.id,
      )
      .run();

    const snapshotId = result.meta.last_row_id;

    return createResponse(
      {
        success: true,
        data: {
          id: snapshotId,
          ...data,
          created_by: user.id,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Create AI snapshot error:", error);
    return createResponse(
      {
        error: "Failed to create AI snapshot",
        details: error.message,
      },
      500,
    );
  }
}

async function getAISnapshot(snapshotId, env, user) {
  try {
    const stmt = env.DB.prepare(`
      SELECT 
        ai.*,
        u.first_name as created_by_name,
        u.last_name as created_by_lastname
      FROM ai_snapshots ai
      LEFT JOIN users u ON ai.created_by = u.id
      WHERE ai.id = ?
    `);

    const snapshot = await stmt.bind(snapshotId).first();

    if (!snapshot) {
      return createResponse({ error: "AI snapshot not found" }, 404);
    }

    // Parse JSON fields
    const result = {
      ...snapshot,
      market_insights: snapshot.market_insights
        ? JSON.parse(snapshot.market_insights)
        : null,
      salary_range: snapshot.salary_range
        ? JSON.parse(snapshot.salary_range)
        : null,
      required_skills: snapshot.required_skills
        ? JSON.parse(snapshot.required_skills)
        : null,
      created_by_full_name: snapshot.created_by_name
        ? `${snapshot.created_by_name} ${
            snapshot.created_by_lastname || ""
          }`.trim()
        : null,
    };

    return createResponse({ success: true, data: result });
  } catch (error) {
    console.error("Get AI snapshot error:", error);
    return createResponse({ error: "Failed to fetch AI snapshot" }, 500);
  }
}

async function updateAISnapshot(snapshotId, request, env, user) {
  try {
    const data = await request.json();

    // Check if snapshot exists
    const existingSnapshot = await env.DB.prepare(
      "SELECT id FROM ai_snapshots WHERE id = ?",
    )
      .bind(snapshotId)
      .first();

    if (!existingSnapshot) {
      return createResponse({ error: "AI snapshot not found" }, 404);
    }

    // Validate JSON fields
    let market_insights_json = "{}";
    let salary_range_json = "{}";
    let required_skills_json = "[]";

    if (data.market_insights !== undefined) {
      try {
        market_insights_json =
          typeof data.market_insights === "string"
            ? data.market_insights
            : JSON.stringify(data.market_insights);
        JSON.parse(market_insights_json); // Validate JSON
      } catch {
        return createResponse(
          { error: "Invalid JSON format for market_insights" },
          400,
        );
      }
    }

    if (data.salary_range !== undefined) {
      try {
        salary_range_json =
          typeof data.salary_range === "string"
            ? data.salary_range
            : JSON.stringify(data.salary_range);
        JSON.parse(salary_range_json); // Validate JSON
      } catch {
        return createResponse(
          { error: "Invalid JSON format for salary_range" },
          400,
        );
      }
    }

    if (data.required_skills !== undefined) {
      try {
        required_skills_json =
          typeof data.required_skills === "string"
            ? data.required_skills
            : JSON.stringify(data.required_skills);
        JSON.parse(required_skills_json); // Validate JSON
      } catch {
        return createResponse(
          { error: "Invalid JSON format for required_skills" },
          400,
        );
      }
    }

    // Validate employment type if provided
    if (data.employment_type) {
      const validTypes = [
        "full-time",
        "part-time",
        "contract",
        "internship",
        "temporary",
      ];
      if (!validTypes.includes(data.employment_type)) {
        return createResponse(
          {
            error: `Invalid employment type. Valid options are: ${validTypes.join(
              ", ",
            )}`,
          },
          400,
        );
      }
    }

    // Validate country if provided
    if (data.country) {
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
    }

    const stmt = env.DB.prepare(`
      UPDATE ai_snapshots 
      SET job_title = ?, city = ?, country = ?, employment_type = ?,
          market_insights = ?, salary_range = ?, required_skills = ?,
          application_tips = ?, company_specific_tips = ?,
          priority = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = await stmt
      .bind(
        data.job_title !== undefined ? data.job_title : null,
        data.city !== undefined ? data.city : null,
        data.country !== undefined ? data.country : null,
        data.employment_type !== undefined ? data.employment_type : null,
        market_insights_json,
        salary_range_json,
        required_skills_json,
        data.application_tips !== undefined ? data.application_tips : null,
        data.company_specific_tips !== undefined
          ? data.company_specific_tips
          : null,
        data.priority !== undefined ? data.priority : 0,
        data.is_active !== undefined ? data.is_active : true,
        snapshotId,
      )
      .run();

    if (result.changes === 0) {
      return createResponse({ error: "AI snapshot not found" }, 404);
    }

    return createResponse({
      success: true,
      data: {
        id: snapshotId,
        ...data,
      },
    });
  } catch (error) {
    console.error("Update AI snapshot error:", error);
    return createResponse(
      {
        error: "Failed to update AI snapshot",
        details: error.message,
      },
      500,
    );
  }
}

async function deleteAISnapshot(snapshotId, env, user) {
  try {
    // Check if snapshot exists
    const existingSnapshot = await env.DB.prepare(
      "SELECT id FROM ai_snapshots WHERE id = ?",
    )
      .bind(snapshotId)
      .first();

    if (!existingSnapshot) {
      return createResponse({ error: "AI snapshot not found" }, 404);
    }

    const stmt = env.DB.prepare("DELETE FROM ai_snapshots WHERE id = ?");
    const result = await stmt.bind(snapshotId).run();

    // Clear any existing relationship for this snapshot
    await env.DB.prepare(
      `
      UPDATE jobs SET snapshot_id = NULL WHERE snapshot_id = ?
    `,
    )
      .bind(snapshotId)
      .run();

    if (result.changes === 0) {
      return createResponse({ error: "AI snapshot not found" }, 404);
    }

    return createResponse({
      success: true,
      message: "AI snapshot deleted successfully",
    });
  } catch (error) {
    console.error("Delete AI snapshot error:", error);
    return createResponse(
      {
        error: "Failed to delete AI snapshot",
        details: error.message,
      },
      500,
    );
  }
}

// Find best matching AI snapshot for a job
export async function findBestAISnapshot(env, job) {
  try {
    // Build a series of queries to find the best match
    // Priority order: most specific to least specific

    const queries = [
      // 1. Exact match: job title + city + country + employment_type
      {
        sql: `SELECT * FROM ai_snapshots 
              WHERE job_title = ? AND city = ? AND country = ? AND employment_type = ? 
              AND is_active = 1 ORDER BY priority DESC LIMIT 1`,
        params: [
          job.title,
          job.city || null,
          job.country || null,
          job.employment_type,
        ],
      },
      // 2. Job title + city + country
      {
        sql: `SELECT * FROM ai_snapshots 
              WHERE job_title = ? AND city = ? AND country = ? AND employment_type IS NULL
              AND is_active = 1 ORDER BY priority DESC LIMIT 1`,
        params: [job.title, job.city || null, job.country || null],
      },
      // 3. Job title + country
      {
        sql: `SELECT * FROM ai_snapshots 
              WHERE job_title = ? AND city IS NULL AND country = ? AND employment_type IS NULL
              AND is_active = 1 ORDER BY priority DESC LIMIT 1`,
        params: [job.title, job.country || null],
      },
      // 4. City + country
      {
        sql: `SELECT * FROM ai_snapshots 
              WHERE job_title IS NULL AND city = ? AND country = ? AND employment_type IS NULL
              AND is_active = 1 ORDER BY priority DESC LIMIT 1`,
        params: [job.city || null, job.country || null],
      },
      // 5. Country only
      {
        sql: `SELECT * FROM ai_snapshots 
              WHERE job_title IS NULL AND city IS NULL AND country = ? AND employment_type IS NULL
              AND is_active = 1 ORDER BY priority DESC LIMIT 1`,
        params: [job.country || null],
      },
      // 6. Generic fallback (all fields NULL)
      {
        sql: `SELECT * FROM ai_snapshots 
              WHERE job_title IS NULL AND city IS NULL AND country IS NULL AND employment_type IS NULL
              AND is_active = 1 ORDER BY priority DESC LIMIT 1`,
        params: [],
      },
    ];

    // Try each query until we find a match
    for (const query of queries) {
      const stmt = env.DB.prepare(query.sql);
      const result = await stmt.bind(...query.params).first();

      if (result) {
        // Parse JSON fields and return
        return {
          ...result,
          market_insights: result.market_insights
            ? JSON.parse(result.market_insights)
            : null,
          salary_range: result.salary_range
            ? JSON.parse(result.salary_range)
            : null,
          required_skills: result.required_skills
            ? JSON.parse(result.required_skills)
            : null,
        };
      }
    }

    // No match found
    return null;
  } catch (error) {
    console.error("Find best AI snapshot error:", error);
    return null;
  }
}

// Cache invalidation helper for AI snapshots
async function invalidateAISnapshotsCache(cache, user, env, snapshotId = null) {
  try {
    // Patterns to invalidate
    const patterns = [
      `/api/admin/ai-snapshots`, // AI snapshots list
      `/api/admin/ai-snapshots/${snapshotId}`, // Specific AI snapshot
      `/api/jobs/`, // Public job details (might include AI snapshots)
    ];

    // Delete cache entries
    for (const pattern of patterns) {
      const testUrl = new URL(`https://example.com${pattern}`);
      const testRequest = new Request(testUrl.toString());
      await cache.delete(testRequest);
    }

    // Cache invalidation completed
  } catch (error) {
    console.error("Cache invalidation error for AI snapshots:", error);
    // Don't fail the main operation if cache invalidation fails
  }
}
