import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";
import { COUNTRY_LABELS } from "../../utils/const.js";
import { getLocationDetails } from "../../utils/index.js";

export async function handleContactsRequest(request, env, user) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const resourceOrContactId = pathParts[2];
  const cache = new CloudflareCache(env);

  const { chosenCity, countryName, locationText } = getLocationDetails(request);

  // If country is NOT explicitly in the query, add geo variation to cache key and Vary.
  const cacheKey = `${
    url.pathname
  }?${url.searchParams.toString()}country=${countryName}&city=${chosenCity}`;

  if (method === "GET") {
    const uid = user?.id ?? "anon";
    const role = user?.role ?? "anon";
    // Scope cache per query + user/role to avoid leaking personalized fields
    const baseKey = `${
      url.pathname
    }?${url.searchParams.toString()}&uid=${uid}&role=${role}`;

    // 1) /api/contacts/status?contactId=123 — micro‑cache
    if (String(resourceOrContactId || "").startsWith("status")) {
      const cached = await cache.get(request, baseKey);
      // if (cached) return cached;

      let resp = await handleContactStatusRequest(request, env, user);
      if (resp.status === 200) {
        // 10s browser / 30s edge; invalidated by unlock
        resp = await cache.put(request, resp, {
          customKey: baseKey,
          maxAge: 10,
          sMaxAge: 30,
          staleWhileRevalidate: 60,
          publicCache: false,
        });
      }
      return resp;
    }

    // 2) /api/contacts/geo - fetch contacts by user's geo city
    if (String(resourceOrContactId || "").startsWith("geo")) {
      let resp = await getContactsByCity(env, chosenCity);
      return resp;
    }

    // 3) /api/contacts/:id — detail (still personalized by isUnlocked)
    if (resourceOrContactId && !isNaN(Number(resourceOrContactId))) {
      const itemKey = `${url.pathname}?id=${resourceOrContactId}&uid=${uid}&role=${role}`;
      const cached = await cache.get(request, itemKey);
      // if (cached) return cached;

      let resp = await getContact(resourceOrContactId, env, user);
      if (resp.status === 200) {
        resp = await cache.put(request, resp, {
          customKey: itemKey,
          maxAge: 1200,
          sMaxAge: 432000,
          staleWhileRevalidate: 14400,
          publicCache: false,
        });
      }
      return resp;
    }

    // 4) /api/contacts — list
    const cached = await cache.get(request, cacheKey);
    // if (cached) return cached;

    let resp = await getContacts(env, user, url, chosenCity, countryName);
    if (resp.status === 200) {
      // Short TTL because unlock/credits can change individual rows
      resp = await cache.put(request, resp, {
        customKey: cacheKey,
        maxAge: 600,
        sMaxAge: 432000,
        staleWhileRevalidate: 14400,
        publicCache: false,
        vary: "CF-IPCountry",
      });
    }
    return resp;
  }

  // POST endpoints
  switch (method) {
    case "POST":
      if (pathParts[2] === "unlock") {
        return await handleContactUnlockRequest(request, env, user);
      }
      break;
    default:
      return createResponse({ error: "Method not allowed" }, 405);
  }
  return createResponse({ error: "Endpoint not found" }, 404);
}

async function getContact(contactId, env, user) {
  try {
    let stmt;
    let contactItem;
    if (user?.role === "user") {
      // For regular users, compute unlocked status via LEFT JOIN
      stmt = env.DB.prepare(`
        SELECT c.*,
               co.id as company_id_data,
               co.name as company_name,
               co.logo_url as company_logo_url,
               co.color as company_color,
               uc.id as is_unlocked
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.id
        LEFT JOIN user_unlocked_contacts uc ON c.id = uc.contact_id AND uc.user_id = ?
        WHERE c.id = ?
      `);
      contactItem = await stmt.bind(user.id, contactId).first();
    } else {
      // Admins see everything unlocked
      stmt = env.DB.prepare(`
        SELECT c.*,
               co.id as company_id_data,
               co.name as company_name,
               co.logo_url as company_logo_url,
               co.color as company_color,
               1 as is_unlocked
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.id
        WHERE c.id = ?
      `);
      contactItem = await stmt.bind(contactId).first();
    }
    if (!contactItem)
      return createResponse({ error: "Contact not found" }, 404);

    const initials = (name) =>
      !name
        ? "??"
        : name
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase())
            .join("")
            .slice(0, 2);

    const {
      company_id_data,
      company_name,
      company_logo_url,
      company_color,
      is_unlocked,
      ...contactData
    } = contactItem;

    const isUnlocked = !!is_unlocked;

    const result = {
      ...contactData,
      // Show abbreviated name for locked contacts
      name: isUnlocked ? contactItem.name : initials(contactItem.name),
      // Hide sensitive fields for locked contacts
      position: isUnlocked ? contactItem.position : null,
      email: isUnlocked ? contactItem.email : null,
      whatsapp: isUnlocked ? contactItem.whatsapp : null,
      phone: isUnlocked ? contactItem.phone : null,
      // City is always visible
      city: contactItem.city,
      location: contactItem.location ? JSON.parse(contactItem.location) : [],
      isUnlocked,
      company: {
        id: company_id_data,
        name: company_name,
        logo_url: company_logo_url,
        color: company_color,
      },
    };

    return createResponse({ success: true, data: result });
  } catch (err) {
    console.error("Get contact error:", err);
    return createResponse({ error: "Failed to fetch contact" }, 500);
  }
}

async function getContacts(env, user, url, chosenCity, countryName) {
  try {
    const params = new URLSearchParams(url?.search || "");
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "20", 10);
    const search = params.get("search") || "";
    const filters = JSON.parse(params.get("filters") || "{}");
    const company_id = params.get("company_id") || "";
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
          () =>
            "(c.name LIKE ? OR c.position LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.whatsapp LIKE ? OR co.name LIKE ?)",
        );
        where.push(`(${blocks.join(" OR ")})`);
        for (const t of terms) {
          const like = `%${t}%`;
          bind.push(like, like, like, like, like, like);
        }
      }
    }

    if (filters && filters?.city?.length > 0) {
      where.push("c.city = ?");
      bind.push(filters.city);
    }

    if (country) {
      where.push("c.location LIKE ?");
      bind.push(`%${country}%`);
    }

    if (company_id) {
      where.push("c.company_id = ?");
      bind.push(company_id);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { total } = await env.DB.prepare(
      `
        SELECT COUNT(*) as total
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.id
        ${whereClause}
      `,
    )
      .bind(...bind)
      .first();

    const queryResult = await env.DB.prepare(
      `
        SELECT c.*,
               co.id as company_id_data,
               co.name as company_name,
               co.logo_url as company_logo_url,
               co.color as company_color,
               uc.id as is_unlocked
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.id
        LEFT JOIN user_unlocked_contacts uc ON c.id = uc.contact_id AND uc.user_id = ?
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `,
    )
      .bind(user?.id || null, ...bind, limit, offset)
      .all();

    const initials = (name) =>
      !name
        ? "??"
        : name
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase())
            .join("")
            .slice(0, 2);

    const contacts = (queryResult.results || []).map((row) => {
      const {
        company_id_data,
        company_name,
        company_logo_url,
        company_color,
        is_unlocked,
        ...contactItem
      } = row;

      const unlocked = !!is_unlocked;
      return {
        ...contactItem,
        name: unlocked ? row.name : initials(row.name),
        position: unlocked ? row.position : null,
        email: unlocked ? row.email : null,
        whatsapp: unlocked ? row.whatsapp : null,
        phone: unlocked ? row.phone : null,
        city: row.city,
        location: row.location ? JSON.parse(row.location) : [],
        isUnlocked: unlocked,
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
      data: {
        contacts,
        chosenCity,
        countryName: country,
      },
      meta: { pagination: { page, limit, total, totalPages } },
    });
  } catch (err) {
    console.error("Get contacts error:", err);
    return createResponse({ error: "Failed to fetch contacts" }, 500);
  }
}

async function getContactsByCity(env, chosenCity) {
  const contacts = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM contacts WHERE city = ?`,
  )
    .bind(chosenCity)
    .first();
  return createResponse({
    success: true,
    data: { contactsCount: contacts?.total || 0, city: chosenCity },
  });
}

async function handleContactUnlockRequest(request, env, user) {
  const cache = new CloudflareCache(env);
  try {
    const { contactId } = await request.json();
    if (!contactId)
      return createResponse({ error: "Contact ID is required" }, 400);

    // Already unlocked?
    const existing = await env.DB.prepare(
      `SELECT id FROM user_unlocked_contacts WHERE user_id = ? AND contact_id = ?`,
    )
      .bind(user?.id || null, contactId)
      .first();
    if (existing) {
      return createResponse({
        success: true,
        alreadyUnlocked: true,
        message: "Contact already unlocked",
      });
    }

    const contact = await env.DB.prepare(
      `
      SELECT c.*, co.name as company_name, co.logo_url as company_logo_url, co.color as company_color
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.id = ?
    `,
    )
      .bind(contactId)
      .first();
    if (!contact) return createResponse({ error: "Contact not found" }, 404);

    const userRow = await env.DB.prepare(
      `SELECT credits FROM users WHERE id = ?`,
    )
      .bind(user?.id || null)
      .first();
    if (!userRow || userRow.credits < 1) {
      return createResponse(
        { error: "Insufficient credits", userCredits: userRow?.credits || 0 },
        402,
      );
    }

    // Deduct credit + record unlock
    await env.DB.prepare(
      `UPDATE users SET credits = credits - 1, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(user?.id || null)
      .run();
    await env.DB.prepare(
      `INSERT INTO user_unlocked_contacts (user_id, contact_id, credits_spent) VALUES (?, ?, 1)`,
    )
      .bind(user?.id || null, contactId)
      .run();

    const unlockedContact = {
      ...contact,
      location: contact.location ? JSON.parse(contact.location) : [],
      company: {
        name: contact.company_name,
        logo_url: contact.company_logo_url,
        color: contact.company_color,
      },
    };

    // Invalidate user-scoped caches related to this contact
    await invalidateUserContactCache(cache, user, contactId);

    return createResponse({
      success: true,
      contact: unlockedContact,
      creditsRemaining: (userRow.credits || 1) - 1,
      message: "Contact unlocked successfully",
    });
  } catch (err) {
    console.error("Contact unlock error:", err);
    return createResponse(
      { error: "Failed to unlock contact. Please try again." },
      500,
    );
  }
}

async function handleContactStatusRequest(request, env, user) {
  try {
    const url = new URL(request.url);
    const contactId = url.searchParams.get("contactId");
    if (!contactId)
      return createResponse({ error: "Contact ID is required" }, 400);

    // Single JOIN to get both credits and unlock state
    const row = await env.DB.prepare(
      `
      SELECT u.credits, uc.unlocked_at
      FROM users u
      LEFT JOIN user_unlocked_contacts uc
        ON uc.user_id = u.id AND uc.contact_id = ?
      WHERE u.id = ?
    `,
    )
      .bind(contactId, user?.id || null)
      .first();

    const isUnlocked = !!row?.unlocked_at;
    const credits = row?.credits ?? 0;

    return createResponse({
      success: true,
      isUnlocked,
      userCredits: credits,
      unlockedAt: row?.unlocked_at || null,
    });
  } catch (err) {
    console.error("Contact status check error:", err);
    return createResponse({ error: "Failed to check contact status" }, 500);
  }
}

async function invalidateUserContactCache(cache, user, contactId) {
  try {
    const uid = user?.id ?? "anon";
    const role = user?.role ?? "anon";

    // Status for this contact + user
    const statusPath = `/api/contacts/status?contactId=${contactId}`;
    await cache.delete(
      new Request(`https://example.com${statusPath}`),
      `${statusPath}&uid=${uid}&role=${role}`,
    );

    // Detail view for this contact + user
    const detailPath = `/api/contacts/${contactId}`;
    await cache.delete(
      new Request(`https://example.com${detailPath}`),
      `${detailPath}?id=${contactId}&uid=${uid}&role=${role}`,
    );

    // Best-effort: list page=1 default limit for this user
    const listPath = `/api/contacts?page=1&limit=20`;
    await cache.delete(
      new Request(`https://example.com${listPath}`),
      `${listPath}&uid=${uid}&role=${role}`,
    );
  } catch (err) {
    console.error("Cache invalidation error for contacts:", err);
  }
}
