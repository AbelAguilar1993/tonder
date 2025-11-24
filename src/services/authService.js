import api, { tokenManager } from "./api";

/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

export const authService = {
  /**
   * User login
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} User data and token
   */
  login: async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);

      // Store token if login successful
      if (response.token) {
        tokenManager.setToken(response.token);
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * User registration
   * @param {Object} userData - Registration data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.name - User full name
   * @param {string} [userData.role] - User role (optional)
   * @returns {Promise<Object>} User data and token
   */
  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);

      // Store token if registration successful
      if (response.token) {
        tokenManager.setToken(response.token);
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Quick user registration with auto-generated password
   * @param {Object} userData - Registration data
   * @param {string} userData.email - User email
   * @param {string} userData.fullName - User full name
   * @returns {Promise<Object>} User data and token
   */
  quickRegister: async (userData) => {
    try {
      const response = await api.post("/auth/quick-register", userData);

      // Store token if registration successful
      if (response.token) {
        tokenManager.setToken(response.token);
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * User logout
   * @returns {Promise<void>}
   */
  logout: async () => {
    try {
      // Call logout endpoint to invalidate token on server
      await api.post("/auth/logout");
    } catch (error) {
      // Continue with local logout even if server call fails
      console.warn("Server logout failed:", error.message);
    } finally {
      // Always remove local token and user data
      tokenManager.removeToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem("user_data");
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }
  },

  /**
   * Get current user profile
   * @returns {Promise<Object>} Current user data
   */
  getCurrentUser: async () => {
    try {
      return await api.get("/auth/me");
    } catch (error) {
      throw error;
    }
  },

  /**
   * Refresh authentication token
   * @returns {Promise<Object>} New token data
   */
  refreshToken: async () => {
    try {
      const response = await api.post("/auth/refresh");

      if (response.token) {
        tokenManager.setToken(response.token);
      }

      return response;
    } catch (error) {
      // If refresh fails, logout user
      tokenManager.removeToken();
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user data
   */
  updateProfile: async (userData) => {
    try {
      return await api.put("/auth/profile", userData);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Change user password
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @returns {Promise<Object>} Success response
   */
  changePassword: async (passwordData) => {
    try {
      return await api.put("/auth/change-password", passwordData);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Success response
   */
  requestPasswordReset: async (email) => {
    try {
      return await api.post("/auth/forgot-password", { email });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reset password with token
   * @param {Object} resetData - Password reset data
   * @param {string} resetData.token - Reset token
   * @param {string} resetData.password - New password
   * @returns {Promise<Object>} Success response
   */
  resetPassword: async (resetData) => {
    try {
      return await api.post("/auth/reset-password", resetData);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Success response
   */
  verifyEmail: async (token) => {
    try {
      return await api.post("/auth/verify-email", { token });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Request email verification
   * @returns {Promise<Object>} Success response
   */
  requestEmailVerification: async () => {
    try {
      return await api.post("/auth/resend-verification");
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    return !!tokenManager.getToken();
  },

  /**
   * Get stored token
   * @returns {string|null} Authentication token
   */
  getToken: () => {
    return tokenManager.getToken();
  },
};

export default authService;
