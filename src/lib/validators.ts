import { z } from "zod/v4";

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email().optional(),
  degree: z.string().min(1).optional(),
  graduationYear: z.number().int().min(2020).max(2035).optional(),
  currentRole: z.string().nullable().optional(),
  currentCompany: z.string().nullable().optional(),
  targetRoles: z.array(z.string()).optional(),
  employmentTypes: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  minExperience: z.number().int().min(0).optional(),
  maxExperience: z.number().int().min(0).optional(),
  locations: z.array(z.string()).optional(),
});

export const jobFiltersSchema = z.object({
  search: z.string().optional(),
  company: z.string().optional(),
  employmentType: z.enum(["INTERNSHIP", "FULL_TIME", "CONTRACT", "UNKNOWN"]).optional(),
  matchCategory: z.enum(["STRONG", "POSSIBLE", "LOW", "INELIGIBLE", "NEEDS_REVIEW"]).optional(),
  listingStatus: z.enum(["OPEN", "CLOSED", "UNVERIFIED", "STALE"]).optional(),
  isRemote: z.coerce.boolean().optional(),
  locationScope: z.enum(["india_or_remote", "india", "remote", "all"]).optional(),
  includeIneligible: z.coerce.boolean().optional(),
  roleLevel: z.enum(["intern_or_fresher", "intern", "fresher", "all"]).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sortBy: z.enum(["newest", "score", "company", "title"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const saveJobSchema = z.object({
  jobId: z.string().min(1),
});

export const createApplicationSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(["SAVED", "APPLIED", "ONLINE_ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]).optional(),
  notes: z.string().nullable().optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(["SAVED", "APPLIED", "ONLINE_ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]).optional(),
  notes: z.string().nullable().optional(),
  followUpDate: z.coerce.date().nullable().optional(),
  appliedAt: z.coerce.date().nullable().optional(),
});
