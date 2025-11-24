import api from "./api";

/**
 * Jobs Service
 * Handles job-related API operations
 */

export const jobsService = {
  /**
   * Get all jobs with optional filtering and pagination
   */
  getJobs: async (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.company_id) queryParams.append("company_id", params.company_id);
    if (params.employment_type)
      queryParams.append("employment_type", params.employment_type);
    if (params.country) queryParams.append("country", params.country);

    const queryString = queryParams.toString();
    const url = `/jobs${queryString ? `?${queryString}` : ""}`;

    return await api.get(url);
  },

  /**
   * Get job by ID
   * @param {string|number} jobId - Job ID
   * @returns {Promise<Object>} Job details
   */
  getJobById: async (jobId) => {
    try {
      return await api.get(`/jobs/${jobId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all jobs attributes
   * @returns {Promise<Array>} Jobs attributes
   */
  getJobsAttributes: async () => {
    try {
      return await api.get("/attributes/jobs");
    } catch (error) {
      throw error;
    }
  },

  /**
   * Unlock a job by spending user credits
   * @param {string|number} jobId - Job ID
   * @returns {Promise<Object>} Unlock result
   */
  unlockJob: async (jobId, contactId, chips) => {
    try {
      return await api.post(`/jobs/${jobId}/unlock`, { contactId, chips });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get job unlock status for the current user
   * @param {string|number} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  getJobStatus: async (jobId, contactId) => {
    try {
      return await api.post(`/jobs/${jobId}/status`, { contactId });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get unlocked jobs for the current user
   * @returns {Promise<Object>} Unlocked jobs
   */
  getUnlockedJobs: async () => {
    try {
      return await api.get("/jobs/unlocked");
    } catch (error) {
      throw error;
    }
  },
};

export default jobsService;
