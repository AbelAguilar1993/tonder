import api from "./api";

/**
 * Job Applications Service
 * Handles user job applications operations
 */

const jobApplicationsService = {
  /**
   * Get user job applications
   * @returns {Promise<Object>} User job applications data
   */
  getUserJobApplications: async () => {
    try {
      const response = await api.get("/job-applications/all");
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   *
   * @param {*} contactId
   * @param {*} subject
   * @param {*} message
   * @returns
   */
  sendEmailToContactor: async (id, contact_id, subject, message) => {
    try {
      const response = await api.post("/job-applications/send-email", {
        id,
        contact_id,
        subject,
        message,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Save draft for a job application
   * @param {number} job_application_id - The job application ID
   * @param {string} subject - Draft email subject
   * @param {string} message - Draft email message
   * @returns {Promise<Object>} Response with success status
   */
  saveDraft: async (job_application_id, subject, message) => {
    try {
      const response = await api.post("/job-applications/save-draft", {
        job_application_id,
        subject,
        message,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default jobApplicationsService;
