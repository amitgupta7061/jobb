import { isEntryLevelRole, isExperiencedLevelTitle, isTechnicalRole } from "./titles";

export interface EligibilityResult {
  isEligible: boolean;
  hardFailReason?: string;
  gradScore: number;
  roleScore: number;
  skillScore: number;
  locationScore: number;
  experienceScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchReasons: string[];
  concerns: string[];
}

export interface MatchInput {
  title: string;
  description: string | null;
  locations: string[];
  isRemote: boolean;
  remoteRestrictions: string | null;
  employmentType: string;
}

export interface ProfileInput {
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
}

// Check hard fails
export function checkHardFails(
  job: MatchInput,
  profile: ProfileInput
): { hardFail: boolean; reason?: string } {
  const text = `${job.title} ${job.description || ""}`.toLowerCase();

  // 1. Non-technical role
  if (!isTechnicalRole(job.title)) {
    return { hardFail: true, reason: "Non-technical role (Sales/HR/Marketing/Support)" };
  }

  // 2. High seniority / 2+ years experience required (Strictly 0-1 YOE allowed)
  if (isExperiencedLevelTitle(job.title)) {
    return { hardFail: true, reason: `Requires senior/mid-level experience (${job.title})` };
  }

  const expMatches = text.match(
    /(\d+)\+?\s*(?:years?|yrs?|yr)\s+(?:of\s+)?(?:relevant\s+)?(?:professional\s+)?(?:work\s+)?experience/gi
  );
  if (expMatches) {
    for (const match of expMatches) {
      const numMatch = match.match(/(\d+)/);
      if (numMatch) {
        const years = parseInt(numMatch[1], 10);
        if (years >= 2) {
          return {
            hardFail: true,
            reason: `Requires ${years}+ years of experience, exceeding 0-1 year requirement`,
          };
        }
      }
    }
  }

  // 3. Grad year conflicts (e.g. explicitly restricted to 2024 or 2025 or 2026 graduates only)
  const gradMatch = text.match(/batch\s*(?:of)?\s*(202[0-6])/i) ||
                    text.match(/graduating\s*(?:in|class of)?\s*(202[0-6])/i) ||
                    text.match(/class\s*of\s*(202[0-6])/i);
  if (gradMatch && !text.includes("2027")) {
    const year = parseInt(gradMatch[1], 10);
    if (year !== profile.graduationYear) {
      return {
        hardFail: true,
        reason: `Explicitly requires ${year} batch; you are graduating in ${profile.graduationYear}`,
      };
    }
  }

  // 4. Experienced / mid-level engineering roles (must be 0-1 year entry level or intern)
  if (!isEntryLevelRole(job.title, job.employmentType, job.description)) {
    return {
      hardFail: true,
      reason: "Not an internship, fresher, or new-grad / 0-1 year role",
    };
  }

  // 5. Ineligible geographic restrictions (e.g. US citizen / green card only, no India)
  const usOnlyTerms = [
    "must be a us citizen",
    "u.s. citizen only",
    "requires security clearance",
    "us work authorization required without sponsorship",
    "must reside in the united states",
    "must be located in the united states",
    "must live in the united states",
    "uk right to work",
  ];
  for (const term of usOnlyTerms) {
    if (text.includes(term) && !isJobInIndia(job)) {
      return {
        hardFail: true,
        reason: "Requires US/EU citizenship or local work authorization without sponsorship",
      };
    }
  }

  // 6. Geographic Hard Fail: Job must be located in India or be remote open to India
  const inIndia = isJobInIndia(job);
  const eligibleRemote = isEligibleRemote(job);

  if (!inIndia && !eligibleRemote) {
    const locName = job.locations.length > 0 ? job.locations.join(", ") : "Foreign onsite/hybrid location";
    return {
      hardFail: true,
      reason: `Location is ${locName} (not located in India or remote open to India candidates)`,
    };
  }

  return { hardFail: false };
}

export const INDIA_LOCATION_KEYWORDS = [
  "india", "bengaluru", "bangalore", "hyderabad", "pune",
  "gurugram", "gurgaon", "noida", "mumbai", "delhi", "new delhi",
  "chennai", "kolkata", "ahmedabad", "chandigarh", "jaipur",
  "kochi", "coimbatore", "trivandrum", "indore",
];

export function isJobInIndia(job: MatchInput): boolean {
  const combined = `${job.locations.join(" ")} ${job.title} ${job.remoteRestrictions || ""}`.toLowerCase();
  return INDIA_LOCATION_KEYWORDS.some((kw) => combined.includes(kw));
}

const FOREIGN_LOCATION_PATTERN =
  /\b(united states|usa|u\.s\.a?|us|ea|canada|united kingdom|uk|england|scotland|germany|france|netherlands|ireland|australia|singapore|japan|south korea|brazil|mexico|spain|sweden|switzerland|israel|uae|dubai|london|new york|san francisco|seattle|austin|denver|boston|chicago|toronto|sydney|melbourne|berlin|amsterdam|dublin|california|texas|washington|emea|latam|americas)\b/i;

export function isEligibleRemote(job: MatchInput): boolean {
  const combinedLoc = `${job.locations.join(" ")} ${job.title} ${job.remoteRestrictions || ""}`.toLowerCase();
  const isRemote = job.isRemote || combinedLoc.includes("remote");
  if (!isRemote) return false;

  // Remote explicitly mentioned with India
  const hasIndia = isJobInIndia(job);
  if (hasIndia) return true;

  // If remote is explicitly bound to a foreign country (e.g. "Remote - US", "Remote - Ireland", "EMEA"), reject
  if (FOREIGN_LOCATION_PATTERN.test(combinedLoc)) {
    return false;
  }

  // Unrestricted / global remote (e.g., "Remote", "Remote - Global", "Anywhere") is eligible
  return true;
}

/** Split "Bengaluru, India" or "Onsite in Bangalore" into tokens so exact array filters match. */
export function expandLocationTokens(locations: string[]): string[] {
  const tokens = new Set<string>();
  for (const loc of locations) {
    const trimmed = loc.trim();
    if (!trimmed) continue;
    tokens.add(trimmed);
    for (const part of trimmed.split(/[,|/]+/)) {
      const piece = part.trim();
      if (piece) tokens.add(piece);
    }
    const lower = loc.toLowerCase();
    for (const city of INDIA_LOCATION_KEYWORDS) {
      if (lower.includes(city)) {
        tokens.add(city.charAt(0).toUpperCase() + city.slice(1));
        tokens.add("India");
      }
    }
  }
  return Array.from(tokens);
}
