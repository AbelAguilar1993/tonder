let liteCheckout = null;
let isInitialized = false;
let tonderSDK = null;

async function loadTonderSDK() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!tonderSDK) {
    tonderSDK = await import("tonder-web-sdk");
  }
  
  return tonderSDK;
}

async function getCheckoutInstance() {
  if (isInitialized && liteCheckout) {
    return liteCheckout;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const sdk = await loadTonderSDK();
  if (!sdk) {
    console.error('Failed to load Tonder SDK');
    return null;
  }

  liteCheckout = new sdk.LiteInlineCheckout({
    mode: process.env.NEXT_PUBLIC_TONDER_ENV === 'production' ? 'production' : 'stage',
    apiKey: process.env.NEXT_PUBLIC_TONDER_API_KEY,
    returnUrl: `${window.location.origin}/pagos/success`,
  });

  await liteCheckout.injectCheckout();
  
  isInitialized = true;

  liteCheckout.verify3dsTransaction().then((response) => {
    if (response) {
      //log
      console.log('3DS Verification:', response);
    }
  }).catch(err => {
    console.warn('3DS verification warning:', err);
  });

  return liteCheckout;
}

function getBrowserInfo() {
  if (typeof window === 'undefined') return null;
  
  return {
    javascript_enabled: true,
    time_zone: new Date().getTimezoneOffset(),
    language: navigator.language || "es-MX",
    color_depth: screen.colorDepth,
    screen_width: screen.width,
    screen_height: screen.height,
    user_agent: navigator.userAgent
  };
}

export const tonderService = {
  async initialize() {
    return await getCheckoutInstance();
  },

  async validateCardNumber(cardNumber) {
    if (typeof window === 'undefined') return false;
    
    try {
      const cleaned = cardNumber.replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(cleaned)) return false;
      
      let sum = 0;
      let isEven = false;
      
      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned.charAt(i), 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      
      return sum % 10 === 0;
    } catch (error) {
      console.error('Card validation error:', error);
      return false;
    }
  },

  async validateCVV(cvv) {
    if (typeof window === 'undefined') return false;
    return /^\d{3,4}$/.test(cvv);
  },

  async createIntent(params) {
    const response = await fetch('/api/payments/tonder/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await response.json();
  },

  async configureCheckout(customerData) {
    const checkout = await getCheckoutInstance();
    
    if (!checkout) {
      throw new Error('Tonder SDK not initialized');
    }

    await checkout.configureCheckout({
      customer: customerData
    });
  },

  buildCardPaymentData(formData, cardData, amount, orderId) {
    const { firstName, lastName, email, phone, country } = formData;
    
    return {
      customer: {
        firstName: firstName,
        lastName: lastName || firstName,
        email: email,
        country: country || "Mexico",
        address: "Address",
        city: "CDMX",
        state: "CDMX",
        postCode: "01000",
        phone: phone || "5512345678"
      },
      cart: {
        total: parseFloat(amount),
        items: [{
          description: "Job Application Payment",
          quantity: 1,
          price_unit: parseFloat(amount),
          discount: 0,
          taxes: 0,
          product_reference: "JOB-001",
          name: "Job Application",
          amount_total: parseFloat(amount)
        }]
      },
      currency: "MXN",
      metadata: {
        order_id: orderId,
        payment_method: "card",
        payment_type: formData.paymentType || "job_unlock"
      },
      card: {
        card_number: cardData.cardNumber,
        cvv: cardData.cvv,
        expiration_month: cardData.expirationMonth,
        expiration_year: cardData.expirationYear,
        cardholder_name: cardData.cardholderName
      }
    };
  },

  buildAPMPaymentData(formData, amount, paymentMethod) {
    const { firstName, lastName, email, phone } = formData;
    const fullName = `${firstName} ${lastName || ''}`.trim();
    
    const orderId = Math.floor(Date.now() / 1000);
    const paymentId = Math.floor(Math.random() * 90000) + 10000;
    const orderReference = "ORDER-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    const customerId = Math.random().toString(36).substr(2, 9);
    const businessId = parseInt(process.env.NEXT_PUBLIC_TONDER_BUSINESS_ID || "168");

    const normalizedMethod = paymentMethod === 'spei' ? 'Spei' : 
                            paymentMethod === 'oxxo' ? 'oxxopay' : 
                            paymentMethod;

    return {
      customer: {
        firstName: firstName,
        lastName: lastName || firstName,
        email: email,
        country: "Mexico",
        address: "Calle Principal 123",
        city: "Ciudad de México",
        state: "CDMX",
        postCode: "01000",
        phone: phone || "5512345678"
      },
      
      name: firstName,
      last_name: lastName || firstName,
      email_client: email,
      phone_number: phone || "5512345678",
      
      currency: "MXN",
      
      cart: {
        total: parseFloat(amount),
        items: [{
          description: "Job Application Payment",
          quantity: 1,
          price_unit: parseFloat(amount),
          discount: 0,
          taxes: 0,
          product_reference: "JOB-001",
          name: "Job Application",
          amount_total: parseFloat(amount)
        }]
      },
      
      items: [{
        description: "Job Application Payment",
        quantity: 1,
        price_unit: parseFloat(amount),
        discount: 0,
        taxes: 0,
        product_reference: "JOB-001",
        name: "Job Application",
        amount_total: parseFloat(amount)
      }],
      
      metadata: {
        operation_date: new Date().toISOString(),
        customer_email: email,
        business_user: "empleosafari_user",
        customer_id: customerId,
        payment_type: formData.paymentType || "job_unlock"
      },
      
      order_reference: orderReference,
      order_id: orderId,
      payment_id: paymentId,
      business_id: businessId,
      
      payment_method: normalizedMethod,
      return_url: `${window.location.origin}/pagos/success`,
      id_product: "no_id",
      quantity_product: 1,
      id_ship: "0",
      instance_id_ship: "0",
      title_ship: "shipping",
      description: "Job application payment",
      device_session_id: null,
      token_id: "",
      source: "sdk",
      
      browser_info: getBrowserInfo(),
      
      identification: {
        type: "SSN",
        number: "123456789"
      },
      
      apm_config: {}
    };
  },

  async processPayment(paymentData) {
    const checkout = await getCheckoutInstance();
    
    if (!checkout) {
      throw new Error('Tonder SDK not initialized');
    }

    try {
      const response = await checkout.payment(paymentData);
      
      console.log('Payment response received:', response);
      
      if (response.status === 500) {
        throw new Error(response.message || 'Payment provider error');
      }
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return { success: true, data: response };
    } catch (error) {
      console.error('Payment error:', error);
      return { 
        success: false, 
        error: error.message || 'Payment failed' 
      };
    }
  },

  handlePaymentResponse(response) {
    if (response.next_action?.redirect_to_url?.url) {
      return {
        requiresRedirect: true,
        url: response.next_action.redirect_to_url.url,
        type: 'next_action'
      };
    }
    
    if (response.checkout_url) {
      return {
        requiresRedirect: true,
        url: response.checkout_url,
        type: 'checkout'
      };
    }
    
    if (response.payment_url) {
      return {
        requiresRedirect: true,
        url: response.payment_url,
        type: 'payment'
      };
    }
    
    if (response.redirect_url) {
      return {
        requiresRedirect: true,
        url: response.redirect_url,
        type: 'redirect'
      };
    }
    
    return {
      requiresRedirect: false,
      checkoutId: response.checkout_id,
      transactionId: response.transaction?.id || response.id
    };
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
      console.error('Failed to save card:', error);
      return { success: false, error: error.message || 'Failed to save card' };
    }
  },

  async getCustomerCards() {
    const checkout = await getCheckoutInstance();
    
    if (!checkout) {
      throw new Error('Tonder SDK not initialized');
    }

    try {
      const cards = await checkout.getCustomerCards();
      return { success: true, data: cards };
    } catch (error) {
      console.error('Failed to get cards:', error);
      return { success: false, error: error.message };
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
