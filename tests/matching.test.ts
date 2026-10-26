import assert from "node:assert";
import test from "node:test";
import { normalizeTitle, isTechnicalRole, isEntryLevelRole, isInternshipTitle, isExperiencedLevelTitle } from "../src/lib/matching/titles";
import { computeJobMatch } from "../src/lib/matching/engine";
import { checkHardFails, expandLocationTokens } from "../src/lib/matching/rules";

const mockProfile = {
  degree: "B.Tech in Computer Science and Engineering",
  graduationYear: 2027,
  currentRole: "Associate Software Engineer Intern",
  currentCompany: "ServiceNow",
  targetRoles: [
    "Intern",
    "Software Engineer Intern",
    "Software Engineer",
    "Software Development Engineer",
    "Associate Software Engineer",
    "Graduate Engineer Trainee",
    "New Grad Engineer",
    "Backend Engineer",
  ],
  employmentTypes: ["INTERNSHIP", "FULL_TIME"],
  skills: ["Java", "Python", "React", "Next.js", "Node.js", "PostgreSQL", "Docker", "REST APIs"],
  minExperience: 0,
  maxExperience: 1,
  locations: ["India", "Remote"],
};

test("Title Normalization: maps equivalent engineering titles", () => {
  assert.strictEqual(normalizeTitle("Software Development Engineer I"), "Software Engineer");
  assert.strictEqual(normalizeTitle("Associate Software Engineer"), "Associate Software Engineer");
  assert.strictEqual(normalizeTitle("Graduate Engineer Trainee - 2027"), "Graduate Engineer Trainee");
  assert.strictEqual(normalizeTitle("Summer 2025 Intern - Software Engineering"), "Intern");
});

test("Technical Role Check: rejects nontechnical jobs", () => {
  assert.strictEqual(isTechnicalRole("Software Engineer"), true);
  assert.strictEqual(isTechnicalRole("Backend Developer"), true);
  assert.strictEqual(isTechnicalRole("Technical Recruiter"), false);
  assert.strictEqual(isTechnicalRole("Human Resources Intern"), false);
  assert.strictEqual(isTechnicalRole("Sales Account Executive"), false);
});

test("Hard Fail: overrides score on 5+ years experience requirement", () => {
  const job = {
    title: "Senior Software Engineer",
    description: "Requires 5+ years of relevant experience building distributed systems.",
    locations: ["Bengaluru, India"],
    isRemote: false,
    remoteRestrictions: null,
    employmentType: "FULL_TIME",
  };

  const hardFail = checkHardFails(job, mockProfile);
  assert.strictEqual(hardFail.hardFail, true);

  const match = computeJobMatch(job, mockProfile);
  assert.strictEqual(match.matchCategory, "INELIGIBLE");
  assert.strictEqual(match.overallScore, 0);
});

test("Hard Fail: overrides score when restricted to conflicting graduation year (e.g. 2024)", () => {
  const job = {
    title: "Software Engineer - Campus Hire",
    description: "Exclusively open for Batch of 2024 graduates who have already completed degree.",
    locations: ["Hyderabad, India"],
    isRemote: false,
    remoteRestrictions: null,
    employmentType: "FULL_TIME",
  };

  const match = computeJobMatch(job, mockProfile);
  assert.strictEqual(match.matchCategory, "INELIGIBLE");
});

test("Strong Match: 2027 SWE Intern in India with matching skills", () => {
  const job = {
    title: "Software Engineer Intern (Summer 2027)",
    description: "Looking for 2027 graduating students skilled in Java, Python, REST APIs and PostgreSQL. Located in Bengaluru.",
    locations: ["Bengaluru, India"],
    isRemote: false,
    remoteRestrictions: null,
    employmentType: "INTERNSHIP",
  };

  const match = computeJobMatch(job, mockProfile);
  assert.strictEqual(match.matchCategory, "STRONG");
  assert.ok(match.overallScore >= 80, `Expected score >= 80, got ${match.overallScore}`);
  assert.ok(match.matchReasons.some(r => r.includes("2027")));
});

test("Possible Match: General entry level role with partial skills", () => {
  const job = {
    title: "Junior Backend Engineer",
    description: "Early career developer with experience in Node.js and SQL.",
    locations: ["Remote - India"],
    isRemote: true,
    remoteRestrictions: "India",
    employmentType: "FULL_TIME",
  };

  const match = computeJobMatch(job, mockProfile);
  assert.ok(match.overallScore >= 55, `Expected score >= 55, got ${match.overallScore}`);
  assert.ok(match.matchCategory === "POSSIBLE" || match.matchCategory === "STRONG");
});

test("Hard Fail: rejects jobs with onsite foreign location (e.g. Austin, TX) as INELIGIBLE", () => {
  const job = {
    title: "Software Engineer",
    description: "Looking for an entry level software engineer to join our Austin office.",
    locations: ["Austin, TX"],
    isRemote: false,
    remoteRestrictions: null,
    employmentType: "FULL_TIME",
  };

  const hardFail = checkHardFails(job, mockProfile);
  assert.strictEqual(hardFail.hardFail, true);
  assert.ok(hardFail.reason?.includes("not located in India or remote"));

  const match = computeJobMatch(job, mockProfile);
  assert.strictEqual(match.matchCategory, "INELIGIBLE");
  assert.strictEqual(match.overallScore, 0);
});

test("Hard Fail: rejects experienced Software Engineer roles that are not intern/fresher", () => {
  const job = {
    title: "Software Engineer",
    description: "Join our backend platform team building distributed systems in Java.",
    locations: ["Bengaluru, India"],
    isRemote: false,
    remoteRestrictions: null,
    employmentType: "FULL_TIME",
  };

  assert.strictEqual(isEntryLevelRole(job.title, job.employmentType, job.description), false);
  const match = computeJobMatch(job, mockProfile);
  assert.strictEqual(match.matchCategory, "INELIGIBLE");
  assert.ok(match.concerns.some((c) => c.toLowerCase().includes("fresher") || c.toLowerCase().includes("intern")));
});

test("Hard Fail: rejects US-only remote internships", () => {
  const job = {
    title: "Software Engineer Intern",
    description: "Summer internship. Must reside in the United States.",
    locations: ["Remote - United States"],
    isRemote: true,
    remoteRestrictions: "United States",
    employmentType: "INTERNSHIP",
  };

  const hardFail = checkHardFails(job, mockProfile);
  assert.strictEqual(hardFail.hardFail, true);
  const match = computeJobMatch(job, mockProfile);
  assert.strictEqual(match.matchCategory, "INELIGIBLE");
});

test("Location tokens: splits city, country strings for filtering", () => {
  const tokens = expandLocationTokens(["Bengaluru, India"]);
  assert.ok(tokens.includes("Bengaluru, India"));
  assert.ok(tokens.includes("Bengaluru"));
  assert.ok(tokens.includes("India"));
});

test("Internship title: does not treat Internal Auditor as an intern", () => {
  assert.strictEqual(isInternshipTitle("Senior Internal Auditor"), false);
  assert.strictEqual(isInternshipTitle("Software Engineer Intern"), true);
  assert.strictEqual(isInternshipTitle("Internal Tools Intern"), true);
  assert.strictEqual(isTechnicalRole("Senior Internal Auditor"), false);
});

test("Hard Fail: staff, L3, manager, and US/Ireland remote are ineligible", () => {
  const cases = [
    {
      title: "Staff Software Engineer",
      description: "8+ years of experience building distributed systems.",
      locations: ["Remote - Ireland"],
      isRemote: true,
      remoteRestrictions: "Remote - Ireland",
      employmentType: "FULL_TIME",
    },
    {
      title: "Software Engineer L3",
      description: "Join the Twilio platform team.",
      locations: ["Remote - US"],
      isRemote: true,
      remoteRestrictions: "Remote - US",
      employmentType: "FULL_TIME",
    },
    {
      title: "Senior Manager, Software Engineering (L5)",
      description: "Lead engineering teams across India.",
      locations: ["Remote - India"],
      isRemote: true,
      remoteRestrictions: "Remote - India",
      employmentType: "FULL_TIME",
    },
    {
      title: "Senior Internal Auditor",
      description: "Internal audit internship program.",
      locations: ["Remote - Canada"],
      isRemote: true,
      remoteRestrictions: "Remote - Canada",
      employmentType: "INTERNSHIP",
    },
    {
      title: "Engineer 3 - Business Systems",
      description: "Requires 5 years of experience with enterprise systems.",
      locations: ["Gurugram"],
      isRemote: false,
      remoteRestrictions: null,
      employmentType: "FULL_TIME",
    },
  ];

  for (const job of cases) {
    const match = computeJobMatch(job, mockProfile);
    assert.strictEqual(
      match.matchCategory,
      "INELIGIBLE",
      `${job.title} should be ineligible, got ${match.matchCategory} (${match.overallScore})`
    );
  }

  assert.strictEqual(isExperiencedLevelTitle("Software Engineer L3"), true);
  assert.strictEqual(isExperiencedLevelTitle("Software Engineer Intern"), false);
  assert.strictEqual(isEntryLevelRole("Software Engineer", "FULL_TIME", "10-12 years of experience in Java."), false);
});

test("Location Eligibility: accepts remote job open globally / to India", () => {
  const job = {
    title: "Associate Software Engineer - Remote",
    description: "Work remotely from anywhere in India or worldwide.",
    locations: ["Remote"],
    isRemote: true,
    remoteRestrictions: "Worldwide / India",
    employmentType: "FULL_TIME",
  };

  const hardFail = checkHardFails(job, mockProfile);
  assert.strictEqual(hardFail.hardFail, false);

  const match = computeJobMatch(job, mockProfile);
  assert.ok(match.overallScore >= 55);
  assert.ok(match.matchReasons.some(r => r.includes("India")));
});
