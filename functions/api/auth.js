/**
 * Authentication API handlers
 */

import { createResponse } from "../utils/cors.js";
import { createJWT, verifyJWT } from "../utils/jwt.js";
import { executeQueryFirst, executeUpdate } from "../utils/database.js";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
} from "../utils/email.js";

/**
 * Hash password using Web Crypto API
 */
export async function hashPassword(password) {
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
 * Generate a random password
 */
export function generateRandomPassword(length = 12) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";

  const allChars = uppercase + lowercase + numbers + symbols;
  let password = "";

  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Handle authentication requests
 */
export async function handleAuth(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === "/api/auth/register" && request.method === "POST") {
      return await handleRegister(request, env);
    }

    if (path === "/api/auth/quick-register" && request.method === "POST") {
      return await handleQuickRegister(request, env);
    }

    if (path === "/api/auth/login" && request.method === "POST") {
      return await handleLogin(request, env);
    }

    if (path === "/api/auth/me" && request.method === "GET") {
      return await handleMe(request, env);
    }

    if (path === "/api/auth/forgot-password" && request.method === "POST") {
      return await handleForgotPassword(request, env);
    }

    if (path === "/api/auth/reset-password" && request.method === "POST") {
      return await handleResetPassword(request, env);
    }

    return createResponse({ error: "Auth endpoint not found" }, 404);
  } catch (error) {
    console.error("Auth error:", error);
    return createResponse({ error: "Authentication failed" }, 500);
  }
}

/**
 * Handle user registration
 */
async function handleRegister(request, env) {
  const { email, password, firstName, lastName } = await request.json();

  // Validate input
  if (!email || !password || !firstName || !lastName) {
    return createResponse({ error: "Missing required fields" }, 400);
  }

  if (password.length < 8) {
    return createResponse(
      { error: "Password must be at least 8 characters" },
      400,
    );
  }

  try {
    // Check if user already exists
    const existingUser = await executeQueryFirst(
      env,
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    // Debug log removed for production

    if (existingUser) {
      return createResponse({ error: "User already exists" }, 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = await executeUpdate(
      env,
      "INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)",
      [email, passwordHash, firstName, lastName],
    );

    // Create JWT token
    const token = await createJWT(
      {
        id: result.meta.last_row_id,
        email: email,
        role: "user",
        company_id: null,
      },
      "24h",
      env,
    );

    return createResponse(
      {
        message: "User registered successfully",
        token,
        user: {
          id: result.meta.last_row_id,
          email,
          firstName,
          lastName,
          role: "user",
        },
      },
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);
    return createResponse({ error: "Registration failed" }, 500);
  }
}

/**
 * Handle quick user registration with auto-generated password
 */
async function handleQuickRegister(request, env) {
  const { email, fullName } = await request.json();

  const { cf } = request;
  const geoCity = cf?.city || "";

  // Validate input
  if (!email || !fullName) {
    return createResponse({ error: "Email and full name are required" }, 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return createResponse({ error: "Please enter a valid email address" }, 400);
  }

  // Split full name into first and last name
  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length < 2) {
    return createResponse(
      {
        error: "Please enter your full name (first and last name)",
      },
      400,
    );
  }

  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");

  try {
    // Check if user already exists
    const existingUser = await executeQueryFirst(
      env,
      "SELECT id FROM users WHERE email = ?",
      [email.trim()],
    );

    if (existingUser) {
      return createResponse(
        {
          error:
            "This email is already registered. Would you like to log in instead?",
          code: "EMAIL_EXISTS",
        },
        409,
      );
    }

    // Generate random password
    const password = generateRandomPassword(12);

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = await executeUpdate(
      env,
      "INSERT INTO users (email, password_hash, first_name, last_name, role, company_id, city) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [email.trim(), passwordHash, firstName, lastName, "user", null, geoCity],
    );

    const userId = result.meta.last_row_id;

    // Send welcome email with password
    try {
      await sendWelcomeEmail(env, {
        email: email.trim(),
        first_name: firstName,
        last_name: lastName,
        password: password,
        role: "user",
        company_name: null,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Continue with registration even if email fails
    }

    // Create JWT token (optional - user might need to login manually)
    const token = await createJWT(
      {
        id: userId,
        email: email.trim(),
        role: "user",
        company_id: null,
      },
      "24h",
      env,
    );

    return createResponse(
      {
        message:
          "Registration successful! Please check your email for your password.",
        token,
        user: {
          id: userId,
          email: email.trim(),
          firstName,
          lastName,
          role: "user",
        },
      },
      201,
    );
  } catch (error) {
    console.error("Quick registration error:", error);
    return createResponse(
      { error: "Registration failed. Please try again." },
      500,
    );
  }
}

/**
 * Handle user login
 */
async function handleLogin(request, env) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return createResponse({ error: "Email and password required" }, 400);
  }

  try {
    // Find user by email
    const user = await executeQueryFirst(
      env,
      "SELECT id, email, password_hash, first_name, last_name, role, company_id, linkedin FROM users WHERE email = ?",
      [email],
    );

    if (!user) {
      return createResponse({ error: "Invalid credentials" }, 401);
    }

    // Verify password
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return createResponse({ error: "Invalid credentials" }, 401);
    }

    // Create JWT token
    const token = await createJWT(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
      },
      "24h",
      env,
    );

    return createResponse({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        linkedin: user.linkedin || "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return createResponse(
      { error: "Login failed", message: error.message },
      500,
    );
  }
}

/**
 * Handle getting current user info
 */
async function handleMe(request, env) {
  try {
    // Verify JWT token
    const authResult = await verifyJWT(request, env);

    if (!authResult || !authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userPayload = authResult.payload;

    // Fetch fresh user data from database
    const user = await executeQueryFirst(
      env,
      "SELECT id, email, first_name, last_name, role, company_id, credits, linkedin FROM users WHERE id = ?",
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
        credits: user.credits || 0,
        linkedin: user.linkedin || "",
      },
    });
  } catch (error) {
    console.error("Me endpoint error:", error);
    return createResponse({ error: "Failed to get user info" }, 500);
  }
}

/**
 * Generate a secure random token for password reset
 */
function generateSecureToken(length = 32) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";

  // Use crypto.getRandomValues for secure randomness
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }

  return token;
}

/**
 * Handle forgot password request
 */
async function handleForgotPassword(request, env) {
  const { email } = await request.json();

  // Validate input
  if (!email) {
    return createResponse({ error: "Email is required" }, 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return createResponse({ error: "Please enter a valid email address" }, 400);
  }

  try {
    // Find user by email
    const user = await executeQueryFirst(
      env,
      "SELECT id, email, first_name, last_name FROM users WHERE email = ?",
      [email.trim()],
    );

    // Always return success message for security (don't reveal if email exists)
    const successMessage =
      "If an account with this email exists, we've sent a password reset link to it.";

    if (!user) {
      // User doesn't exist, but don't reveal this for security
      return createResponse({ message: successMessage });
    }

    // Generate secure reset token
    const resetToken = generateSecureToken(64);
    const tokenHash = await hashPassword(resetToken);

    // Set expiration time (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Clean up any existing tokens for this user (optional but good practice)
    await executeUpdate(
      env,
      "DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < datetime('now')",
      [user.id],
    );

    // Store the hashed token in database
    await executeUpdate(
      env,
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [user.id, tokenHash, expiresAt],
    );

    // Send password reset email
    try {
      await sendPasswordResetEmail(env, {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        reset_token: resetToken, // Send the plain token, not the hash
      });
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Continue without failing the request - the token is still valid
    }

    return createResponse({ message: successMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    return createResponse(
      { error: "Failed to process password reset request" },
      500,
    );
  }
}

/**
 * Handle password reset with token
 */
async function handleResetPassword(request, env) {
  const { token, password } = await request.json();

  // Validate input
  if (!token || !password) {
    return createResponse(
      { error: "Token and new password are required" },
      400,
    );
  }

  if (password.length < 8) {
    return createResponse(
      { error: "Password must be at least 8 characters long" },
      400,
    );
  }

  try {
    // Hash the provided token to compare with stored hash
    const tokenHash = await hashPassword(token);

    // Find valid reset token
    const resetRecord = await executeQueryFirst(
      env,
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.is_used,
              u.email, u.first_name, u.last_name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = ? AND prt.is_used = FALSE AND prt.expires_at > datetime('now')`,
      [tokenHash],
    );

    if (!resetRecord) {
      return createResponse({ error: "Invalid or expired reset token" }, 400);
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(password);

    // Update user's password
    await executeUpdate(
      env,
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newPasswordHash, resetRecord.user_id],
    );

    // Mark the reset token as used
    await executeUpdate(
      env,
      "UPDATE password_reset_tokens SET is_used = TRUE WHERE id = ?",
      [resetRecord.id],
    );

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(env, {
        email: resetRecord.email,
        first_name: resetRecord.first_name,
        last_name: resetRecord.last_name,
      });
    } catch (emailError) {
      console.error(
        "Failed to send password reset confirmation email:",
        emailError,
      );
      // Continue without failing the request - password was changed successfully
    }

    // Clean up expired tokens for this user
    await executeUpdate(
      env,
      "DELETE FROM password_reset_tokens WHERE user_id = ? AND (is_used = TRUE OR expires_at < datetime('now'))",
      [resetRecord.user_id],
    );

    return createResponse({
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return createResponse({ error: "Failed to reset password" }, 500);
  }
}
