import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";

export async function handleChipsRequest(method, chipId, request, env, user) {
  const cache = new CloudflareCache(env);

  // Handle caching for GET requests
  if (method === "GET") {
    // Generate cache key that includes user context for security
    const url = new URL(request.url);
    const cacheKey = `${
      url.pathname
    }?${url.searchParams.toString()}&user_role=${user.role}`;

    // Try cache first for GET requests
    // const cached = await cache.get(request, cacheKey);
    // if (cached) {
    //   return cached;
    // }

    // Get fresh data
    let response;
    if (chipId) {
      response = await getChip(chipId, env, user);
    } else {
      response = await getChips(env, user, url);
    }

    return response;

    // // Cache successful responses with longer TTL for chips
    // if (response.status === 200) {
    //   const cacheSettings = {
    //     maxAge: 600, // 10 minutes browser cache
    //     sMaxAge: 3600, // 1 hour edge cache
    //     staleWhileRevalidate: 7200, // 2 hours stale allowed
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
      response = await createChip(request, env, user);
      if (response.status === 200 || response.status === 201) {
        await invalidateChipsCache(cache, user, env);
      }
      break;
    case "PUT":
      response = await updateChip(chipId, request, env, user);
      if (response.status === 200) {
        await invalidateChipsCache(cache, user, env, chipId);
      }
      break;
    case "DELETE":
      response = await deleteChip(chipId, env, user);
      if (response.status === 200) {
        await invalidateChipsCache(cache, user, env, chipId);
      }
      break;
    default:
      return createResponse({ error: "Method not allowed" }, 405);
  }

  return response;
}

// Chips CRUD implementations
async function getChips(env, user, url) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "50");
    const search = params.get("search") || "";
    const category = params.get("category") || "";

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
          () => "(chip_key LIKE ? OR chip_label LIKE ? OR description LIKE ?)",
        );
        whereConditions.push(`(${searchConditions.join(" OR ")})`);

        // Add parameters for each search term
        searchUnits.forEach((term) => {
          const searchTerm = `%${term}%`;
          queryParams.push(searchTerm, searchTerm, searchTerm);
        });
      }
    }

    // Category filtering
    if (category) {
      whereConditions.push("category = ?");
      queryParams.push(category);
    }

    // // Only active chips
    // whereConditions.push("is_active = ?");
    // queryParams.push(true);

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Try new chips table first, fallback to old chips table
    let tableName = "chips";
    let results = [];
    let total = 0;

    try {
      // Get total count
      const countStmt = env.DB.prepare(`
        SELECT COUNT(*) as total 
        FROM ${tableName}
        ${whereClause}
      `);
      total = (await countStmt.bind(...queryParams).first()).total;

      // Get paginated results
      const stmt = env.DB.prepare(`
        SELECT *
        FROM ${tableName}
        ${whereClause}
        ORDER BY category, chip_label
        LIMIT ? OFFSET ?
      `);

      const result = await stmt.bind(...queryParams, limit, offset).all();
      results = result.results || [];
    } catch (error) {
      console.log("New chips table not found, trying chips:", error.message);

      // Fallback to old chips table
      tableName = "chips";

      // Get total count
      const countStmt = env.DB.prepare(`
        SELECT COUNT(*) as total 
        FROM ${tableName}
        ${whereClause}
      `);
      total = (await countStmt.bind(...queryParams).first()).total;

      // Get paginated results
      const stmt = env.DB.prepare(`
        SELECT *
        FROM ${tableName}
        ${whereClause}
        ORDER BY category, chip_label
        LIMIT ? OFFSET ?
      `);

      const result = await stmt.bind(...queryParams, limit, offset).all();
      results = result.results || [];
    }

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
    console.error("Get chips error:", error);
    return createResponse({ error: "Failed to fetch chips" }, 500);
  }
}

async function createChip(request, env, user) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.chip_key || !data.chip_label) {
      return createResponse(
        {
          error: "Chip key and chip label are required",
        },
        400,
      );
    }

    // Validate chip_key format (alphanumeric and underscore only)
    if (!/^[a-z0-9_]+$/.test(data.chip_key)) {
      return createResponse(
        {
          error:
            "Chip key must contain only lowercase letters, numbers, and underscores",
        },
        400,
      );
    }

    // Try new chips table first, fallback to old chips table
    let tableName = "chips";
    let duplicateStmt, insertStmt;

    try {
      // Check for duplicate chip_key in new table
      duplicateStmt = env.DB.prepare(`
        SELECT id FROM ${tableName} WHERE chip_key = ?
      `);

      insertStmt = env.DB.prepare(`
        INSERT INTO ${tableName} (chip_key, chip_label, category, description)
        VALUES (?, ?, ?, ?)
      `);
    } catch (error) {
      console.log("New chips table not found, using chips");
      tableName = "chips";

      duplicateStmt = env.DB.prepare(`
        SELECT id FROM ${tableName} WHERE chip_key = ?
      `);

      insertStmt = env.DB.prepare(`
        INSERT INTO ${tableName} (chip_key, chip_label, category, description)
        VALUES (?, ?, ?, ?)
      `);
    }

    const duplicate = await duplicateStmt.bind(data.chip_key).first();

    if (duplicate) {
      return createResponse(
        {
          error: "A chip with this key already exists",
        },
        400,
      );
    }

    // Validate category if provided
    if (data.category) {
      const validCategories = [
        "availability",
        "skills",
        "certifications",
        "location",
        "experience",
        "other",
      ];
      if (!validCategories.includes(data.category)) {
        return createResponse(
          {
            error: `Invalid category. Valid options are: ${validCategories.join(
              ", ",
            )}`,
          },
          400,
        );
      }
    }

    const result = await insertStmt
      .bind(
        data.chip_key,
        data.chip_label,
        data.category || "other",
        data.description || null,
      )
      .run();

    return createResponse(
      {
        success: true,
        data: {
          id: result.meta.last_row_id,
          ...data,
          category: data.category || "other",
        },
      },
      201,
    );
  } catch (error) {
    console.error("Create chip error:", error);
    return createResponse(
      {
        error: "Failed to create chip",
        details: error.message,
      },
      500,
    );
  }
}

async function getChip(chipId, env, user) {
  try {
    let stmt, chip;

    // Try new chips table first, fallback to old chips table
    try {
      stmt = env.DB.prepare(`SELECT * FROM chips WHERE id = ?`);
      chip = await stmt.bind(chipId).first();
    } catch (error) {
      console.log("New chips table not found, trying chips");
      stmt = env.DB.prepare(`SELECT * FROM chips WHERE id = ?`);
      chip = await stmt.bind(chipId).first();
    }

    if (!chip) {
      return createResponse({ error: "Chip not found" }, 404);
    }

    return createResponse({ success: true, data: chip });
  } catch (error) {
    console.error("Get chip error:", error);
    return createResponse({ error: "Failed to fetch chip" }, 500);
  }
}

async function updateChip(chipId, request, env, user) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.chip_key || !data.chip_label) {
      return createResponse(
        {
          error: "Chip key and chip label are required",
        },
        400,
      );
    }

    // Validate chip_key format (alphanumeric and underscore only)
    if (!/^[a-z0-9_]+$/.test(data.chip_key)) {
      return createResponse(
        {
          error:
            "Chip key must contain only lowercase letters, numbers, and underscores",
        },
        400,
      );
    }

    // Try new chips table first, fallback to old chips table
    let tableName = "chips";
    let existingStmt, duplicateStmt, updateStmt;

    try {
      existingStmt = env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      duplicateStmt = env.DB.prepare(
        `SELECT id FROM ${tableName} WHERE chip_key = ? AND id != ?`,
      );
      updateStmt = env.DB.prepare(`
        UPDATE ${tableName} 
        SET chip_key = ?, chip_label = ?, category = ?, description = ?, 
            is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
    } catch (error) {
      console.log("New chips table not found, using chips");
      tableName = "chips";

      existingStmt = env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      duplicateStmt = env.DB.prepare(
        `SELECT id FROM ${tableName} WHERE chip_key = ? AND id != ?`,
      );
      updateStmt = env.DB.prepare(`
        UPDATE ${tableName} 
        SET chip_key = ?, chip_label = ?, category = ?, description = ?, 
            is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
    }

    // Check if chip exists
    const existingChip = await existingStmt.bind(chipId).first();

    if (!existingChip) {
      return createResponse({ error: "Chip not found" }, 404);
    }

    // Check for duplicate chip_key (excluding current chip)
    const duplicate = await duplicateStmt.bind(data.chip_key, chipId).first();

    if (duplicate) {
      return createResponse(
        {
          error: "A chip with this key already exists",
        },
        400,
      );
    }

    // Validate category if provided
    if (data.category) {
      const validCategories = [
        "availability",
        "skills",
        "certifications",
        "location",
        "experience",
        "other",
      ];
      if (!validCategories.includes(data.category)) {
        return createResponse(
          {
            error: `Invalid category. Valid options are: ${validCategories.join(
              ", ",
            )}`,
          },
          400,
        );
      }
    }

    const result = await updateStmt
      .bind(
        data.chip_key,
        data.chip_label,
        data.category || "other",
        data.description || null,
        data.is_active !== undefined ? data.is_active : true,
        chipId,
      )
      .run();

    if (result.changes === 0) {
      return createResponse({ error: "Chip not found" }, 404);
    }

    return createResponse({
      success: true,
      data: {
        id: chipId,
        ...data,
      },
    });
  } catch (error) {
    console.error("Update chip error:", error);
    return createResponse(
      {
        error: "Failed to update chip",
        details: error.message,
      },
      500,
    );
  }
}

async function deleteChip(chipId, env, user) {
  try {
    // Try new chips table first, fallback to old chips table
    let tableName = "chips";
    let existingStmt, usageStmt, deleteStmt;

    try {
      existingStmt = env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      usageStmt = env.DB.prepare(
        `SELECT COUNT(*) as usage_count FROM job_chips WHERE chip_id = ?`,
      );
      deleteStmt = env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    } catch (error) {
      console.log("New chips table not found, using chips");
      tableName = "chips";

      existingStmt = env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      // For old structure, check both old and new junction tables
      usageStmt = env.DB.prepare(`
        SELECT (
          COALESCE((SELECT COUNT(*) FROM job_offer_chips WHERE chip_key = ?), 0) +
          COALESCE((SELECT COUNT(*) FROM job_chips WHERE chip_id = ?), 0)
        ) as usage_count
      `);
      deleteStmt = env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    }

    // Check if chip exists
    const existingChip = await existingStmt.bind(chipId).first();

    if (!existingChip) {
      return createResponse({ error: "Chip not found" }, 404);
    }

    // Check if chip is being used in any jobs
    let usage_count = 0;
    if (tableName === "chips") {
      const result = await usageStmt.bind(chipId).first();
      usage_count = result.usage_count;
    } else {
      const result = await usageStmt
        .bind(existingChip.chip_key, chipId)
        .first();
      usage_count = result.usage_count;
    }

    if (usage_count > 0) {
      return createResponse(
        {
          error: `Cannot delete chip. It is currently being used in ${usage_count} job(s). Please remove it from all jobs first or deactivate the chip instead.`,
        },
        400,
      );
    }

    const result = await deleteStmt.bind(chipId).run();

    if (result.changes === 0) {
      return createResponse({ error: "Chip not found" }, 404);
    }

    return createResponse({
      success: true,
      message: "Chip deleted successfully",
    });
  } catch (error) {
    console.error("Delete chip error:", error);
    return createResponse(
      {
        error: "Failed to delete chip",
        details: error.message,
      },
      500,
    );
  }
}

// Get chips by category (public endpoint for forms)
export async function getChipsByCategory(env) {
  try {
    let stmt, results;

    // Try new chips table first, fallback to old chips table
    try {
      stmt = env.DB.prepare(`
        SELECT * FROM chips 
        WHERE is_active = 1 
        ORDER BY category, chip_label
      `);
      const result = await stmt.all();
      results = result.results || [];
    } catch (error) {
      console.log("New chips table not found, trying chips");
      stmt = env.DB.prepare(`
        SELECT * FROM chips 
        WHERE is_active = 1 
        ORDER BY category, chip_label
      `);
      const result = await stmt.all();
      results = result.results || [];
    }

    // Group by category
    const grouped = results.reduce((acc, chip) => {
      const category = chip.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(chip);
      return acc;
    }, {});

    return createResponse({
      success: true,
      data: grouped,
    });
  } catch (error) {
    console.error("Get chips by category error:", error);
    return createResponse({ error: "Failed to fetch chips" }, 500);
  }
}

// Cache invalidation helper for chips
async function invalidateChipsCache(cache, user, env, chipId = null) {
  try {
    // Patterns to invalidate
    const patterns = [
      `/api/admin/chips`, // Chips list
      `/api/admin/chips/${chipId}`, // Specific chip
      `/api/chips/categories`, // Public categories endpoint
      `/api/admin/jobs`, // Job forms that use chips
    ];

    // Delete cache entries
    for (const pattern of patterns) {
      const testUrl = new URL(`https://example.com${pattern}`);
      const testRequest = new Request(testUrl.toString());
      await cache.delete(testRequest);
    }

    // Cache invalidation completed
  } catch (error) {
    console.error("Cache invalidation error for chips:", error);
    // Don't fail the main operation if cache invalidation fails
  }
}
