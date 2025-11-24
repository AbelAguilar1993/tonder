import api from "./api";

export const paymentsService = {
  createCheckout: async (params = {}) => {
    return await api.post("/payments/d_local_go/create-checkout", params);
  },
};

export default paymentsService;
