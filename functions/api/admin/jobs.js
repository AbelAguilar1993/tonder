import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";
import { VALID_LOCATIONS } from "../../utils/const.js";

export async function handleJobsRequest(method, jobId, request, env, user) {
  const cache = new CloudflareCache(env);

  // Handle caching for GET requests
  if (method === "GET") {
    // Generate cache key that includes user context for security
    const url = new URL(request.url);

    // Get fresh data
    let response;
    if (jobId) {
      response = await getJob(jobId, env, user);
    } else {
      response = await getJobs(env, user, url);
    }

    return response;
  }

  // Handle non-GET requests (with cache invalidation)
  let response;
  switch (method) {
    case "POST":
      response = await createJob(request, env, user);
      if (response.status === 200 || response.status === 201) {
        await invalidateJobsCache(cache, user, env);
      }
      break;
    case "PUT":
      response = await updateJob(jobId, request, env, user);
      if (response.status === 200) {
        await invalidateJobsCache(cache, user, env, jobId);
      }
      break;
    case "DELETE":
      response = await deleteJob(jobId, env, user);
      if (response.status === 200) {
        await invalidateJobsCache(cache, user, env, jobId);
      }
      break;
    default:
      return createResponse({ error: "Method not allowed" }, 405);
  }

  return response;
}

// Job CRUD implementations
async function getJobs(env, user, url) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "20");
    const search = params.get("search") || "";
    const company_id = params.get("company_id") || "";
    const employment_type = params.get("employment_type") || "";

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    // Role-based filtering
    if (user.role === "company_admin") {
      whereConditions.push("j.company_id = ?");
      queryParams.push(user.company_id);
    }

    // Search filtering
    if (search) {
      const searchUnits = search
        .split(/\s*,\s*/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0);
      if (searchUnits.length > 0) {
        const searchConditions = searchUnits.map(
          () => "(j.title LIKE ? OR j.employment_type LIKE ? OR c.name LIKE ?)",
        );
        whereConditions.push(`(${searchConditions.join(" OR ")})`);

        // Add parameters for each search term
        searchUnits.forEach((term) => {
          const searchTerm = `%${term}%`;
          queryParams.push(searchTerm, searchTerm, searchTerm);
        });
      }
    }

    // Company filtering (for super admin)
    if (company_id && user.role === "super_admin") {
      whereConditions.push("j.company_id = ?");
      queryParams.push(company_id);
    }

    // Employment type filtering
    if (employment_type) {
      whereConditions.push("j.employment_type = ?");
      queryParams.push(employment_type);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countStmt = env.DB.prepare(`
      SELECT COUNT(*) as total 
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      ${whereClause}
    `);
    const { total } = await countStmt.bind(...queryParams).first();

    // Get paginated results
    const stmt = env.DB.prepare(`
      SELECT j.*, c.name as company_name, c.logo_url as company_logo_url, c.color as company_color,
      ai.job_title as snapshot_job_title
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN ai_snapshots ai ON j.snapshot_id = ai.id
      ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const { results } = await stmt.bind(...queryParams, limit, offset).all();

    // Get chips for each job
    const jobIds = results.map((job) => job.id);
    let chips = {};

    if (jobIds.length > 0) {
      let chipResults = [];
      try {
        const chipStmt = env.DB.prepare(`
          SELECT 
            jc.job_id,
            c.id,
            c.chip_key,
            c.chip_label,
            c.category,
            jc.display_order
          FROM job_chips jc
          INNER JOIN chips c ON jc.chip_id = c.id
          WHERE jc.job_id IN (${jobIds.map(() => "?").join(",")})
          ORDER BY jc.job_id, jc.display_order
        `);

        const result = await chipStmt.bind(...jobIds).all();
        chipResults = result.results || [];
      } catch (error) {
        console.log("Failed to get chips", error.message);
        chipResults = [];
      }

      // Process results
      chipResults.forEach((chip) => {
        if (!chips[chip.job_id]) {
          chips[chip.job_id] = [];
        }
        chips[chip.job_id].push({
          id: chip.id,
          chip_key: chip.chip_key,
          chip_label: chip.chip_label,
          category: chip.category,
          display_order: chip.display_order,
        });
      });
    }

    // Parse location JSON arrays in results and add chips
    const jobs = results.map((job) => {
      const {
        company_logo_url,
        company_color,
        company_name,
        snapshot_job_title,
        ...jobItem
      } = job;
      return {
        ...jobItem,
        location: job.location ? JSON.parse(job.location) : [],
        chips: chips[job.id] || [],
        company: {
          name: company_name,
          logo_url: company_logo_url,
          color: company_color,
        },
        ai_snapshot: snapshot_job_title
          ? {
              job_title: snapshot_job_title,
            }
          : null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return createResponse({
      success: true,
      data: jobs,
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
    console.error("Get jobs error:", error);
    return createResponse({ error: "Failed to fetch jobs" }, 500);
  }
}

async function createJob(request, env, user) {
  try {
    const data = await request.json();

    // Company admin can only create jobs for their company
    if (user.role === "company_admin" && data.company_id != user.company_id) {
      return createResponse({ error: "Access denied" }, 403);
    }

    // Validate required fields
    if (!data.company_id || !data.title) {
      return createResponse({ error: "Company and title are required" }, 400);
    }

    // Validate location array
    let locationJson = "[]";
    if (data.location) {
      if (Array.isArray(data.location)) {
        const invalidLocations = data.location.filter(
          (loc) => !VALID_LOCATIONS.includes(loc),
        );
        if (invalidLocations.length > 0) {
          return createResponse(
            {
              error: `Invalid locations: ${invalidLocations.join(
                ", ",
              )}. Valid options are: ${VALID_LOCATIONS.join(", ")}`,
            },
            400,
          );
        }
        locationJson = JSON.stringify(data.location);
      } else {
        return createResponse({ error: "Location must be an array" }, 400);
      }
    }

    // Validate chip IDs if provided
    if (data.chip_ids && Array.isArray(data.chip_ids)) {
      if (data.chip_ids.length > 0) {
        let chipStmt;
        chipStmt = env.DB.prepare(`
          SELECT COUNT(*) as count FROM chips 
          WHERE id IN (${data.chip_ids
            .map(() => "?")
            .join(",")}) AND is_active = 1
        `);

        const { count } = await chipStmt.bind(...data.chip_ids).first();

        if (count !== data.chip_ids.length) {
          return createResponse(
            { error: "One or more chips are invalid or inactive" },
            400,
          );
        }
      }
    }

    // Clear existing relationships before creating new job (to avoid UNIQUE constraint violation)
    if (data.snapshot_id) {
      const snapshotId = parseInt(data.snapshot_id);
      // Clear any existing job that has this snapshot_id
      await env.DB.prepare(
        `
        UPDATE jobs SET snapshot_id = NULL WHERE snapshot_id = ?
      `,
      )
        .bind(snapshotId)
        .run();
    }

    const stmt = env.DB.prepare(`
      INSERT INTO jobs (company_id, title, employment_type, location, description, snapshot_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt
      .bind(
        data.company_id,
        data.title,
        data.employment_type || null,
        locationJson,
        data.description || null,
        data.snapshot_id || null,
      )
      .run();

    const jobId = result.meta.last_row_id;

    // Handle chips
    if (
      data.chip_ids &&
      Array.isArray(data.chip_ids) &&
      data.chip_ids.length > 0
    ) {
      await updateJobChips(env, jobId, data.chip_ids);
    }

    // Handle bidirectional AI snapshot relationship
    if (data.snapshot_id) {
      const snapshotId = parseInt(data.snapshot_id);
      await updateAISnapshotJobRelationship(env, jobId, snapshotId);
    }

    return createResponse(
      {
        success: true,
        data: {
          id: jobId,
          ...data,
          location: data.location || [],
        },
      },
      201,
    );
  } catch (error) {
    console.error("Create job error:", error);
    return createResponse(
      {
        error: "Failed to create job",
        details: error.message,
      },
      500,
    );
  }
}

async function getJob(jobId, env, user) {
  try {
    const stmt = env.DB.prepare(`
      SELECT j.*, c.name as company_name, c.logo_url as company_logo_url, c.color as company_color,
      ai.job_title as snapshot_job_title
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN ai_snapshots ai ON j.snapshot_id = ai.id
      WHERE j.id = ?
    `);

    const job = await stmt.bind(jobId).first();

    if (!job) {
      return createResponse({ error: "Job not found" }, 404);
    }

    // Company admin can only view their company's jobs
    if (user.role === "company_admin" && job.company_id !== user.company_id) {
      return createResponse({ error: "Access denied" }, 403);
    }

    // Get chips for this job
    let chipResults = [];
    const chipStmt = env.DB.prepare(`
      SELECT 
        c.id,
        c.chip_key,
        c.chip_label,
        c.category,
        jc.display_order
      FROM job_chips jc
      INNER JOIN chips c ON jc.chip_id = c.id
      WHERE jc.job_id = ?
      ORDER BY jc.display_order
    `);

    const result = await chipStmt.bind(jobId).all();
    chipResults = result.results || [];

    // Parse location JSON array
    const {
      company_logo_url,
      company_color,
      company_name,
      snapshot_job_title,
      ...jobItem
    } = job;
    job.location = job.location ? JSON.parse(job.location) : [];
    job.chips = chipResults || [];
    job.company = {
      name: company_name,
      logo_url: company_logo_url,
      color: company_color,
    };
    job.ai_snapshot = snapshot_job_title
      ? {
          job_title: snapshot_job_title,
        }
      : null;
    delete job.company_logo_url;
    delete job.company_color;
    delete job.company_name;
    delete job.snapshot_job_title;

    return createResponse({ success: true, data: job });
  } catch (error) {
    console.error("Get job error:", error);
    return createResponse({ error: "Failed to fetch job" }, 500);
  }
}

async function updateJob(jobId, request, env, user) {
  try {
    const data = await request.json();

    // Check if job exists and user has permission
    const existingJob = await env.DB.prepare(
      "SELECT company_id FROM jobs WHERE id = ?",
    )
      .bind(jobId)
      .first();

    if (!existingJob) {
      return createResponse({ error: "Job not found" }, 404);
    }

    // Company admin can only update their company's jobs
    if (
      user.role === "company_admin" &&
      existingJob.company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    // Validate required fields
    if (!data.title) {
      return createResponse({ error: "Title is required" }, 400);
    }

    // Validate location array
    let locationJson = "[]";
    if (data.location) {
      if (Array.isArray(data.location)) {
        // Validate each location value
        const invalidLocations = data.location.filter(
          (loc) => !VALID_LOCATIONS.includes(loc),
        );
        if (invalidLocations.length > 0) {
          return createResponse(
            {
              error: `Invalid locations: ${invalidLocations.join(
                ", ",
              )}. Valid options are: ${VALID_LOCATIONS.join(", ")}`,
            },
            400,
          );
        }
        locationJson = JSON.stringify(data.location);
      } else {
        return createResponse({ error: "Location must be an array" }, 400);
      }
    }

    // Validate chip IDs if provided
    if (data.chip_ids && Array.isArray(data.chip_ids)) {
      if (data.chip_ids.length > 0) {
        let chipStmt;
        chipStmt = env.DB.prepare(`
          SELECT COUNT(*) as count FROM chips 
          WHERE id IN (${data.chip_ids
            .map(() => "?")
            .join(",")}) AND is_active = 1
        `);

        const { count } = await chipStmt.bind(...data.chip_ids).first();

        if (count !== data.chip_ids.length) {
          return createResponse(
            { error: "One or more chips are invalid or inactive" },
            400,
          );
        }
      }
    }

    // Clear existing relationships before updating job (to avoid UNIQUE constraint violation)
    if (data.snapshot_id !== undefined && data.snapshot_id) {
      const snapshotId = parseInt(data.snapshot_id);
      // Clear any existing job that has this snapshot_id (except the current job)
      await env.DB.prepare(
        `
        UPDATE jobs SET snapshot_id = NULL WHERE snapshot_id = ? AND id != ?
      `,
      )
        .bind(snapshotId, jobId)
        .run();
    }

    const stmt = env.DB.prepare(`
      UPDATE jobs 
      SET title = ?, employment_type = ?, location = ?, description = ?, snapshot_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = await stmt
      .bind(
        data.title,
        data.employment_type || null,
        locationJson,
        data.description || null,
        data.snapshot_id || null,
        jobId,
      )
      .run();

    if (result.changes === 0) {
      return createResponse({ error: "Job not found" }, 404);
    }

    // Handle chips update
    if (data.chip_ids !== undefined) {
      await updateJobChips(env, jobId, data.chip_ids || []);
    }

    // Handle bidirectional AI snapshot relationship
    if (data.snapshot_id !== undefined) {
      const snapshotId = data.snapshot_id ? parseInt(data.snapshot_id) : null;
      await updateAISnapshotJobRelationship(env, jobId, snapshotId);
    }

    return createResponse({
      success: true,
      data: {
        id: jobId,
        ...data,
        location: data.location || [],
      },
    });
  } catch (error) {
    console.error("Update job error:", error);
    return createResponse(
      {
        error: "Failed to update job",
        details: error.message,
      },
      500,
    );
  }
}

async function deleteJob(jobId, env, user) {
  try {
    // Check if job exists and user has permission
    const existingJob = await env.DB.prepare(
      "SELECT company_id FROM jobs WHERE id = ?",
    )
      .bind(jobId)
      .first();

    if (!existingJob) {
      return createResponse({ error: "Job not found" }, 404);
    }

    // Company admin can only delete their company's jobs
    if (
      user.role === "company_admin" &&
      existingJob.company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    const stmt = env.DB.prepare("DELETE FROM jobs WHERE id = ?");
    const result = await stmt.bind(jobId).run();

    // Clear any existing relationship for this job
    await env.DB.prepare(
      `
      UPDATE ai_snapshots SET parent_job_id = NULL WHERE parent_job_id = ?
    `,
    )
      .bind(jobId)
      .run();

    if (result.changes === 0) {
      return createResponse({ error: "Job not found" }, 404);
    }

    return createResponse({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Delete job error:", error);
    return createResponse(
      {
        error: "Failed to delete job",
        details: error.message,
      },
      500,
    );
  }
}

// Helper function to update job chips
async function updateJobChips(env, jobId, chipIds) {
  try {
    let deleteStmt, insertStmt;
    deleteStmt = env.DB.prepare(`DELETE FROM job_chips WHERE job_id = ?`);
    insertStmt = env.DB.prepare(`
      INSERT INTO job_chips (job_id, chip_id, display_order)
      VALUES (?, ?, ?)
    `);

    // Remove existing chips for this job
    await deleteStmt.bind(jobId).run();

    // Add new chips if any
    if (chipIds && chipIds.length > 0) {
      // Insert each chip with display order
      for (let i = 0; i < chipIds.length; i++) {
        await insertStmt.bind(jobId, chipIds[i], i).run();
      }
    }
  } catch (error) {
    console.error("Update job chips error:", error);
    throw error;
  }
}

// Helper function to maintain bidirectional AI snapshot relationship
async function updateAISnapshotJobRelationship(env, jobId, snapshotId) {
  try {
    if (snapshotId) {
      // Clear any existing relationship for this job (in ai_snapshots)
      await env.DB.prepare(
        `
        UPDATE ai_snapshots SET parent_job_id = NULL WHERE parent_job_id = ? AND id != ?
      `,
      )
        .bind(jobId, snapshotId)
        .run();

      // Set the bidirectional relationship in ai_snapshots
      await env.DB.prepare(
        `
        UPDATE ai_snapshots SET parent_job_id = ? WHERE id = ?
      `,
      )
        .bind(jobId, snapshotId)
        .run();
    } else {
      // Clear existing relationship for this job
      await env.DB.prepare(
        `
        UPDATE ai_snapshots SET parent_job_id = NULL WHERE parent_job_id = ?
      `,
      )
        .bind(jobId)
        .run();
    }
  } catch (error) {
    console.error("Update AI snapshot job relationship error:", error);
    throw error;
  }
}

// Cache invalidation helper for jobs
async function invalidateJobsCache(cache, user, env, jobId = null) {
  try {
    // Get job details if jobId provided to invalidate related caches
    let companyId = null;
    if (jobId) {
      const job = await env.DB.prepare(
        "SELECT company_id FROM jobs WHERE id = ?",
      )
        .bind(jobId)
        .first();
      companyId = job?.company_id;
    }

    // Patterns to invalidate
    const patterns = [
      `/api/admin/jobs`, // Jobs list
      `/api/admin/jobs/${jobId}`, // Specific job
      `/api/companies/slugs`, // Public companies (might include job counts)
    ];

    // Add company-specific patterns if we have a company ID
    if (companyId) {
      patterns.push(`/api/admin/jobs?company_id=${companyId}`);
    }

    // Add user-role specific patterns
    if (user.role === "company_admin" && user.company_id) {
      patterns.push(`/api/admin/jobs?company_id=${user.company_id}`);
    }

    // Delete cache entries (simple approach - in practice you'd use cache tags)
    for (const pattern of patterns) {
      const testUrl = new URL(`https://example.com${pattern}`);
      const testRequest = new Request(testUrl.toString());
      await cache.delete(testRequest);
    }

    // Cache invalidation completed
  } catch (error) {
    console.error("Cache invalidation error for jobs:", error);
    // Don't fail the main operation if cache invalidation fails
  }
}
