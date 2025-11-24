/**
 * Contact Service
 * Handles contact form submission
 */

import api from "./api";

/**
 * Submit contact form
 * @param {Object} formData - Contact form data
 * @returns {Promise<Object>} Response data
 */
export async function submitContactForm(formData) {
  try {
    const response = await api.post("/contact", formData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || "Failed to submit contact form",
    );
  }
}

const contactService = {
  submitContactForm,
};

export default contactService;
