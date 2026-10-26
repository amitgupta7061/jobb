// Types shared across the application

// ============ Enums ============

export type AtsType = "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "CUSTOM" | "NONE";

export type EmploymentType = "INTERNSHIP" | "FULL_TIME" | "CONTRACT" | "UNKNOWN";

export type ListingStatus = "OPEN" | "CLOSED" | "UNVERIFIED" | "STALE";

export type MatchCategory = "STRONG" | "POSSIBLE" | "LOW" | "INELIGIBLE" | "NEEDS_REVIEW";

export type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "ONLINE_ASSESSMENT"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export type CollectionRunStatus = "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";

// ============ Interfaces ============

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  degree: string;
  graduationYear: number;
  currentRole: string | null;
  currentCompany: string | null;
  targetRoles: string[];
  employmentTypes: string[];
  skills: string[];
  minExperience: number;
  maxExperience: number;
  locations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyData {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  careersUrl: string | null;
  logoUrl: string | null;
  atsType: AtsType;
  atsBoardId: string | null;
  isActive: boolean;
  priority: number;
  lastCollectedAt: Date | null;
  lastSuccessAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobData {
  id: string;
  externalId: string;
  companyId: string;
  sourceId: string | null;
  title: string;
  normalizedTitle: string | null;
  description: string | null;
  descriptionHtml: string | null;
  locations: string[];
  isRemote: boolean;
  remoteRestrictions: string | null;
  employmentType: EmploymentType;
  experienceMin: number | null;
  experienceMax: number | null;
  requiredSkills: string[];
  preferredSkills: string[];
  eligibleGradYears: number[];
  degreeRequirements: string | null;
  applicationUrl: string;
  sourcePostedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastVerifiedAt: Date | null;
  listingStatus: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  company?: CompanyData;
  match?: JobMatchData | null;
  savedJob?: { id: string } | null;
  application?: ApplicationData | null;
}

export interface JobMatchData {
  id: string;
  jobId: string;
  profileId: string;
  overallScore: number;
  matchCategory: MatchCategory;
  gradScore: number;
  roleScore: number;
  skillScore: number;
  locationScore: number;
  experienceScore: number;
  matchReasons: string[];
  missingSkills: string[];
  concerns: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationData {
  id: string;
  jobId: string;
  profileId: string;
  status: ApplicationStatus;
  appliedAt: Date | null;
  notes: string | null;
  followUpDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  job?: JobData;
}

export interface CollectionRunData {
  id: string;
  companyId: string;
  startedAt: Date;
  completedAt: Date | null;
  status: CollectionRunStatus;
  jobsFound: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsUnchanged: number;
  errors: Record<string, unknown> | null;
  durationMs: number | null;
}

// ============ API Types ============

export interface JobFilters {
  search?: string;
  company?: string;
  location?: string;
  employmentType?: EmploymentType;
  matchCategory?: MatchCategory;
  listingStatus?: ListingStatus;
  isRemote?: boolean;
  isSaved?: boolean;
  isApplied?: boolean;
  minScore?: number;
  graduationYear?: number;
  sortBy?: "newest" | "score" | "company" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  newToday: number;
  strongMatches: number;
  possibleMatches: number;
  savedJobs: number;
  appliedJobs: number;
  totalJobs: number;
  activeCompanies: number;
  lastSyncAt: Date | null;
}

// ============ Normalized Job (from adapters) ============

export interface NormalizedJob {
  externalId: string;
  title: string;
  description: string | null;
  descriptionHtml: string | null;
  locations: string[];
  isRemote: boolean;
  remoteRestrictions: string | null;
  employmentType: EmploymentType;
  applicationUrl: string;
  sourcePostedAt: Date | null;
  requiredSkills: string[];
  preferredSkills: string[];
  rawData: Record<string, unknown>;
}
