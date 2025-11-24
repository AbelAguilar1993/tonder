import api from "./api";

/**
 * GPT Service
 * Handles AI-powered cover letter generation using OpenAI GPT API
 */

export const gptService = {
  /**
   * Generate a Spanish cover letter using GPT API
   * @param {Object} params - Cover letter generation parameters
   * @param {string} params.company - Company name
   * @param {string} params.role - Job role
   * @param {string|null} params.recruiter - Recruiter name (optional)
   * @param {string} params.formality - Formality level ("usted" or "tú")
   * @param {number} params.styleVariant - Style variant (1-5)
   * @param {string|null} params.linkedin - LinkedIn URL (optional)
   * @param {number|null} params.optOutSeed - Opt-out seed for deterministic variant selection
   * @param {number|null} params.optOutVariant - Explicit opt-out variant override (1-12)
   * @param {Array<string>} params.candidateData - Candidate strengths/skills/experience
   * @param {string|null} params.userName - Candidate's full name for signature (optional)
   * @returns {Promise<Object>} Response with success, subject (AI-generated), and coverLetter (body)
   */
  generateCoverLetter: async (params) => {
    try {
      return await api.post("/gpt/cover-letter", params);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Quick test of GPT API connectivity
   * @returns {Promise<Object>} Test result
   */
  testConnection: async () => {
    try {
      return await api.get("/gpt/test");
    } catch (error) {
      throw error;
    }
  },
};

export default gptService;
