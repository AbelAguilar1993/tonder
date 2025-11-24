/**
 * Clicky Analytics Utility
 * Provides functions for tracking goals and events with Clicky analytics
 */

// Check if we're in the browser environment
const isBrowser = typeof window !== "undefined";

/**
 * Track a goal in Clicky analytics
 * @param {string} goalId - The goal ID to track
 */
export const trackGoal = (goalId) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      window.clicky.goal(goalId);
    } else {
      console.warn("Clicky not loaded yet. Goal tracking skipped:", {
        goalId,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky goal:", error);
  }
};

/**
 * Track a custom event in Clicky analytics
 * @param {string} eventName - The event name to track
 * @param {Object} properties - Optional properties object
 */
export const trackEvent = (eventName, properties = {}) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      window.clicky.log(eventName, properties);
    } else {
      console.warn("Clicky not loaded yet. Event tracking skipped:", {
        eventName,
        properties,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky event:", error);
  }
};

/**
 * Track page view with custom title
 * @param {string} title - Custom page title
 * @param {string} url - Custom URL (optional)
 */
export const trackPageView = (title, url = null) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      if (url) {
        window.clicky.log(title, url);
      } else {
        window.clicky.log(title);
      }
    } else {
      console.warn("Clicky not loaded yet. Page view tracking skipped:", {
        title,
        url,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky page view:", error);
  }
};

/**
 * Track outbound link clicks
 * @param {string} url - The URL being clicked
 * @param {string} linkText - Optional link text
 */
export const trackOutboundLink = (url, linkText = "") => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      window.clicky.log(`outbound_${url}`, linkText);
    } else {
      console.warn("Clicky not loaded yet. Outbound link tracking skipped:", {
        url,
        linkText,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky outbound link:", error);
  }
};

/**
 * Track file downloads
 * @param {string} fileName - The name of the file being downloaded
 * @param {string} fileType - The type of file (e.g., 'pdf', 'doc', 'image')
 */
export const trackDownload = (fileName, fileType = "") => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      window.clicky.log(`download_${fileName}`, fileType);
    } else {
      console.warn("Clicky not loaded yet. Download tracking skipped:", {
        fileName,
        fileType,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky download:", error);
  }
};

/**
 * Track search queries
 * @param {string} query - The search query
 * @param {number} resultsCount - Number of results returned (optional)
 */
export const trackSearch = (query, resultsCount = null) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      const eventData = resultsCount
        ? { query, results: resultsCount }
        : { query };
      window.clicky.log("search", eventData);
    } else {
      console.warn("Clicky not loaded yet. Search tracking skipped:", {
        query,
        resultsCount,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky search:", error);
  }
};

/**
 * Track form submissions
 * @param {string} formName - The name/ID of the form
 * @param {boolean} success - Whether the submission was successful
 * @param {Object} formData - Optional form data (be careful with sensitive data)
 */
export const trackFormSubmission = (
  formName,
  success = true,
  formData = {},
) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      const eventData = {
        form: formName,
        success,
        ...formData,
      };
      window.clicky.log("form_submission", eventData);
    } else {
      console.warn("Clicky not loaded yet. Form submission tracking skipped:", {
        formName,
        success,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky form submission:", error);
  }
};

/**
 * Track user registration/signup
 * @param {string} method - Registration method (e.g., 'email', 'google', 'facebook')
 * @param {Object} userData - Optional user data (be careful with sensitive data)
 */
export const trackSignup = (method, userData = {}) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      const eventData = {
        method,
        ...userData,
      };
      window.clicky.log("signup", eventData);
    } else {
      console.warn("Clicky not loaded yet. Signup tracking skipped:", {
        method,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky signup:", error);
  }
};

/**
 * Track user login
 * @param {string} method - Login method (e.g., 'email', 'google', 'facebook')
 */
export const trackLogin = (method) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      window.clicky.log("login", { method });
    } else {
      console.warn("Clicky not loaded yet. Login tracking skipped:", {
        method,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky login:", error);
  }
};

/**
 * Track job application events
 * @param {string} jobId - The ID of the job being applied to
 * @param {string} companyName - The name of the company
 * @param {string} action - The action taken (e.g., 'view', 'apply', 'save')
 */
export const trackJobAction = (jobId, companyName, action) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      const eventData = {
        jobId,
        company: companyName,
        action,
      };
      window.clicky.log("job_action", eventData);
    } else {
      console.warn("Clicky not loaded yet. Job action tracking skipped:", {
        jobId,
        companyName,
        action,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky job action:", error);
  }
};

/**
 * Track contact unlock events
 * @param {string} contactId - The ID of the contact being unlocked
 * @param {string} companyName - The name of the company
 */
export const trackContactUnlock = (contactId, companyName) => {
  if (!isBrowser) return;

  try {
    if (window.clicky) {
      const eventData = {
        contactId,
        company: companyName,
      };
      window.clicky.log("contact_unlock", eventData);
    } else {
      console.warn("Clicky not loaded yet. Contact unlock tracking skipped:", {
        contactId,
        companyName,
      });
    }
  } catch (error) {
    console.error("Error tracking Clicky contact unlock:", error);
  }
};

// Export all functions as default object for easier importing
export default {
  trackGoal,
  trackEvent,
  trackPageView,
  trackOutboundLink,
  trackDownload,
  trackSearch,
  trackFormSubmission,
  trackSignup,
  trackLogin,
  trackJobAction,
  trackContactUnlock,
};
