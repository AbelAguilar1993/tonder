import api from "./api";

/**
 * Contacts Service
 * Handles contact-related API operations including contact forms,
 * support tickets, and communication management
 */

export const contactsService = {
  /**
   * Get all contacts with optional filtering and pagination
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.search] - Search term (name, position, email, phone, whatsapp, company name)
   * @param {string} [params.country] - Country filter
   * @param {string} [params.filters] - Filters (city, location, size, type, verified)
   * @param {string} [params.sortBy] - Sort field (name, position, email, phone, whatsapp, company name)
   * @param {string} [params.sortOrder] - Sort order (asc, desc)
   * @returns {Promise<Object>} Contacts list with pagination
   */
  getContacts: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append("page", params.page);
      if (params.limit) queryParams.append("limit", params.limit);
      if (params.search) queryParams.append("search", params.search);
      if (params.country) queryParams.append("country", params.country);
      if (params.company_id)
        queryParams.append("company_id", params.company_id);

      const queryString = queryParams.toString();
      const url = `/contacts${queryString ? `?${queryString}` : ""}`;

      return await api.get(url);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get contact by ID
   * @param {string|number} contactId - Contact ID
   * @returns {Promise<Object>} Contact details
   */
  getContactById: async (contactId) => {
    try {
      return await api.get(`/contacts/${contactId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if user has unlocked a specific contact
   * @param {string|number} contactId - Contact ID
   * @returns {Promise<Object>} Unlock status and user credits
   */
  checkUnlockStatus: async (contactId) => {
    try {
      return await api.get(`/contacts/status?contactId=${contactId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Unlock a contact by spending credits
   * @param {string|number} contactId - Contact ID
   * @returns {Promise<Object>} Unlock response with contact details
   */
  unlockContact: async (contactId) => {
    try {
      return await api.post("/contacts/unlock", { contactId });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get contacts count by city
   * @returns {Promise<Object>} Contacts count by city
   */
  getContactsCountByCity: async () => {
    try {
      return await api.get(`/contacts/geo/count`);
    } catch (error) {
      throw error;
    }
  },
};

export default contactsService;
