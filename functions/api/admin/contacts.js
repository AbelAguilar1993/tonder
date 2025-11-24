import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";

export async function handleContactsRequest(
  method,
  contactId,
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
    const cached = await cache.get(request, cacheKey);
    if (cached) {
      return cached;
    }

    // Get fresh data
    let response;
    if (contactId) {
      response = await getContact(contactId, env, user);
    } else {
      response = await getContacts(env, user, url);
    }

    // Cache successful responses with shorter TTL for contacts data
    if (response.status === 200) {
      const cacheSettings = {
        maxAge: 240, // 4 minutes browser cache
        sMaxAge: 720, // 12 minutes edge cache
        staleWhileRevalidate: 1440, // 24 minutes stale allowed
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
      response = await createContact(request, env, user);
      if (response.status === 200 || response.status === 201) {
        await invalidateContactsCache(cache, user, env);
      }
      break;
    case "PUT":
      response = await updateContact(contactId, request, env, user);
      if (response.status === 200) {
        await invalidateContactsCache(cache, user, env, contactId);
      }
      break;
    case "DELETE":
      response = await deleteContact(contactId, env, user);
      if (response.status === 200) {
        await invalidateContactsCache(cache, user, env, contactId);
      }
      break;
    default:
      return createResponse({ error: "Method not allowed" }, 405);
  }

  return response;
}

// Contact CRUD implementations
async function getContacts(env, user, url) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "20");
    const search = params.get("search") || "";
    const filters = JSON.parse(params.get("filters") || "{}");
    const company_id = params.get("company_id") || "";

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    // Role-based filtering
    if (user.role === "company_admin") {
      whereConditions.push("c.company_id = ?");
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
          () =>
            "(c.name LIKE ? OR c.position LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.whatsapp LIKE ? OR co.name LIKE ?)",
        );
        whereConditions.push(`(${searchConditions.join(" OR ")})`);

        // Add parameters for each search term
        searchUnits.forEach((term) => {
          const searchTerm = `%${term}%`;
          queryParams.push(
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
          );
        });
      }
    }

    // Filters
    if (filters) {
      if (filters?.city?.length > 0) {
        whereConditions.push("c.city = ?");
        queryParams.push(filters.city);
      }
    }

    // Company filtering (for super admin)
    if (company_id && user.role === "super_admin") {
      whereConditions.push("c.company_id = ?");
      queryParams.push(company_id);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countStmt = env.DB.prepare(`
      SELECT COUNT(*) as total 
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      ${whereClause}
    `);
    const { total } = await countStmt.bind(...queryParams).first();

    // Get paginated results
    const stmt = env.DB.prepare(`
      SELECT c.*, 
             co.id as company_id_data,
             co.name as company_name,
             co.logo_url as company_logo_url,
             co.color as company_color
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const { results } = await stmt.bind(...queryParams, limit, offset).all();

    // Format results - parse location JSON array and structure company data
    const contacts = results.map((contact) => {
      const {
        company_id_data,
        company_name,
        company_logo_url,
        company_color,
        ...contactItem
      } = contact;

      return {
        ...contactItem,
        location: contact.location ? JSON.parse(contact.location) : [],
        company: company_id_data
          ? {
              id: company_id_data,
              name: company_name,
              logo_url: company_logo_url,
              color: company_color,
            }
          : null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return createResponse({
      success: true,
      data: contacts,
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
    console.error("Get contacts error:", error);
    return createResponse({ error: "Failed to fetch contacts" }, 500);
  }
}

async function getContact(contactId, env, user) {
  try {
    const stmt = env.DB.prepare(`
      SELECT c.*, co.id as company_id_data, co.name as company_name, co.logo_url as company_logo_url
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.id = ?
    `);

    const contactItem = await stmt.bind(contactId).first();

    if (!contactItem) {
      return createResponse({ error: "Contact not found" }, 404);
    }
    // Company admin can only view their company's contacts
    if (
      user.role === "company_admin" &&
      contactItem.company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    const { company_id_data, company_name, company_logo_url, ...contactData } =
      contactItem;

    const returnContact = {
      ...contactData,
      company: {
        id: company_id_data,
        name: company_name,
        logo_url: company_logo_url,
      },
      location: contactItem.location ? JSON.parse(contactItem.location) : [],
    };

    return createResponse({ success: true, data: returnContact });
  } catch (error) {
    console.error("Get contact error:", error);
    return createResponse({ error: "Failed to fetch contact" }, 500);
  }
}

async function createContact(request, env, user) {
  try {
    const data = await request.json();

    // Company admin can only create contacts for their company
    if (user.role === "company_admin" && data.company_id != user.company_id) {
      return createResponse({ error: "Access denied" }, 403);
    }

    // Validate required fields
    if (!data.company_id || !data.name) {
      return createResponse({ error: "Company and name are required" }, 400);
    }

    // Check if email already exists (if email is provided)
    if (data.email) {
      const existingContact = await env.DB.prepare(
        `SELECT id, name, email FROM contacts WHERE email = ? AND email IS NOT NULL AND email != ''`,
      )
        .bind(data.email)
        .first();

      if (existingContact) {
        return createResponse(
          {
            error: "Email already exists",
            details: `A contact with email "${data.email}" already exists (Contact: ${existingContact.name}, ID: ${existingContact.id})`,
          },
          409,
        );
      }
    }

    // Validate location array
    let locationJson = "[]";
    if (data.location) {
      if (Array.isArray(data.location)) {
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
        const invalidLocations = data.location.filter(
          (loc) => !validLocations.includes(loc),
        );
        if (invalidLocations.length > 0) {
          return createResponse(
            {
              error: `Invalid locations: ${invalidLocations.join(
                ", ",
              )}. Valid options are: ${validLocations.join(", ")}`,
            },
            400,
          );
        }
        locationJson = JSON.stringify(data.location);
      } else {
        return createResponse({ error: "Location must be an array" }, 400);
      }
    }

    const stmt = env.DB.prepare(`
      INSERT INTO contacts (company_id, name, position, email, whatsapp, phone, city, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt
      .bind(
        data.company_id,
        data.name,
        data.position || null,
        data.email || null,
        data.whatsapp || null,
        data.phone || null,
        data.city || null,
        locationJson,
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
    console.error("Create contact error:", error);
    return createResponse(
      {
        error: "Failed to create contact",
        details: error.message,
      },
      500,
    );
  }
}

async function updateContact(contactId, request, env, user) {
  try {
    const data = await request.json();

    // Check if contact exists and user has permission
    const existingContact = await env.DB.prepare(
      "SELECT company_id FROM contacts WHERE id = ?",
    )
      .bind(contactId)
      .first();

    if (!existingContact) {
      return createResponse({ error: "Contact not found" }, 404);
    }

    // Company admin can only update their company's contacts
    if (
      user.role === "company_admin" &&
      existingContact.company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    // Validate required fields
    if (!data.name) {
      return createResponse({ error: "Name is required" }, 400);
    }

    // Check if email already exists (excluding current contact)
    if (data.email) {
      const emailExists = await env.DB.prepare(
        `SELECT id, name, email FROM contacts WHERE email = ? AND id != ? AND email IS NOT NULL AND email != ''`,
      )
        .bind(data.email, contactId)
        .first();

      if (emailExists) {
        return createResponse(
          {
            error: "Email already exists",
            details: `A contact with email "${data.email}" already exists (Contact: ${emailExists.name}, ID: ${emailExists.id})`,
          },
          409,
        );
      }
    }

    // Validate location array
    let locationJson = "[]";
    if (data.location) {
      if (Array.isArray(data.location)) {
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
        const invalidLocations = data.location.filter(
          (loc) => !validLocations.includes(loc),
        );
        if (invalidLocations.length > 0) {
          return createResponse(
            {
              error: `Invalid locations: ${invalidLocations.join(
                ", ",
              )}. Valid options are: ${validLocations.join(", ")}`,
            },
            400,
          );
        }
        locationJson = JSON.stringify(data.location);
      } else {
        return createResponse({ error: "Location must be an array" }, 400);
      }
    }

    const stmt = env.DB.prepare(`
      UPDATE contacts 
      SET name = ?, position = ?, email = ?, whatsapp = ?, phone = ?, city = ?, location = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = await stmt
      .bind(
        data.name,
        data.position || null,
        data.email || null,
        data.whatsapp || null,
        data.phone || null,
        data.city || null,
        locationJson,
        contactId,
      )
      .run();

    if (result.changes === 0) {
      return createResponse({ error: "Contact not found" }, 404);
    }

    return createResponse({
      success: true,
      data: {
        id: contactId,
        ...data,
      },
    });
  } catch (error) {
    console.error("Update contact error:", error);
    return createResponse(
      {
        error: "Failed to update contact",
        details: error.message,
      },
      500,
    );
  }
}

async function deleteContact(contactId, env, user) {
  try {
    // Check if contact exists and user has permission
    const existingContact = await env.DB.prepare(
      "SELECT company_id FROM contacts WHERE id = ?",
    )
      .bind(contactId)
      .first();

    if (!existingContact) {
      return createResponse({ error: "Contact not found" }, 404);
    }

    // Company admin can only delete their company's contacts
    if (
      user.role === "company_admin" &&
      existingContact.company_id !== user.company_id
    ) {
      return createResponse({ error: "Access denied" }, 403);
    }

    const stmt = env.DB.prepare("DELETE FROM contacts WHERE id = ?");
    const result = await stmt.bind(contactId).run();

    if (result.changes === 0) {
      return createResponse({ error: "Contact not found" }, 404);
    }

    return createResponse({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    return createResponse(
      {
        error: "Failed to delete contact",
        details: error.message,
      },
      500,
    );
  }
}

// Cache invalidation helper for contacts
async function invalidateContactsCache(cache, user, env, contactId = null) {
  try {
    // Get contact details if contactId provided to invalidate related caches
    let companyId = null;
    if (contactId) {
      const contact = await env.DB.prepare(
        "SELECT company_id FROM contacts WHERE id = ?",
      )
        .bind(contactId)
        .first();
      companyId = contact?.company_id;
    }

    // Patterns to invalidate
    const patterns = [
      `/api/admin/contacts`, // Contacts list
      `/api/admin/contacts/${contactId}`, // Specific contact
    ];

    // Add company-specific patterns if we have a company ID
    if (companyId) {
      patterns.push(`/api/admin/contacts?company_id=${companyId}`);
      patterns.push(`/api/admin/companies/${companyId}`); // Company details might include contact counts
    }

    // Add user-role specific patterns
    if (user.role === "company_admin" && user.company_id) {
      patterns.push(`/api/admin/contacts?company_id=${user.company_id}`);
    }

    // Delete cache entries
    for (const pattern of patterns) {
      const testUrl = new URL(`https://example.com${pattern}`);
      const testRequest = new Request(testUrl.toString());
      await cache.delete(testRequest);
    }

    // Cache invalidation completed
  } catch (error) {
    console.error("Cache invalidation error for contacts:", error);
    // Don't fail the main operation if cache invalidation fails
  }
}
