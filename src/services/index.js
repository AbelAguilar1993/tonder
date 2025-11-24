/**
 * API Services Index
 * Central export point for all API services
 */

// Core API utilities
export { default as api, tokenManager, apiClient } from "./api";

// Authentication services
export { default as authService } from "./authService";

// Business domain services
export { default as companiesService } from "./companiesService";
export { default as jobsService } from "./jobsService";
export { default as contactsService } from "./contactsService";
export { default as adminService } from "./adminService";
export { default as profileService } from "./profileService";
export { default as jobApplicationsService } from "./jobApplicationsService";
export { default as gptService } from "./gptService";
export { default as paymentsService } from "./paymentsService";
export { default as contactService } from "./contactService";
export { default as supportService } from "./supportService";
export { default as creditsService } from "./creditsService";

// Re-export all services as a single object for convenience
import authService from "./authService";
import companiesService from "./companiesService";
import jobsService from "./jobsService";
import contactsService from "./contactsService";
import adminService from "./adminService";
import profileService from "./profileService";
import jobApplicationsService from "./jobApplicationsService";
import gptService from "./gptService";
import paymentsService from "./paymentsService";
import contactService from "./contactService";
import supportService from "./supportService";
import creditsService from "./creditsService";

export const services = {
  auth: authService,
  companies: companiesService,
  jobs: jobsService,
  contacts: contactsService,
  admin: adminService,
  profile: profileService,
  jobApplications: jobApplicationsService,
  gpt: gptService,
  payments: paymentsService,
  contact: contactService,
  support: supportService,
  credits: creditsService,
};

export default services;
