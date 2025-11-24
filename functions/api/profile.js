/**
 * User Profile API handlers
 */

import { createResponse } from "../utils/cors.js";
import { verifyJWT } from "../utils/jwt.js";
import { executeQueryFirst, executeUpdate } from "../utils/database.js";

/**
 * Hash password using Web Crypto API
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

/**
 * Handle profile requests
 */
export async function handleProfile(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === "/api/profile" && request.method === "GET") {
      return await handleGetProfile(request, env);
    }

    if (path === "/api/profile" && request.method === "PUT") {
      return await handleUpdateProfile(request, env);
    }

    if (path === "/api/profile/change-password" && request.method === "POST") {
      return await handleChangePassword(request, env);
    }

    return createResponse({ error: "Profile endpoint not found" }, 404);
  } catch (error) {
    console.error("Profile error:", error);
    return createResponse({ error: "Profile operation failed" }, 500);
  }
}

/**
 * Handle getting user profile
 */
async function handleGetProfile(request, env) {
  try {
    // Verify JWT token
    const authResult = await verifyJWT(request, env);

    if (!authResult || !authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userPayload = authResult.payload;

    // Fetch user data from database
    const user = await executeQueryFirst(
      env,
      "SELECT id, email, first_name, last_name, role, company_id, city, linkedin, signature, whatsapp, email_notifications, email_invoices, created_at, updated_at FROM users WHERE id = ?",
      [userPayload.id],
    );

    if (!user) {
      return createResponse({ error: "User not found" }, 404);
    }

    return createResponse({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        companyId: user.company_id,
        city: user.city,
        linkedin: user.linkedin,
        signature: user.signature,
        whatsapp: user.whatsapp,
        emailNotifications: user.email_notifications,
        emailInvoices: user.email_invoices,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return createResponse({ error: "Failed to get profile" }, 500);
  }
}

/**
 * Handle updating user profile
 */
async function handleUpdateProfile(request, env) {
  try {
    // Verify JWT token
    const authResult = await verifyJWT(request, env);

    if (!authResult || !authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userPayload = authResult.payload;
    const {
      firstName,
      lastName,
      email,
      city,
      linkedin,
      signature,
      whatsapp,
      emailNotifications,
      emailInvoices,
    } = await request.json();

    // Validate input
    if (!firstName || !lastName || !email) {
      return createResponse(
        { error: "First name, last name, and email are required" },
        400,
      );
    }

    // Validate city (required field)
    if (!city || !city.trim()) {
      return createResponse({ error: "City is required" }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return createResponse(
        { error: "Please enter a valid email address" },
        400,
      );
    }

    // Validate LinkedIn URL if provided
    if (linkedin && linkedin.trim()) {
      const linkedinRegex =
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-]+\/?$/;
      if (!linkedinRegex.test(linkedin.trim())) {
        return createResponse(
          {
            error:
              "Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourprofile)",
          },
          400,
        );
      }
    }

    // Validate WhatsApp number if provided
    if (whatsapp && whatsapp.trim()) {
      const whatsappRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!whatsappRegex.test(whatsapp.trim().replace(/[\s\-\(\)]/g, ""))) {
        return createResponse(
          {
            error:
              "Please enter a valid WhatsApp number (e.g., +1234567890 or 1234567890)",
          },
          400,
        );
      }
    }

    // Check if email is already taken by another user
    const existingUser = await executeQueryFirst(
      env,
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email.trim(), userPayload.id],
    );

    if (existingUser) {
      return createResponse(
        { error: "Email is already taken by another user" },
        409,
      );
    }

    // Update user profile
    const result = await executeUpdate(
      env,
      "UPDATE users SET first_name = ?, last_name = ?, email = ?, city = ?, linkedin = ?, signature = ?, whatsapp = ?, email_notifications = ?, email_invoices = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        city.trim(),
        linkedin ? linkedin.trim() : null,
        signature ? signature.trim() : null,
        whatsapp ? whatsapp.trim() : null,
        emailNotifications !== undefined ? emailNotifications : true,
        emailInvoices !== undefined ? emailInvoices : true,
        userPayload.id,
      ],
    );

    if (result.meta.changes === 0) {
      return createResponse(
        { error: "User not found or no changes made" },
        404,
      );
    }

    // Fetch updated user data
    const updatedUser = await executeQueryFirst(
      env,
      "SELECT id, email, first_name, last_name, role, company_id, city, linkedin, signature, whatsapp, email_notifications, email_invoices, created_at, updated_at FROM users WHERE id = ?",
      [userPayload.id],
    );

    return createResponse({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        companyId: updatedUser.company_id,
        city: updatedUser.city,
        linkedin: updatedUser.linkedin,
        signature: updatedUser.signature,
        whatsapp: updatedUser.whatsapp,
        emailNotifications: updatedUser.email_notifications,
        emailInvoices: updatedUser.email_invoices,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return createResponse({ error: "Failed to update profile" }, 500);
  }
}

/**
 * Handle changing user password
 */
async function handleChangePassword(request, env) {
  try {
    // Verify JWT token
    const authResult = await verifyJWT(request, env);

    if (!authResult || !authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userPayload = authResult.payload;
    const { currentPassword, newPassword } = await request.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return createResponse(
        { error: "Current password and new password are required" },
        400,
      );
    }

    if (newPassword.length < 8) {
      return createResponse(
        { error: "New password must be at least 8 characters long" },
        400,
      );
    }

    // Get user's current password hash
    const user = await executeQueryFirst(
      env,
      "SELECT id, password_hash FROM users WHERE id = ?",
      [userPayload.id],
    );

    if (!user) {
      return createResponse({ error: "User not found" }, 404);
    }

    // Verify current password
    const validPassword = await verifyPassword(
      currentPassword,
      user.password_hash,
    );
    if (!validPassword) {
      return createResponse({ error: "Current password is incorrect" }, 400);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const result = await executeUpdate(
      env,
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newPasswordHash, userPayload.id],
    );

    if (result.meta.changes === 0) {
      return createResponse({ error: "Failed to update password" }, 500);
    }

    return createResponse({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return createResponse({ error: "Failed to change password" }, 500);
  }
}
