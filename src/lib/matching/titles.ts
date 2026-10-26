const TITLE_GROUPS: Record<string, string[]> = {
  "Intern": [
    "intern", "internship", "summer intern", "winter intern",
    "co-op", "practicum", "apprentice",
  ],
  "Associate Software Engineer": [
    "associate software engineer", "ase", "junior software engineer",
    "junior developer", "associate developer", "associate sde",
  ],
  "Graduate Engineer Trainee": [
    "graduate engineer trainee", "get", "graduate trainee",
    "management trainee", "engineering trainee",
  ],
  "New Grad Engineer": [
    "new grad", "new graduate", "university grad", "campus hire",
    "graduate engineer", "graduate software engineer",
    "early career", "entry level engineer", "entry-level",
  ],
  "Software Engineer": [
    "software engineer", "software developer", "sde", "swe",
    "software development engineer", "application developer",
    "software engineering", "development engineer",
  ],
  "Backend Engineer": [
    "backend engineer", "back-end engineer", "backend developer",
    "server engineer", "api engineer", "server-side engineer",
  ],
  "Full-Stack Engineer": [
    "full-stack engineer", "full stack engineer", "fullstack engineer",
    "full-stack developer", "full stack developer",
  ],
  "Frontend Engineer": [
    "frontend engineer", "front-end engineer", "frontend developer",
    "ui engineer", "ui developer",
  ],
  "Platform Engineer": [
    "platform engineer", "infrastructure engineer", "platform developer",
  ],
  "Cloud Engineer": [
    "cloud engineer", "cloud developer", "cloud infrastructure",
  ],
  "DevOps Engineer": [
    "devops engineer", "devops", "site reliability engineer", "sre",
    "infrastructure engineer", "release engineer",
  ],
  "Data Engineer": [
    "data engineer", "data pipeline engineer", "etl engineer",
  ],
};

// Non-technical roles to exclude
const NON_TECHNICAL_KEYWORDS = [
  "recruiter", "talent acquisition", "hr ", "human resources",
  "sales", "account executive", "account manager", "business development",
  "marketing", "content writer", "copywriter", "social media",
  "finance", "accountant", "auditor", "audit ", "internal audit",
  "legal", "compliance", "counsel",
  "executive assistant", "office manager", "receptionist",
  "customer success", "customer support", "customer experience", "support engineer",
  "chief of staff", "business operations", "operations manager",
  "product manager", "project manager", "program manager",
  "underwriter", "event planner", "workplace",
];

const TECHNICAL_ROLE_KEYWORDS = [
  "engineer", "developer", "sde", "swe", "programmer", "architect",
  "devops", "sre", "platform", "infrastructure", "backend", "frontend",
  "fullstack", "full-stack", "data", "machine learning", "ml ", "ai ",
  "security", "cloud", "systems", "intern", "internship", "co-op", "trainee", "fresher",
];

export function normalizeTitle(title: string): string {
  const lower = title.toLowerCase().trim();

  for (const [normalized, variants] of Object.entries(TITLE_GROUPS)) {
    for (const variant of variants) {
      if (lower.includes(variant)) {
        return normalized;
      }
    }
  }

  return title;
}

export function isTechnicalRole(title: string): boolean {
  const lower = title.toLowerCase();

  // If contains non-technical keywords, reject
  if (NON_TECHNICAL_KEYWORDS.some((kw) => lower.includes(kw))) {
    return false;
  }

  if (isInternshipTitle(title) || isNewGradTitle(title)) {
    return TECHNICAL_ROLE_KEYWORDS.some((kw) => {
      if (kw === "intern" || kw === "internship") return true;
      return lower.includes(kw);
    });
  }

  // Must contain at least one engineering/technical keyword.
  // Do not treat the letters "intern" inside "internal" as a tech role.
  return TECHNICAL_ROLE_KEYWORDS.some((kw) => {
    if (kw === "intern" || kw === "internship") {
      return isInternshipTitle(title);
    }
    return lower.includes(kw);
  });
}

export function isTargetRole(title: string, targetRoles: string[]): boolean {
  const normalized = normalizeTitle(title).toLowerCase();
  const titleLower = title.toLowerCase();

  return targetRoles.some((role) => {
    const roleLower = role.toLowerCase();
    const roleNormalized = normalizeTitle(role).toLowerCase();
    return (
      normalized.includes(roleNormalized) ||
      titleLower.includes(roleLower) ||
      roleNormalized === normalized
    );
  });
}

export function isInternshipTitle(title: string): boolean {
  // Strip "internal" so "Senior Internal Auditor" is not treated as an intern.
  const lower = title.toLowerCase().replace(/\binternal\b/g, " ");
  return /\b(interns?|internship|co-ops?|apprentices?)\b/i.test(lower);
}

export function isNewGradTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes("new grad") ||
    lower.includes("new graduate") ||
    lower.includes("entry level") ||
    lower.includes("entry-level") ||
    lower.includes("graduate engineer") ||
    lower.includes("university grad") ||
    lower.includes("university graduate") ||
    lower.includes("campus hire") ||
    lower.includes("campus") ||
    lower.includes("early career") ||
    lower.includes("fresher") ||
    lower.includes("trainee")
  );
}

/**
 * Mid-career / senior titles a 2027 intern / new-grad should not see.
 * Internship titles are allowed even if they say "Senior Intern".
 */
export function isExperiencedLevelTitle(title: string): boolean {
  if (isInternshipTitle(title) || isNewGradTitle(title)) {
    return false;
  }

  const titleLower = title.toLowerCase();
  const patterns = [
    /\b(staff|principal|distinguished|fellow|director|vp|vice president|lead)\b/,
    /\bhead of\b/,
    /\b(manager|managing|management)\b/,
    /\b(senior|sr\.?)\b/,
    /\b(?:l|level|p|ic)[\s-]*[2-9]\b/,
    /\((?:l|p|ic)[\s-]*[2-9]\)/,
    /\b(?:sde|swe)[\s-]*(?:ii|iii|iv|[2-9])\b/,
    /\bengineer[\s-]*(?:ii|iii|iv|[2-9])\b/,
    /\bengineer\s+[2-9]\b/,
    /\b(architect|consultant|auditor)\b/,
  ];
  return patterns.some((pattern) => pattern.test(titleLower));
}

/**
 * Intern, fresher, new-grad, junior/associate, or SDE-1 style roles a
 * candidate with 0-1 years experience can apply to.
 */
export function isEntryLevelRole(
  title: string,
  employmentType?: string,
  description?: string | null
): boolean {
  if (isExperiencedLevelTitle(title)) {
    return false;
  }

  // Must not be a non-technical role
  if (!isTechnicalRole(title)) {
    return false;
  }

  // Explicit internship or new-grad titles are strictly 0-1 YOE
  if (isInternshipTitle(title) || isNewGradTitle(title)) {
    return true;
  }
  if (employmentType === "INTERNSHIP" && isInternshipTitle(title)) {
    return true;
  }

  const titleLower = title.toLowerCase();
  const titlePatterns = [
    /\bjunior\b/,
    /\bassociate\b/,
    /\base\b/,
    /\bget\b/,
    /\bfresher\b/,
    /\btrainee\b/,
    /\bgraduate\b/,
    /\bsde[\s-]?i\b/,
    /\bsde[\s-]?1\b/,
    /\bswe[\s-]?i\b/,
    /\bswe[\s-]?1\b/,
    /\bengineer[\s-]?i\b/,
    /\bengineer[\s-]?1\b/,
    /\blevel[\s-]?1\b/,
    /\bl1\b/,
    /\bp1\b/,
  ];
  if (titlePatterns.some((pattern) => pattern.test(titleLower))) {
    return true;
  }

  // Check description for explicit 0-1 year experience / fresher indicators
  const text = `${title} ${description || ""}`.toLowerCase();
  const descriptionPatterns = [
    /fresh(?:er| graduate)/,
    /entry[- ]level/,
    /new graduate/,
    /new grad\b/,
    /campus hire/,
    /campus recruit/,
    /university graduate/,
    /early career/,
    /(?<!\d)0\s*[-–—]\s*1(?!\d)\s*years?/,
    /(?<!\d)0\s+to\s+1(?!\d)\s*years?/,
    /less than (?:one|1) years?/,
    /no prior experience/,
    /no experience required/,
    /final year student/,
    /current student/,
    /graduating in 202[67]/,
    /class of 202[67]/,
    /batch of 202[67]/,
  ];
  return descriptionPatterns.some((pattern) => pattern.test(text));
}
