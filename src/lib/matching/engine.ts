import { MatchCategory } from "@/types";
import { isInternshipTitle, isNewGradTitle, isTargetRole } from "./titles";
import { checkHardFails, isJobInIndia, isEligibleRemote, MatchInput, ProfileInput, EligibilityResult } from "./rules";

export interface MatchScoreResult {
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
}

export function computeJobMatch(
  job: MatchInput,
  profile: ProfileInput
): MatchScoreResult {
  const text = `${job.title} ${job.description || ""}`.toLowerCase();

  // 1. Check Hard Fails
  const hardFailCheck = checkHardFails(job, profile);
  if (hardFailCheck.hardFail) {
    return {
      overallScore: 0,
      matchCategory: "INELIGIBLE",
      gradScore: 0,
      roleScore: 0,
      skillScore: 0,
      locationScore: 0,
      experienceScore: 0,
      matchReasons: [],
      missingSkills: [],
      concerns: [hardFailCheck.reason || "Hard eligibility constraint violated"],
    };
  }

  const matchReasons: string[] = [];
  const concerns: string[] = [];

  // ==========================================
  // A. Graduation Batch & Degree (Weight: 25%)
  // ==========================================
  let gradScore = 70; // baseline if unspecified
  const mentions2027 = text.includes("2027");
  const isIntern = isInternshipTitle(job.title);
  const isNewGrad = isNewGradTitle(job.title);

  if (mentions2027) {
    gradScore = 100;
    matchReasons.push("Explicitly mentions 2027 graduation batch");
  } else if (isIntern) {
    gradScore = 95;
    matchReasons.push("Internship role suited for a 4th-year B.Tech student");
  } else if (isNewGrad) {
    gradScore = 90;
    matchReasons.push("Fresher / new-grad / campus program");
  }

  // Degree check
  if (text.includes("computer science") || text.includes("b.tech") || text.includes("btech") || text.includes("engineering")) {
    gradScore = Math.min(100, gradScore + 5);
    matchReasons.push("Computer Science / Engineering degree preferred");
  }

  // ==========================================
  // B. Role & Experience Level (Weight: 25%)
  // ==========================================
  let roleScore = 60;
  if (isTargetRole(job.title, profile.targetRoles)) {
    roleScore = 95;
    matchReasons.push(`Matches target role: "${job.title}"`);
  } else {
    concerns.push("Job title does not directly match target role list");
  }

  // Check 0-1 years exp
  if (text.includes("0-1") || text.includes("0 to 1") || text.includes("1 year") || isIntern || isNewGrad) {
    roleScore = Math.min(100, roleScore + 5);
  }

  // ==========================================
  // C. Technical Skills (Weight: 30%)
  // ==========================================
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  // Key skills from profile to search for
  const skillsToInspect = profile.skills;
  for (const skill of skillsToInspect) {
    const skillPattern = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, "i");
    if (skillPattern.test(text)) {
      matchedSkills.push(skill);
    }
  }

  let skillScore = 50; // base score if no specific stack mentioned
  if (matchedSkills.length > 0) {
    // 5+ matched skills = 100%, 3 = 85%, 2 = 70%, 1 = 60%
    skillScore = Math.min(100, 50 + matchedSkills.length * 10);
    matchReasons.push(`Matched skills: ${matchedSkills.slice(0, 5).join(", ")}`);
  } else {
    concerns.push("Few or no profile skills detected in job text");
  }

  // Detect common required tech not in profile
  const commonOtherTech = ["Go", "Golang", "Rust", "Ruby", "PHP", "Scala", "Swift", "Kotlin", "C#", ".NET"];
  for (const other of commonOtherTech) {
    const pattern = new RegExp(`\\b${escapeRegExp(other.toLowerCase())}\\b`, "i");
    if (pattern.test(text) && !matchedSkills.map(s => s.toLowerCase()).includes(other.toLowerCase())) {
      missingSkills.push(other);
    }
  }

  // ==========================================
  // D. Location & Remote Arrangement (Weight: 10%)
  // ==========================================
  let locationScore = 50;
  const inIndia = isJobInIndia(job);
  const eligibleRemote = isEligibleRemote(job);

  if (inIndia) {
    locationScore = 100;
    matchReasons.push("Located in India (onsite/hybrid/remote)");
  } else if (eligibleRemote) {
    locationScore = 95;
    matchReasons.push("Remote position open to candidates residing in India");
  } else {
    locationScore = 0;
    concerns.push(`Location outside India: ${job.locations.join(", ") || "Unspecified"}`);
  }

  // ==========================================
  // E. Internship & Project Experience (Weight: 10%)
  // ==========================================
  let experienceScore = 70;
  if (profile.currentCompany && text.includes(profile.currentCompany.toLowerCase())) {
    experienceScore = 100;
    matchReasons.push(`Role at your current organization (${profile.currentCompany})`);
  } else if (isIntern || isNewGrad) {
    experienceScore = 90;
    matchReasons.push("Previous intern experience at ServiceNow is strong qualification");
  }

  // ==========================================
  // Weighted Score Calculation
  // ==========================================
  // Grad: 25%, Role: 25%, Skills: 30%, Location: 10%, Experience: 10%
  const overallScore = Math.round(
    gradScore * 0.25 +
    roleScore * 0.25 +
    skillScore * 0.30 +
    locationScore * 0.10 +
    experienceScore * 0.10
  );

  let matchCategory: MatchCategory = "LOW";
  // Strong match strictly requires India eligibility or confirmed remote
  if (overallScore >= 75 && (inIndia || eligibleRemote)) {
    matchCategory = "STRONG";
  } else if (overallScore >= 55 && (inIndia || eligibleRemote)) {
    matchCategory = "POSSIBLE";
  } else if (overallScore >= 35) {
    matchCategory = "LOW";
  } else {
    matchCategory = "INELIGIBLE";
  }

  return {
    overallScore,
    matchCategory,
    gradScore,
    roleScore,
    skillScore,
    locationScore,
    experienceScore,
    matchReasons,
    missingSkills: missingSkills.slice(0, 4),
    concerns,
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
