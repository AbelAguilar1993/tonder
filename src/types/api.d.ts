/**
 * TypeScript type definitions for API responses and data structures
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Base API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: any;
  };
}

// Error response structure
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]> | null;
  code?: string | null;
  timestamp: string;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
}

// Company types
export interface Company {
  id: string;
  name: string;
  slug: string;
  description: string;
  website: string;
  industry: string;
  location: string[];
  size: CompanySize;
  type: CompanyType;
  founded?: number;
  email?: string;
  phone?: string;
  logo?: string;
  banner?: string;
  verified: boolean;
  rating?: number;
  reviewCount?: number;
  jobCount?: number;
  followersCount?: number;
  address?: Address;
  benefits?: string[];
  technologies?: string[];
  socialLinks?: SocialLinks;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCreateData {
  name: string;
  description: string;
  website: string;
  industry: string;
  location: string[];
  slug?: string;
  size?: CompanySize;
  type?: CompanyType;
  founded?: number;
  email?: string;
  phone?: string;
  address?: Address;
  benefits?: string[];
  technologies?: string[];
  socialLinks?: SocialLinks;
  logo?: File;
  banner?: File;
}

export type CompanySize =
  | "startup"
  | "small"
  | "medium"
  | "large"
  | "enterprise";
export type CompanyType =
  | "public"
  | "private"
  | "nonprofit"
  | "government"
  | "startup";

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
}

// Job types
export interface Job {
  id: string;
  title: string;
  description: string;
  company: Company;
  location: string[];
  type: JobType;
  category: string;
  level: ExperienceLevel;
  salary?: number;
  salaryType?: SalaryType;
  requirements?: string[];
  benefits?: string[];
  deadline?: string;
  status: JobStatus;
  applicationsCount?: number;
  viewsCount?: number;
  saved?: boolean;
  applied?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobCreateData {
  title: string;
  description: string;
  company: string;
  location: string[];
  type: JobType;
  category: string;
  level: ExperienceLevel;
  salary?: number;
  salaryType?: SalaryType;
  requirements?: string[];
  benefits?: string[];
  deadline?: string;
}

export type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship"
  | "freelance"
  | "remote";
export type ExperienceLevel =
  | "entry"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "executive";
export type SalaryType = "hourly" | "monthly" | "annual";
export type JobStatus = "active" | "paused" | "closed" | "draft";

export interface JobApplication {
  id: string;
  job: Job;
  user: User;
  coverLetter?: string;
  resumeUrl?: string;
  additionalInfo?: Record<string, any>;
  status: ApplicationStatus;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected"
  | "withdrawn";

// Contact types
export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  company?: string;
  type?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  category: string;
  status: TicketStatus;
  user?: User;
  assignedTo?: User;
  attachments?: string[];
  replies?: TicketReply[];
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketCreateData {
  subject: string;
  description: string;
  priority: TicketPriority;
  category: string;
  attachments?: File[];
}

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "pending" | "resolved" | "closed";

export interface TicketReply {
  id: string;
  message: string;
  user: User;
  attachments?: string[];
  createdAt: string;
}

export interface CompanyReview {
  id: string;
  company: Company;
  user?: User;
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  position?: string;
  anonymous: boolean;
  verified: boolean;
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyReviewCreateData {
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  position?: string;
  anonymous?: boolean;
}

// Employee types
export interface Employee {
  id: string;
  user: User;
  company: Company;
  role: string;
  department?: string;
  permissions: string;
  joinedAt: string;
  createdAt: string;
}

export interface EmployeeCreateData {
  email: string;
  role: string;
  department?: string;
  permissions: string;
}

// Search and filter types
export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CompanySearchParams extends SearchParams {
  industry?: string;
  location?: string;
  size?: CompanySize;
  type?: CompanyType;
  verified?: boolean;
  minRating?: number;
}

export interface JobSearchParams extends SearchParams {
  category?: string;
  location?: string;
  type?: JobType;
  level?: ExperienceLevel;
  company?: string;
  minSalary?: number;
  maxSalary?: number;
}

// Newsletter types
export interface NewsletterSubscription {
  email: string;
  name?: string;
  interests?: string[];
  frequency?: "daily" | "weekly" | "monthly";
}

// FAQ types
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

// Report types
export interface Report {
  type: "spam" | "inappropriate" | "fake" | "harassment" | "other";
  resourceType: "job" | "company" | "user" | "review";
  resourceId: string;
  description: string;
  evidence?: File[];
}

// Statistics types
export interface CompanyStats {
  jobsPosted: number;
  applicationsReceived: number;
  hires: number;
  followers: number;
  reviews: number;
  averageRating: number;
  profileViews: number;
}

export interface JobStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  jobsByCategory: Record<string, number>;
  jobsByType: Record<string, number>;
  averageSalary: number;
}

// Upload progress callback type
export type UploadProgressCallback = (progressEvent: ProgressEvent) => void;
