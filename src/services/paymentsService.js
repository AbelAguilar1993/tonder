import api from "./api";

export const paymentsService = {
  createCheckout: async (params = {}) => {
    return await api.post("/payments/d_local_go/create-checkout", params);
  },

  createTonderIntent: async (params = {}) => {
    return await api.post("/payments/tonder/create-intent", params);
  },

  chargeTonder: async (params = {}) => {
    return await api.post("/payments/tonder/charge", params);
  },

  getTonderStatus: async (paymentId) => {
    return await api.get(`/payments/tonder/status/${paymentId}`);
  }
};

export default paymentsService;
