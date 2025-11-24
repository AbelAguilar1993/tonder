import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";

// Helper function to validate and normalize location data
function validateAndNormalizeLocation(location) {
  if (!location) {
    return { success: true, locationJson: "[]" };
  }

  // If location is a string, try to parse it as JSON first
  if (typeof location === "string") {
    try {
      location = JSON.parse(location);
    } catch {
      // If it's not JSON, treat as single location
      location = [location];
    }
  }

  // Ensure it's an array
  if (!Array.isArray(location)) {
    return {
      success: false,
      error: "Location must be an array",
      details: `Received: ${typeof location}, Value: ${JSON.stringify(
        location,
      )}`,
    };
  }

  // Validate each location value
  const validLocations = [
    "México",
    "Peru",
    "Argentina",
    "Chile",
    "Colombia",
    "Ecuador",
    "Uruguay",
  ];
  const invalidLocations = location.filter(
    (loc) => !validLocations.includes(loc),
  );
  if (invalidLocations.length > 0) {
    return {
      success: false,
      error: `Invalid locations: ${invalidLocations.join(
        ", ",
      )}. Valid options are: ${validLocations.join(", ")}`,
    };
  }

  return { success: true, locationJson: JSON.stringify(location) };
}

// Companies CRUD (Super Admin only)
export async function handleCompaniesRequest(
  method,
  companyId,
  request,
  env,
  user,
) {
  // Check admin role (allow both super_admin and company_admin)
  if (!["super_admin", "company_admin"].includes(user.role)) {
    return createResponse({ error: "Admin access required" }, 403);
  }

  const cache = new CloudflareCache(env);

  // Handle caching for GET requests
  if (method === "GET") {
    // Generate cache key for super admin
    const url = new URL(request.url);
    const cacheKey = `${
      url.pathname
    }?${url.searchParams.toString()}&admin=super`;

    // Try cache first
    const cached = await cache.get(request, cacheKey);
    if (cached) {
      return cached;
    }

    // Get fresh data
    let response;
    if (companyId) {
      response = await getCompany(companyId, env);
    } else {
      response = await getCompanies(env, url);
    }

    // Cache successful responses
    if (response.status === 200) {
      const cacheSettings = {
        maxAge: 300, // 5 minutes browser cache
        sMaxAge: 900, // 15 minutes edge cache (companies change less frequently)
        staleWhileRevalidate: 1800, // 30 minutes stale allowed
        publicCache: false, // Private cache for admin data
      };
      response = await cache.put(request, response, {
        ...cacheSettings,
        customKey: cacheKey,
      });
    }

    return response;
  }

  // Handle non-GET requests (with cache invalidation)
  let response;
  switch (method) {
    case "POST":
      response = await createCompany(request, env, user);
      if (response.status === 200 || response.status === 201) {
        await invalidateCompaniesCache(cache, env);
      }
      break;
    case "PUT":
      response = await updateCompany(companyId, request, env, user);
      if (response.status === 200) {
        await invalidateCompaniesCache(cache, env, companyId);
      }
      break;
    case "DELETE":
      response = await deleteCompany(companyId, env);
      if (response.status === 200) {
        await invalidateCompaniesCache(cache, env, companyId);
      }
      break;
    default:
      return createResponse({ error: "Method not allowed" }, 405);
  }

  return response;
}

// Company CRUD implementations
async function getCompanies(env, url) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "20");
    const search = params.get("search") || "";
    const status = params.get("status") || "";

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push(
        "(name LIKE ? OR short_description LIKE ? OR full_description LIKE ? OR location LIKE ?)",
      );
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      if (status === "active") {
        whereConditions.push("is_active = 1");
      } else if (status === "inactive") {
        whereConditions.push("is_active = 0");
      }
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countStmt = env.DB.prepare(`
      SELECT COUNT(*) as total FROM companies ${whereClause}
    `);
    const { total } = await countStmt.bind(...queryParams).first();

    // Get paginated results
    const stmt = env.DB.prepare(`
      SELECT id, name, short_description, full_description, location, is_active, logo_url, color, created_at, updated_at
      FROM companies 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    // Get the companies
    const { results } = await stmt.bind(...queryParams, limit, offset).all();

    // Jobs count statement
    const jobsCountStmt = env.DB.prepare(`
      SELECT COUNT(*) as total FROM jobs j LEFT JOIN companies c ON j.company_id = c.id WHERE c.id = ?
    `);
    // Contacts count statement
    const contactsCountStmt = env.DB.prepare(`
      SELECT COUNT(*) as total FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE co.id = ?
    `);

    // Format results - parse location JSON array
    const companies = await Promise.all(
      results.map(async (company) => {
        const jobsCount = await jobsCountStmt.bind(company.id).first();
        const contactsCount = await contactsCountStmt.bind(company.id).first();
        return {
          ...company,
          location: company.location ? JSON.parse(company.location) : [],
          jobs_count: jobsCount?.total || 0,
          contacts_count: contactsCount?.total || 0,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return createResponse({
      success: true,
      data: companies,
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
    return createResponse({ error: "Failed to fetch companies" }, 500);
  }
}

async function getCompany(companyId, env) {
  try {
    const stmt = env.DB.prepare(`
      SELECT id, name, short_description, full_description, location, is_active, logo_url, color, created_at, updated_at
      FROM companies 
      WHERE id = ?
    `);

    const company = await stmt.bind(companyId).first();

    if (!company) {
      return createResponse({ error: "Company not found" }, 404);
    }

    // Parse location JSON array
    company.location = company.location ? JSON.parse(company.location) : [];

    // Jobs count statement
    const jobsCountStmt = env.DB.prepare(`
      SELECT COUNT(*) as total FROM jobs j LEFT JOIN companies c ON j.company_id = c.id WHERE c.id = ?
    `);
    // Contacts count statement
    const contactsCountStmt = env.DB.prepare(`
      SELECT COUNT(*) as total FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE co.id = ?
    `);

    const jobsCount = await jobsCountStmt.bind(company.id).first();
    const contactsCount = await contactsCountStmt.bind(company.id).first();

    company.jobs_count = jobsCount?.total || 0;
    company.contacts_count = contactsCount?.total || 0;

    return createResponse({ success: true, data: company });
  } catch (error) {
    return createResponse({ error: "Failed to fetch company" }, 500);
  }
}

async function createCompany(request, env, user) {
  try {
    const contentType = request.headers.get("content-type");
    let data;

    // Handle both JSON and FormData (for file uploads)
    if (contentType && contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = {};

      // Extract text fields
      for (const [key, value] of formData.entries()) {
        if (key !== "logo") {
          // Parse location as JSON array if present
          if (key === "location" && value) {
            try {
              data[key] = JSON.parse(value);
            } catch {
              data[key] = [value]; // Fallback to single item array
            }
          } else {
            data[key] = value;
          }
        }
      }

      // Handle logo file upload
      const logoFile = formData.get("logo");
      if (logoFile && logoFile instanceof File) {
        // Import upload utilities
        const { uploadFile, validateFile } = await import(
          "../../utils/storage.js"
        );

        // Validate logo file
        const validation = validateFile(
          logoFile,
          ["image/jpeg", "image/png", "image/gif", "image/webp"],
          2 * 1024 * 1024,
        );
        if (!validation.valid) {
          return createResponse(
            {
              error: "Logo validation failed",
              details: validation.errors,
            },
            400,
          );
        }

        // Generate unique key for logo
        const timestamp = Date.now();
        const fileExtension = logoFile.name.split(".").pop();
        const fileName = `${timestamp}-${Math.random()
          .toString(36)
          .substring(2)}.${fileExtension}`;
        const key = `logos/${fileName}`;

        // Upload logo to R2
        try {
          const uploadResult = await uploadFile(env, key, logoFile, {
            contentType: logoFile.type,
            customMetadata: {
              originalName: logoFile.name,
              uploadedBy: user.id.toString(),
              entityType: "company_logo",
              uploadedAt: new Date().toISOString(),
            },
          });

          data.logo_url = uploadResult.url;
        } catch (uploadError) {
          return createResponse(
            {
              error: "Failed to upload logo",
              details: uploadError.message,
            },
            500,
          );
        }
      }
    } else {
      data = await request.json();
    }

    // Validate required fields
    if (!data.name) {
      return createResponse({ error: "Company name is required" }, 400);
    }

    // Validate location array
    const locationValidation = validateAndNormalizeLocation(data.location);
    if (!locationValidation.success) {
      return createResponse(
        {
          error: locationValidation.error,
          details: locationValidation.details,
        },
        400,
      );
    }
    const locationJson = locationValidation.locationJson;

    const stmt = env.DB.prepare(`
      INSERT INTO companies (name, short_description, full_description, location, is_active, logo_url, color, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Ensure no undefined values for D1
    const params = [
      data.name || "",
      data.short_description || "",
      data.full_description || "",
      locationJson,
      data.is_active,
      data.logo_url || "",
      data.color || "",
      user.id || null,
    ];

    const result = await stmt.bind(...params).run();

    const responseData = {
      id: result.meta.last_row_id,
      ...data,
      location: data.location || [],
    };

    return createResponse(
      {
        success: true,
        data: responseData,
      },
      201,
    );
  } catch (error) {
    return createResponse(
      {
        error: "Failed to create company",
        details: error.message,
        stack: error.stack,
      },
      500,
    );
  }
}

async function updateCompany(companyId, request, env, user) {
  try {
    const contentType = request.headers.get("content-type");
    let data;

    // Handle both JSON and FormData (for file uploads)
    if (contentType && contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = {};

      // Extract text fields
      for (const [key, value] of formData.entries()) {
        if (key !== "logo") {
          // Parse location as JSON array if present
          if (key === "location" && value) {
            try {
              data[key] = JSON.parse(value);
            } catch {
              data[key] = [value]; // Fallback to single item array
            }
          } else {
            data[key] = value;
          }
        }
      }

      // Handle logo file upload
      const logoFile = formData.get("logo");
      if (logoFile && logoFile instanceof File) {
        // Import upload utilities
        const { uploadFile, validateFile } = await import(
          "../../utils/storage.js"
        );

        // Validate logo file
        const validation = validateFile(
          logoFile,
          ["image/jpeg", "image/png", "image/gif", "image/webp"],
          2 * 1024 * 1024,
        );
        if (!validation.valid) {
          return createResponse(
            {
              error: "Logo validation failed",
              details: validation.errors,
            },
            400,
          );
        }

        // Generate unique key for logo
        const timestamp = Date.now();
        const fileExtension = logoFile.name.split(".").pop();
        const fileName = `${timestamp}-${Math.random()
          .toString(36)
          .substring(2)}.${fileExtension}`;
        const key = `logos/${fileName}`;

        // Upload logo to R2
        try {
          const uploadResult = await uploadFile(env, key, logoFile, {
            contentType: logoFile.type,
            customMetadata: {
              originalName: logoFile.name,
              uploadedBy: user.id.toString(),
              entityType: "company_logo",
              entityId: companyId.toString(),
              uploadedAt: new Date().toISOString(),
            },
          });

          data.logo_url = uploadResult.url;
        } catch (uploadError) {
          return createResponse(
            {
              error: "Failed to upload logo",
              details: uploadError.message,
            },
            500,
          );
        }
      }
    } else {
      data = await request.json();
    }

    // Validate required fields
    if (!data.name) {
      return createResponse({ error: "Company name is required" }, 400);
    }

    // Validate location array
    const locationValidation = validateAndNormalizeLocation(data.location);
    if (!locationValidation.success) {
      return createResponse(
        {
          error: locationValidation.error,
          details: locationValidation.details,
        },
        400,
      );
    }
    const locationJson = locationValidation.locationJson;

    const stmt = env.DB.prepare(`
      UPDATE companies 
      SET name = ?, short_description = ?, full_description = ?, location = ?, is_active = ?, logo_url = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = await stmt
      .bind(
        data.name,
        data.short_description || "",
        data.full_description || "",
        locationJson,
        data.is_active,
        data.logo_url || "",
        data.color || "",
        companyId,
      )
      .run();

    if (result.changes === 0) {
      return createResponse({ error: "Company not found" }, 404);
    }

    const responseData = {
      id: companyId,
      ...data,
      location: data.location || [],
    };

    return createResponse({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return createResponse({ error: "Failed to update company" }, 500);
  }
}

async function deleteCompany(companyId, env) {
  try {
    // Check if company has related jobs
    const jobsStmt = env.DB.prepare(
      "SELECT COUNT(*) as count FROM jobs WHERE company_id = ?",
    );
    const { count } = await jobsStmt.bind(companyId).first();

    if (count > 0) {
      return createResponse(
        {
          error:
            "Cannot delete company with existing jobs. Please delete or reassign jobs first.",
        },
        400,
      );
    }

    const stmt = env.DB.prepare("DELETE FROM companies WHERE id = ?");
    const result = await stmt.bind(companyId).run();

    if (result.changes === 0) {
      return createResponse({ error: "Company not found" }, 404);
    }

    return createResponse({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    return createResponse({ error: "Failed to delete company" }, 500);
  }
}

// Cache invalidation helper for companies
async function invalidateCompaniesCache(cache, env, companyId = null) {
  try {
    // Patterns to invalidate
    const patterns = [
      `/api/admin/companies`, // Admin companies list
      `/api/companies/slugs`, // Public companies slugs
    ];

    // Add specific company patterns
    if (companyId) {
      patterns.push(`/api/admin/companies/${companyId}`);
      // Also invalidate related jobs and contacts
      patterns.push(`/api/admin/jobs?company_id=${companyId}`);
      patterns.push(`/api/admin/contacts?company_id=${companyId}`);
    }

    // Delete cache entries
    for (const pattern of patterns) {
      const testUrl = new URL(`https://example.com${pattern}`);
      const testRequest = new Request(testUrl.toString());
      await cache.delete(testRequest);
    }

    // Cache invalidation completed
  } catch (error) {
    console.error("Cache invalidation error for companies:", error);
    // Don't fail the main operation if cache invalidation fails
  }
}
