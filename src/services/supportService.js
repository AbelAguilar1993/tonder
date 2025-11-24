/**
 * Support Service
 * Handles support ticket submissions
 */

import api from "./api";

/**
 * Submit a support ticket
 * @param {Object} ticketData - The support ticket data
 * @returns {Promise<Object>} Response with success status
 */
export const submitSupportTicket = async (ticketData) => {
  try {
    const response = await api.post("/support/ticket", ticketData);
    return response.data;
  } catch (error) {
    console.error("Error submitting support ticket:", error);
    throw error;
  }
};

const supportService = {
  submitSupportTicket,
};

export default supportService;
