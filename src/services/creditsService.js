import api from "./api";

/**
 * Credits Service - Handles all credit-related API calls
 */
export const creditsService = {
  /**
   * Get user's current credit balance
   */
  getBalance: async () => {
    return await api.get("/credits/balance");
  },

  /**
   * Get user's credit transactions (movements)
   */
  getTransactions: async (params = {}) => {
    const { limit = 50, offset = 0 } = params;
    return await api.get(
      `/credits/transactions?limit=${limit}&offset=${offset}`,
    );
  },

  /**
   * Get user's invoices
   */
  getInvoices: async (params = {}) => {
    const { limit = 50, offset = 0 } = params;
    return await api.get(`/credits/invoices?limit=${limit}&offset=${offset}`);
  },

  /**
   * Get credit pricing information
   */
  getPricing: async () => {
    return await api.get("/credits/pricing");
  },

  /**
   * Create a credit purchase
   * @param {number} quantity - Number of credits to purchase
   */
  purchaseCredits: async (quantity) => {
    return await api.post("/credits/purchase", { quantity });
  },
};

export default creditsService;
