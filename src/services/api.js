import axios from "axios";

/**
 * API Configuration and Base Service
 * Provides a centralized HTTP client with interceptors, error handling, and authentication
 */

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://apoyoalempleo.quiniela.workers.dev/api";
const API_TIMEOUT = 30000; // 30 seconds

// Log API URL in development for debugging
if (process.env.NODE_ENV === "development") {
  console.log("🔗 API Base URL:", API_BASE_URL);
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management
const TOKEN_KEY = "auth_token";

export const tokenManager = {
  getToken: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  setToken: (token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  removeToken: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
};

// Request interceptor to add authentication token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    // if (process.env.NODE_ENV === "development") {
    //   console.log(
    //     `🚀 ${config.method?.toUpperCase()} ${config.url}`,
    //     config.data,
    //   );
    // }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling and token management
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    // if (process.env.NODE_ENV === "development") {
    //   console.log(
    //     `✅ ${response.config.method?.toUpperCase()} ${response.config.url}`,
    //     response.data,
    //   );
    // }

    return response;
  },
  (error) => {
    const { response, config } = error;

    // Log errors in development
    if (process.env.NODE_ENV === "development") {
      console.error(
        `❌ ${config?.method?.toUpperCase()} ${config?.url}`,
        error,
      );
    }

    // Handle different error scenarios
    if (response) {
      const { status, data } = response;

      switch (status) {
        case 401:
          // Unauthorized - remove token and user data
          tokenManager.removeToken();
          if (typeof window !== "undefined") {
            // Also remove user data from localStorage
            localStorage.removeItem("user_data");
            // Dispatch custom event for auth context to handle
            window.dispatchEvent(new CustomEvent("auth:unauthorized"));
          }
          break;

        case 403:
          // Forbidden - user doesn't have permission
          console.warn(
            "Access forbidden:",
            data?.message || "Insufficient permissions",
          );
          break;

        case 404:
          // Not found
          console.warn("Resource not found:", config?.url);
          break;

        case 422:
          // Validation errors
          console.warn("Validation error:", data?.errors || data?.message);
          break;

        case 429:
          // Rate limiting
          console.warn("Rate limit exceeded. Please try again later.");
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error(
            "Server error:",
            data?.message || "Internal server error",
          );
          break;
      }

      // Create standardized error object while preserving original response
      const apiError = {
        status,
        message: data?.error || data?.message || "An error occurred",
        errors: data?.errors || null,
        code: data?.code || null,
        timestamp: new Date().toISOString(),
        // Preserve original response structure for compatibility
        response: {
          data,
          status,
          statusText: response.statusText,
        },
      };

      return Promise.reject(apiError);
    } else if (error.code === "ECONNABORTED") {
      // Timeout error
      return Promise.reject({
        status: 408,
        message: "Request timeout. Please check your connection and try again.",
        code: "TIMEOUT",
        timestamp: new Date().toISOString(),
      });
    } else if (error.code === "ERR_NETWORK") {
      // Network error
      return Promise.reject({
        status: 0,
        message: "Network error. Please check your connection.",
        code: "NETWORK_ERROR",
        timestamp: new Date().toISOString(),
      });
    }

    // Unknown error
    return Promise.reject({
      status: 0,
      message: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
      timestamp: new Date().toISOString(),
    });
  },
);

/**
 * Generic API methods
 */
export const api = {
  // GET request
  get: async (url, config = {}) => {
    try {
      const response = await apiClient.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PATCH request
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await apiClient.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // File upload
  upload: async (url, formData, onUploadProgress = null) => {
    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      if (onUploadProgress) {
        config.onUploadProgress = onUploadProgress;
      }

      const response = await apiClient.post(url, formData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // File upload with PUT method
  uploadPut: async (url, formData, onUploadProgress = null) => {
    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      if (onUploadProgress) {
        config.onUploadProgress = onUploadProgress;
      }

      const response = await apiClient.put(url, formData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Download file
  download: async (url, filename) => {
    try {
      const response = await apiClient.get(url, {
        responseType: "blob",
      });

      // Create blob link to download
      const blob = new Blob([response.data]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      return true;
    } catch (error) {
      throw error;
    }
  },
};

// Export the configured axios instance for advanced usage
export { apiClient };
export default api;
