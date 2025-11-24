import api from "./api";

/**
 * Companies Service
 * Handles company-related API operations including CRUD operations,
 * company profiles, jobs management, and employee management
 */

export const companiesService = {
  /**
   * Get all companies
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.search] - Search term
   * @param {string} [params.country] - Country
   * @returns {Promise<Object>} Companies list with pagination
   */
  getCompanies: async (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.filters)
      queryParams.append("filters", JSON.stringify(params.filters));
    if (params.status) queryParams.append("status", params.status);
    if (params.country) queryParams.append("country", params.country);

    const queryString = queryParams.toString();
    const url = `/companies${queryString ? `?${queryString}` : ""}`;

    return await api.get(url);
  },

  /**
   * Get a company by ID
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Company
   */
  getCompany: async (companyId) => {
    return await api.get(`/companies/${companyId}`);
  },

  /**
   * Get all companies attributes
   * @returns {Promise<Array>} Companies attributes
   */
  getCompaniesAttributes: async () => {
    try {
      return await api.get("/attributes/companies");
    } catch (error) {
      throw error;
    }
  },
};

export default companiesService;
