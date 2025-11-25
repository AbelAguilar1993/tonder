import {
  LiteInlineCheckout,
  validateCardNumber,
  validateCVV,
} from "tonder-web-sdk";

let liteCheckout = null;
let isInitialized = false;

async function getCheckoutInstance() {
  if (isInitialized && liteCheckout) {
    return liteCheckout;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  liteCheckout = new LiteInlineCheckout({
    apiKey: process.env.NEXT_PUBLIC_TONDER_API_KEY,
    returnUrl: `${window.location.origin}/pagos/success`,
    mode: process.env.NEXT_PUBLIC_TONDER_ENV === 'production' ? 'production' : 'development',
  });

  await liteCheckout.injectCheckout();
  isInitialized = true;

  return liteCheckout;
}

export const tonderService = {
  async initialize(apiKey, mode = 'development') {
    if (isInitialized && liteCheckout) {
      return liteCheckout;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    liteCheckout = new LiteInlineCheckout({
      apiKey: apiKey || process.env.NEXT_PUBLIC_TONDER_API_KEY,
      returnUrl: `${window.location.origin}/pagos/success`,
      mode: mode || (process.env.NEXT_PUBLIC_TONDER_ENV === 'production' ? 'production' : 'development'),
    });

    await liteCheckout.injectCheckout();
    isInitialized = true;

    return liteCheckout;
  },

  validateCardNumber(cardNumber) {
    try {
      return validateCardNumber(cardNumber);
    } catch (error) {
      return false;
    }
  },

  validateCVV(cvv) {
    try {
      return validateCVV(cvv);
    } catch (error) {
      return false;
    }
  },

  async createIntent(params) {
    const response = await fetch('/api/payments/tonder/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await response.json();
  },

  async processPayment(checkoutData) {
    const checkout = await getCheckoutInstance();
    
    if (!checkout) {
      throw new Error('Tonder SDK not initialized');
    }

    try {
      const response = await checkout.payment(checkoutData);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message || 'Payment failed' };
    }
  },

  async configureCheckout(customerData, secureToken) {
    const checkout = await getCheckoutInstance();
    
    if (!checkout) {
      throw new Error('Tonder SDK not initialized');
    }

    checkout.configureCheckout({
      customer: customerData,
      secureToken: secureToken
    });
  },

  async saveCustomerCard(cardData) {
    const checkout = await getCheckoutInstance();
    
    if (!checkout) {
      throw new Error('Tonder SDK not initialized');
    }

    try {
      const response = await checkout.saveCustomerCard(cardData);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to save card' };
    }
  },

  async charge(params) {
    const response = await fetch('/api/payments/tonder/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await response.json();
  },

  async getStatus(paymentId) {
    const response = await fetch(`/api/payments/tonder/status/${paymentId}`);
    return await response.json();
  },

  async pollStatus(paymentId, maxAttempts = 60, interval = 5000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const status = await this.getStatus(paymentId);
        
        if (status.success && status.data) {
          if (status.data.status === 'succeeded') {
            return { status: 'succeeded', data: status.data };
          }
          
          if (status.data.status === 'failed' || status.data.status === 'expired') {
            return { status: status.data.status, error: 'Payment failed or expired' };
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    return { status: 'timeout', error: 'Payment status polling timeout' };
  },
};

export default tonderService;
