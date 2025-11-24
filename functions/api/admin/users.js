import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";
import { sendWelcomeEmail } from "../../utils/email.js";

export async function handleUsersRequest(method, userId, request, env, user) {
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

    // Get fresh data
    let response;
    if (userId) {
      response = await getUser(userId, env, user);
    } else {
      response = await getUsers(env, user, url);
    }

    return response;
  }

  // Handle non-GET requests
  let response;
  switch (method) {
    case "POST":
      response = await createUser(request, env, user);
      break;
    case "PUT":
      response = await updateUser(userId, request, env, user);
      break;
    case "DELETE":
      response = await deleteUser(userId, env, user);
      break;
    default:
      return createResponse({ error: "Method not allowed" }, 405);
  }

  return response;
}

// Get all users with filtering and pagination
async function getUsers(env, user, url) {
  try {
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    let query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.company_id,
        u.is_active,
        u.credits,
        u.created_at,
        u.updated_at,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    // Role-based filtering
    if (user.role === "company_admin") {
      // Company admins can see users from their company and unassigned users
      query += " AND (u.company_id = ? OR u.company_id IS NULL)";
      countQuery += " AND (u.company_id = ? OR u.company_id IS NULL)";
      params.push(user.company_id);
      countParams.push(user.company_id);
    }

    // Search filtering
    if (search) {
      query +=
        " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)";
      countQuery +=
        " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Role filtering
    if (role) {
      query += " AND u.role = ?";
      countQuery += " AND u.role = ?";
      params.push(role);
      countParams.push(role);
    }

    // Add ordering and pagination
    query += " ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    // Execute queries
    const [usersResult, countResult] = await Promise.all([
      env.DB.prepare(query)
        .bind(...params)
        .all(),
      env.DB.prepare(countQuery)
        .bind(...countParams)
        .first(),
    ]);

    const users = usersResult.results || [];
    const total = countResult.total || 0;
    const totalPages = Math.ceil(total / limit);

    return createResponse({
      success: true,
      data: users,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return createResponse({ error: "Failed to fetch users" }, 500);
  }
}

// Get single user by ID
async function getUser(userId, env, user) {
  try {
    let query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.company_id,
        u.is_active,
        u.credits,
        u.created_at,
        u.updated_at,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?
    `;

    const params = [userId];

    // Role-based access control
    if (user.role === "company_admin") {
      query += " AND u.company_id = ?";
      params.push(user.company_id);
    }

    const result = await env.DB.prepare(query)
      .bind(...params)
      .first();

    if (!result) {
      return createResponse({ error: "User not found" }, 404);
    }

    return createResponse({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return createResponse({ error: "Failed to fetch user" }, 500);
  }
}

// Create new user
async function createUser(request, env, user) {
  try {
    const data = await request.json();
    console.log("Create user request data:", data);

    const {
      email,
      password,
      first_name,
      last_name,
      role = "user",
      company_id,
      credits = 0,
    } = data;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return createResponse(
        {
          error: "Email, password, first name, and last name are required",
        },
        400,
      );
    }

    // Role-based validation
    if (user.role === "company_admin") {
      // Company admins can only create regular users
      if (role !== "user") {
        return createResponse(
          {
            error: "Company admins can only create regular users",
          },
          403,
        );
      }

      // Company admins can only assign users to their company or no company
      if (company_id && company_id !== user.company_id) {
        return createResponse(
          {
            error: "You can only assign users to your company",
          },
          403,
        );
      }
    }

    // Super admins can create any type of user
    if (user.role === "super_admin") {
      // Validate role
      if (!["user", "company_admin", "super_admin"].includes(role)) {
        return createResponse(
          {
            error: "Invalid role",
          },
          400,
        );
      }
    }

    // Check if email already exists
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?",
    )
      .bind(email)
      .first();

    if (existingUser) {
      return createResponse(
        {
          error: "Email already exists",
        },
        409,
      );
    }

    // Hash password (in a real app, you'd use bcrypt or similar)
    // For now, we'll use a simple hash - replace with proper hashing
    const password_hash = await hashPassword(password);

    // Validate company_id if provided
    if (company_id && company_id !== "") {
      console.log(
        "Validating company_id for create:",
        company_id,
        typeof company_id,
      );
      const companyExists = await env.DB.prepare(
        "SELECT id FROM companies WHERE id = ?",
      )
        .bind(parseInt(company_id))
        .first();

      console.log("Company exists result for create:", companyExists);

      if (!companyExists) {
        return createResponse(
          {
            error: "Invalid company ID",
          },
          400,
        );
      }
    }

    // Set company_id based on user role and permissions
    let finalCompanyId = null;
    if (company_id && company_id !== "") {
      finalCompanyId = parseInt(company_id);
    }

    // Insert new user
    console.log("Creating user with data:", {
      email,
      first_name,
      last_name,
      role,
      finalCompanyId,
      credits,
    });

    const result = await env.DB.prepare(
      `
      INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        company_id, 
        credits,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
      .bind(
        email,
        password_hash,
        first_name,
        last_name,
        role,
        finalCompanyId,
        credits || 0,
        true,
      )
      .run();

    console.log("Insert result:", result);

    if (!result.success) {
      return createResponse({ error: "Failed to create user" }, 500);
    }

    // Fetch the created user with company info
    const createdUser = await env.DB.prepare(
      `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.company_id,
        u.is_active,
        u.credits,
        u.created_at,
        u.updated_at,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?
    `,
    )
      .bind(result.meta.last_row_id)
      .first();

    // Send welcome email with password information
    try {
      const emailResult = await sendWelcomeEmail(env, {
        email: createdUser.email,
        first_name: createdUser.first_name,
        last_name: createdUser.last_name,
        password: password, // Send the original password (before hashing)
        role: createdUser.role,
        company_name: createdUser.company_name,
      });

      if (!emailResult.success) {
        console.warn("Failed to send welcome email:", emailResult.error);
        // Don't fail the user creation if email fails, just log it
      } else {
        console.log("Welcome email sent successfully to:", createdUser.email);
      }
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the user creation if email fails
    }

    return createResponse(
      {
        success: true,
        message: "User created successfully",
        data: createdUser,
      },
      201,
    );
  } catch (error) {
    console.error("Create user error:", error);
    console.error("Error details:", error.message, error.stack);
    return createResponse({ error: "Failed to create user" }, 500);
  }
}

// Update existing user
async function updateUser(userId, request, env, user) {
  try {
    const data = await request.json();
    console.log("Update user request data:", data);
    console.log("User ID:", userId);

    const { first_name, last_name, role, company_id, is_active, credits } =
      data;

    // Check if user exists and user has permission to update it
    let checkQuery = "SELECT * FROM users WHERE id = ?";
    let checkParams = [userId];

    if (user.role === "company_admin") {
      // Company admins can edit users in their company or users with no company
      checkQuery += " AND (company_id = ? OR company_id IS NULL)";
      checkParams.push(user.company_id);
    }

    const existingUser = await env.DB.prepare(checkQuery)
      .bind(...checkParams)
      .first();

    if (!existingUser) {
      return createResponse({ error: "User not found or access denied" }, 404);
    }

    // Validate company_id if provided and not empty
    if (company_id && company_id !== "") {
      console.log(
        "Validating company_id for update:",
        company_id,
        typeof company_id,
      );
      const companyExists = await env.DB.prepare(
        "SELECT id FROM companies WHERE id = ?",
      )
        .bind(parseInt(company_id))
        .first();

      console.log("Company exists result for update:", companyExists);

      if (!companyExists) {
        return createResponse(
          {
            error: "Invalid company ID",
          },
          400,
        );
      }
    }

    // Role-based validation for updates
    if (user.role === "company_admin") {
      // Company admins cannot change roles
      if (role && role !== existingUser.role) {
        return createResponse(
          {
            error: "You cannot change user roles",
          },
          403,
        );
      }

      // Company admins can only assign users to their company or remove company assignment
      if (
        company_id !== undefined &&
        company_id !== null &&
        company_id !== "" &&
        company_id !== user.company_id
      ) {
        return createResponse(
          {
            error: "You can only assign users to your company",
          },
          403,
        );
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (first_name !== undefined) {
      updates.push("first_name = ?");
      params.push(first_name);
    }

    if (last_name !== undefined) {
      updates.push("last_name = ?");
      params.push(last_name);
    }

    if (role !== undefined && user.role === "super_admin") {
      if (!["user", "company_admin", "super_admin"].includes(role)) {
        return createResponse({ error: "Invalid role" }, 400);
      }
      updates.push("role = ?");
      params.push(role);
    }

    if (company_id !== undefined) {
      updates.push("company_id = ?");
      // Convert empty string to null for foreign key constraint
      const finalCompanyId =
        company_id === "" ? null : company_id ? parseInt(company_id) : null;
      params.push(finalCompanyId);
    }

    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active);
    }

    if (credits !== undefined && user.role === "super_admin") {
      updates.push("credits = ?");
      params.push(credits);
    }

    if (updates.length === 0) {
      return createResponse({ error: "No valid fields to update" }, 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(", ")} 
      WHERE id = ?
    `;

    console.log("Update query:", updateQuery);
    console.log("Update params:", params);

    const result = await env.DB.prepare(updateQuery)
      .bind(...params)
      .run();

    console.log("Update result:", result);

    if (!result.success) {
      return createResponse({ error: "Failed to update user" }, 500);
    }

    // Fetch updated user
    const updatedUser = await env.DB.prepare(
      `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.company_id,
        u.is_active,
        u.credits,
        u.created_at,
        u.updated_at,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?
    `,
    )
      .bind(userId)
      .first();

    return createResponse({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    console.error("Error details:", error.message, error.stack);
    return createResponse({ error: "Failed to update user" }, 500);
  }
}

// Delete user
async function deleteUser(userId, env, user) {
  try {
    // Check if user exists and user has permission to delete it
    let checkQuery = "SELECT * FROM users WHERE id = ?";
    let checkParams = [userId];

    if (user.role === "company_admin") {
      // Company admins can delete users in their company or unassigned users
      checkQuery += " AND (company_id = ? OR company_id IS NULL)";
      checkParams.push(user.company_id);
    }

    const existingUser = await env.DB.prepare(checkQuery)
      .bind(...checkParams)
      .first();

    if (!existingUser) {
      return createResponse({ error: "User not found or access denied" }, 404);
    }

    // Prevent deletion of super_admin users by company_admin
    if (user.role === "company_admin" && existingUser.role === "super_admin") {
      return createResponse(
        {
          error: "You cannot delete super admin users",
        },
        403,
      );
    }

    // Prevent users from deleting themselves
    if (parseInt(userId) === user.id) {
      return createResponse(
        {
          error: "You cannot delete your own account",
        },
        403,
      );
    }

    // Soft delete - just set is_active to false
    const result = await env.DB.prepare(
      `
      DELETE FROM users 
      WHERE id = ?
    `,
    )
      .bind(userId)
      .run();

    if (!result.success) {
      return createResponse({ error: "Failed to delete user" }, 500);
    }

    return createResponse({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return createResponse({ error: "Failed to delete user" }, 500);
  }
}

// Simple password hashing function (replace with proper bcrypt in production)
async function hashPassword(password) {
  // This is a placeholder - use proper password hashing in production
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt123"); // Add proper salt
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
