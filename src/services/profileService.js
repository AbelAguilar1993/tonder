import api from "./api";

/**
 * Profile Service
 * Handles user profile operations
 */

const profileService = {
  /**
   * Get user profile
   * @returns {Promise<Object>} User profile data
   */
  getProfile: async () => {
    try {
      const response = await api.get("/profile");
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {string} profileData.firstName - User's first name
   * @param {string} profileData.lastName - User's last name
   * @param {string} profileData.email - User's email
   * @param {string} profileData.city - User's city (required)
   * @param {string} profileData.linkedin - User's LinkedIn URL (optional)
   * @param {string} profileData.signature - User's signature (optional)
   * @param {string} profileData.whatsapp - User's WhatsApp number (optional)
   * @param {boolean} profileData.emailNotifications - Email notifications preference
   * @param {boolean} profileData.emailInvoices - Email invoices preference
   * @returns {Promise<Object>} Updated user data
   */
  updateProfile: async (profileData) => {
    try {
      const response = await api.put("/profile", profileData);
      return response;
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
      const response = await api.post("/profile/change-password", passwordData);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default profileService;
