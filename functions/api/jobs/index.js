import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";
import { COUNTRY_LABELS, CREDIT_PRICE } from "../../utils/const.js";
import { getLocationDetails, getCountryCode } from "../../utils/index.js";
import { verifyJWT } from "../../utils/jwt.js";

export async function handleJobsRequest(request, env) {
  const cache = new CloudflareCache(env);
  const url = new URL(request.url);

  const { chosenCity, countryName, locationText } = getLocationDetails(request);

  // If country is NOT explicitly in the query, add geo variation to cache key and Vary.
  const cacheKey = `${
    url.pathname
  }?${url.searchParams.toString()}&country=${countryName}&city=${chosenCity}`;

  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const jobId = pathParts[2];
  const action = pathParts[3]; // For actions like "unlock"

  // Handle different HTTP methods
  if (method === "GET") {
    // GET requests are public and cacheable
  } else if (method === "POST") {
    // POST requests require authentication and are not cacheable
    if (action === "unlock" && jobId) {
      return await handleJobUnlock(request, env, jobId);
    } else if (action === "status" && jobId) {
      return await handleJobStatus(request, env, jobId, countryName);
    } else {
      return createResponse({ error: "Invalid POST action" }, 400);
    }
  } else {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  let response;
  if (jobId) {
    if (jobId === "unlocked") {
      return await getUnlockedJobs(request, env, url);
    }
    response = await getJob(jobId, env, chosenCity, countryName, locationText);
  } else {
    const cached = await cache.get(request, cacheKey);
    if (cached) return cached;

    response = await getJobs(env, url, locationText, chosenCity, countryName);
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

async function getJobs(env, url, locationText, chosenCity, countryName) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "20", 10);
    const search = params.get("search") || "";
    const company_id = params.get("company_id") || "";
    const employment_type = params.get("employment_type") || "";

    const offset = (page - 1) * limit;
    const where = [];
    const bind = [];

    const country = COUNTRY_LABELS[countryName] || countryName;

    if (search) {
      const terms = search
        .split(/\s*,\s*/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (terms.length) {
        const blocks = terms.map(
          () => "(j.title LIKE ? OR j.employment_type LIKE ? OR c.name LIKE ?)",
        );
        where.push(`(${blocks.join(" OR ")})`);
        for (const t of terms) {
          const like = `%${t}%`;
          bind.push(like, like, like);
        }
      }
    }

    if (country) {
      // Simple LIKE on the location JSON string (location is stored as JSON array of names)
      where.push("(j.location LIKE ?)");
      bind.push(`%${country}%`);
    }

    if (company_id) {
      where.push("j.company_id = ?");
      bind.push(company_id);
    }

    if (employment_type) {
      where.push("j.employment_type = ?");
      bind.push(employment_type);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Count
    const { total } = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM jobs j LEFT JOIN companies c ON j.company_id = c.id ${whereClause}`,
    )
      .bind(...bind)
      .first();

    // Page
    const { results } = await env.DB.prepare(
      `
        SELECT j.*, c.name as company_name, c.logo_url as company_logo_url, c.color as company_color,
               ai.job_title as snapshot_job_title
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        LEFT JOIN ai_snapshots ai ON j.snapshot_id = ai.id
        ${whereClause}
        ORDER BY j.created_at DESC
        LIMIT ? OFFSET ?
      `,
    )
      .bind(...bind, limit, offset)
      .all();

    // Chips per job
    const jobIds = results.map((j) => j.id);
    const chipsByJob = {};
    if (jobIds.length) {
      const placeholders = jobIds.map(() => "?").join(",");
      const chipRes = await env.DB.prepare(
        `
          SELECT jc.job_id, c.id, c.chip_key, c.chip_label, c.category, jc.display_order
          FROM job_chips jc
          INNER JOIN chips c ON jc.chip_id = c.id
          WHERE jc.job_id IN (${placeholders})
          ORDER BY jc.job_id, jc.display_order
        `,
      )
        .bind(...jobIds)
        .all();
      for (const row of chipRes.results || []) {
        if (!chipsByJob[row.job_id]) chipsByJob[row.job_id] = [];
        chipsByJob[row.job_id].push({
          id: row.id,
          chip_key: row.chip_key,
          chip_label: row.chip_label,
          category: row.category,
          display_order: row.display_order,
        });
      }
    }

    // Format jobs
    const jobs = results.map((job) => {
      const {
        company_logo_url,
        company_color,
        company_name,
        snapshot_job_title,
        ...rest
      } = job;
      return {
        ...rest,
        location: job.location ? JSON.parse(job.location) : [],
        chips: chipsByJob[job.id] || [],
        company: {
          name: company_name,
          logo_url: company_logo_url,
          color: company_color,
        },
        ai_snapshot: snapshot_job_title
          ? { job_title: snapshot_job_title }
          : null,
      };
    });

    const totalPages = Math.ceil(total / limit);
    return createResponse({
      success: true,
      data: { jobs, chosenCity, countryName: country, locationText },
      meta: { pagination: { page, limit, total, totalPages } },
    });
  } catch (err) {
    console.error("Get jobs error:", err);
    return createResponse({ error: "Failed to fetch jobs" }, 500);
  }
}

async function getJob(jobId, env, chosenCity, countryName, locationText) {
  try {
    const t0 = Date.now();

    const row = await env.DB.prepare(
      `
      SELECT
        j.*,
        (SELECT json_object(
          'id', c.id, 'name', c.name, 'short_description', c.short_description,
          'full_description', c.full_description, 'location', c.location,
          'is_active', c.is_active, 'logo_url', c.logo_url, 'color', c.color,
          'created_at', c.created_at, 'updated_at', c.updated_at
        ) FROM companies c WHERE c.id = j.company_id) AS company_json,
        (SELECT json_group_array(
           json_object(
             'id', cj.id, 'parent_job_id', cj.parent_job_id, 'title', cj.title,
             'city', cj.city, 'country', cj.country, 'link', cj.link, 'source', cj.source,
             'is_active', cj.is_active, 'created_at', cj.created_at, 'updated_at', cj.updated_at
           )
         ) FROM (SELECT * FROM child_jobs WHERE parent_job_id = j.id ORDER BY created_at DESC) cj
        ) AS child_jobs_json,
        (SELECT json_object(
           'id', ai.id, 'job_title', ai.job_title, 'city', ai.city, 'country', ai.country,
           'employment_type', ai.employment_type, 'market_insights', ai.market_insights,
           'salary_range', ai.salary_range, 'required_skills', ai.required_skills,
           'application_tips', ai.application_tips, 'company_specific_tips', ai.company_specific_tips,
           'priority', ai.priority, 'is_active', ai.is_active, 'created_at', ai.created_at, 'updated_at', ai.updated_at
         ) FROM ai_snapshots ai
         WHERE ai.parent_job_id = j.id
         ORDER BY ai.priority DESC, ai.created_at DESC
         LIMIT 1
        ) AS ai_snapshot_json,
        (SELECT json_group_array(
           json_object(
             'id', ch.id, 'chip_key', ch.chip_key, 'chip_label', ch.chip_label,
             'category', ch.category, 'display_order', jc.display_order
           )
         ) FROM (SELECT * FROM job_chips WHERE job_id = j.id ORDER BY display_order) jc
         JOIN chips ch ON ch.id = jc.chip_id
        ) AS chips_json,
        (SELECT json_group_array(
           json_object(
             'id', ct.id, 'company_id', ct.company_id, 'name', ct.name, 'position', ct.position,
             'email', ct.email, 'whatsapp', ct.whatsapp, 'phone', ct.phone,
             'city', ct.city, 'location', ct.location, 'created_at', ct.created_at, 'updated_at', ct.updated_at
           )
         ) FROM (SELECT * FROM contacts WHERE company_id = j.company_id ORDER BY created_at DESC) ct
        ) AS contacts_json
      FROM jobs j
      WHERE j.id = ?
    `,
    )
      .bind(jobId)
      .first();

    if (!row) return createResponse({ error: "Job not found" }, 404);

    // Safe JSON helpers
    const parse = (v, fb) => {
      if (v == null) return fb;
      try {
        return JSON.parse(v);
      } catch {
        return fb;
      }
    };
    const parseArray = (v) => {
      const a = parse(v, []);
      return Array.isArray(a) ? a : [];
    };

    // Company
    const company = parse(row.company_json, null) || {
      id: null,
      name: "",
      short_description: "",
      full_description: "",
      location: "[]",
      is_active: null,
      logo_url: "",
      color: "",
      created_at: null,
      updated_at: null,
    };
    company.location = parseArray(company.location);

    // Child jobs
    const childJobs = parseArray(row.child_jobs_json).map((cj) => ({
      ...cj,
      ageHours: Math.floor(
        (Date.now() - new Date(cj.created_at).getTime()) / 3600000,
      ),
    }));

    // AI snapshot
    const aiRaw = parse(row.ai_snapshot_json, null);
    const aiSnapshot = aiRaw
      ? {
          ...aiRaw,
          market_insights: parse(aiRaw.market_insights, null),
          salary_range: parse(aiRaw.salary_range, null),
          required_skills: parse(aiRaw.required_skills, null),
        }
      : null;

    // Contacts
    const contacts = parseArray(row.contacts_json)
      .map((ct) => ({
        ...ct,
        location: parseArray(ct.location),
      }))
      .filter((ct) => ct.location.includes(countryName));

    // Chips
    const chips = parseArray(row.chips_json);

    // Job object
    const job = { ...row, location: parseArray(row.location), company };
    delete job.company_json;
    delete job.child_jobs_json;
    delete job.ai_snapshot_json;
    delete job.contacts_json;
    delete job.chips_json;

    const payload = {
      success: true,
      data: {
        job,
        company,
        childJobs,
        aiSnapshot,
        contacts,
        chips,
        locationText,
      },
    };
    const dur = Date.now() - t0;

    return createResponse(payload, 200, {
      "Server-Timing": `d1;desc=single-select;dur=${dur}`,
    });
  } catch (err) {
    console.error("Get job error:", err);
    return createResponse({ error: "Failed to fetch job" }, 500);
  }
}

/**
 * Handle job unlock request - reduces user credits and marks job as unlocked
 */
async function handleJobUnlock(request, env, jobId) {
  const cache = new CloudflareCache(env);

  try {
    // Verify JWT token
    const authResult = await verifyJWT(request, env);
    if (!authResult || !authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const user = authResult.payload;

    if (!jobId) {
      return createResponse({ error: "Job ID is required" }, 400);
    }

    // Check if job exists
    const job = await env.DB.prepare(
      `SELECT id, title, company_id FROM jobs WHERE id = ?`,
    )
      .bind(jobId)
      .first();

    if (!job) {
      return createResponse({ error: "Job not found" }, 404);
    }

    const { contactId: contact_id, chips } = await request.json();
    const presetChipsJson = JSON.stringify(chips);

    const contact = await env.DB.prepare(`SELECT id FROM contacts WHERE id = ?`)
      .bind(contact_id)
      .first();

    if (!contact) {
      return createResponse({ error: "Contact not found" }, 404);
    }

    // Check if already unlocked
    const existing = await env.DB.prepare(
      `SELECT id, status FROM user_job_applications WHERE user_id = ? AND job_id = ? AND contact_id = ?`,
    )
      .bind(user.id, jobId, contact_id)
      .first();

    if (existing && existing.status !== "locked") {
      return createResponse({
        success: true,
        alreadyUnlocked: true,
        message: "Job already unlocked",
        status: existing.status,
      });
    }

    // Check user credits
    const userRow = await env.DB.prepare(
      `SELECT credits FROM users WHERE id = ?`,
    )
      .bind(user.id)
      .first();

    if (!userRow || userRow.credits < 1) {
      return createResponse(
        {
          error: "Insufficient credits",
          userCredits: userRow?.credits || 0,
          requiredCredits: 1,
        },
        402,
      );
    }

    // Start transaction by deducting credit and updating/inserting application record
    const now = new Date().toISOString();

    // Deduct credit from user
    await env.DB.prepare(
      `UPDATE users SET credits = credits - 1, updated_at = ? WHERE id = ?`,
    )
      .bind(now, user.id)
      .run();

    // Insert or update application record
    if (existing) {
      // Update existing record
      await env.DB.prepare(
        `UPDATE user_job_applications
         SET status = 'unlocked', credits_spent = 1, unlocked_at = ?, updated_at = ?, user_id = ?, job_id = ?, contact_id = ?, preset_chips = ?
         WHERE user_id = ? AND job_id = ? AND contact_id = ?`,
      )
        .bind(
          now,
          now,
          user.id,
          jobId,
          contact_id,
          presetChipsJson,
          user.id,
          jobId,
          contact_id,
        )
        .run();
    } else {
      // Insert new record
      await env.DB.prepare(
        `INSERT INTO user_job_applications (user_id, job_id, contact_id, status, credits_spent, unlocked_at, created_at, updated_at, preset_chips)
         VALUES (?, ?, ?, 'unlocked', 1, ?, ?, ?, ?)`,
      )
        .bind(user.id, jobId, contact_id, now, now, now, presetChipsJson)
        .run();
    }

    // Get updated user credits
    const updatedUser = await env.DB.prepare(
      `SELECT credits FROM users WHERE id = ?`,
    )
      .bind(user.id)
      .first();

    // Record credit transaction
    const applicationId = existing?.id || null;
    await env.DB.prepare(
      `INSERT INTO credit_transactions (
        user_id, type, amount, balance_after, description,
        reference_type, reference_id, created_at
      ) VALUES (?, 'use', ?, ?, ?, 'job_unlock', ?, ?)`,
    )
      .bind(
        user.id,
        -1,
        updatedUser?.credits || 0,
        `Desbloqueo de contacto para trabajo: ${job.title}`,
        applicationId,
        now,
      )
      .run();

    // Invalidate relevant caches
    await invalidateJobCache(cache, user, jobId);

    return createResponse({
      success: true,
      message: "Job unlocked successfully",
      remainingCredits: updatedUser?.credits || 0,
      creditsSpent: 1,
      jobId: parseInt(jobId),
      contactId: parseInt(contact_id),
      status: "unlocked",
    });
  } catch (error) {
    console.error("Job unlock error:", error);
    return createResponse({ error: "Failed to unlock job" }, 500);
  }
}

/**
 * Handle job status check request - returns the current status of a job for a user
 */
async function handleJobStatus(request, env, jobId, countryName) {
  try {
    // Verify JWT token
    const authResult = await verifyJWT(request, env);
    if (!authResult || !authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const user = authResult.payload;

    if (!jobId) {
      return createResponse({ error: "Job ID is required" }, 400);
    }

    // Check if job exists
    const job = await env.DB.prepare(`SELECT id FROM jobs WHERE id = ?`)
      .bind(jobId)
      .first();

    if (!job) {
      return createResponse({ error: "Job not found" }, 404);
    }

    const { contactId: contact_id } = await request.json();

    const contact = await env.DB.prepare(`SELECT id FROM contacts WHERE id = ?`)
      .bind(contact_id)
      .first();

    if (!contact) {
      return createResponse({ error: "Contact not found" }, 404);
    }

    // Get user's application status for this job
    const application = await env.DB.prepare(
      `SELECT status, credits_spent, unlocked_at, applied_at, response_at, notes, created_at, updated_at, preset_chips
       FROM user_job_applications
       WHERE user_id = ? AND job_id = ? AND contact_id = ?`,
    )
      .bind(user.id, jobId, contact_id)
      .first();

    // Get user's current credits
    const userRow = await env.DB.prepare(
      `SELECT credits FROM users WHERE id = ?`,
    )
      .bind(user.id)
      .first();

    const userCredits = userRow?.credits || 0;
    const status = application?.status || "locked";

    return createResponse({
      success: true,
      jobId: parseInt(jobId),
      contactId: parseInt(contact_id),
      status: status,
      userCredits: userCredits,
      canUnlock: status === "locked",
      application: application
        ? {
            status: application.status,
            creditsSpent: application.credits_spent,
            unlockedAt: application.unlocked_at,
            appliedAt: application.applied_at,
            responseAt: application.response_at,
            notes: application.notes,
            createdAt: application.created_at,
            updatedAt: application.updated_at,
            presetChips: JSON.parse(application.preset_chips) || [],
          }
        : null,
    });
  } catch (error) {
    console.error("Job status error:", error);
    return createResponse({ error: "Failed to get job status" }, 500);
  }
}

/**
 * Invalidate user-specific job-related caches
 */
async function invalidateJobCache(cache, user, jobId) {
  try {
    // Invalidate job-specific cache for this user
    const jobCacheKey = `job:${jobId}:user:${user.id}`;
    await cache.delete(jobCacheKey);

    // Invalidate user's jobs list cache
    const userJobsCacheKey = `jobs:user:${user.id}`;
    await cache.delete(userJobsCacheKey);

    // Could add more cache invalidation patterns here as needed
  } catch (error) {
    console.error("Cache invalidation error:", error);
    // Don't fail the main operation if cache invalidation fails
  }
}

async function getUnlockedJobs(request, env, url) {
  const authResult = await verifyJWT(request, env);
  if (!authResult || !authResult.valid) {
    return createResponse({ error: "Unauthorized" }, 401);
  }

  const user = authResult.payload;
  const stmtJobApplications = await env.DB.prepare(
    `SELECT * FROM user_job_applications WHERE user_id = ? AND status != 'locked'`,
  )
    .bind(user.id)
    .all();

  const { results: jobApplications } = stmtJobApplications;

  const jobsIds = jobApplications.map((ja) => ja.job_id);

  const stmtJobs = await env.DB.prepare(`SELECT * FROM jobs WHERE id IN (?)`)
    .bind(jobsIds.join(","))
    .all();

  const { results: jobsResult } = stmtJobs;

  const stmtCompanies = await env.DB.prepare(
    `SELECT * FROM companies WHERE id IN (?)`,
  )
    .bind(jobsResult.map((job) => job.company_id).join(","))
    .all();

  const { results: companiesResult } = stmtCompanies;

  const jobs = jobsResult.map((job) => {
    return {
      ...job,
      company: companiesResult.find((company) => company.id === job.company_id),
      status:
        jobApplications.find((ja) => ja.job_id === job.id)?.status ||
        "unlocked",
    };
  });

  return createResponse({ success: true, data: { jobs } });
}
