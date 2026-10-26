import { prisma } from "@/lib/db";
import { GreenhouseAdapter } from "./greenhouse";
import { LeverAdapter } from "./lever";
import { AshbyAdapter } from "./ashby";
import { AmazonAdapter } from "./amazon";
import { SmartRecruitersAdapter } from "./smartrecruiters";
import { WorkdayAdapter } from "./workday";
import { computeJobMatch } from "@/lib/matching/engine";
import { expandLocationTokens, isJobInIndia, isEligibleRemote } from "@/lib/matching/rules";
import { normalizeTitle } from "@/lib/matching/titles";

export interface CollectionResultSummary {
  sourcesProcessed: number;
  totalFound: number;
  totalCreated: number;
  totalUpdated: number;
  errors: Array<{ company: string; error: string }>;
  durationMs: number;
}

export interface TrackedSource {
  name: string;
  slug: string;
  type: "GREENHOUSE" | "LEVER" | "ASHBY" | "AMAZON" | "SMARTRECRUITERS" | "WORKDAY";
  boardId: string;
  careersUrl: string;
}

export const TRACKED_SOURCES: TrackedSource[] = [
  // 1. Greenhouse verified boards
  { name: "Cloudflare", slug: "cloudflare", type: "GREENHOUSE", boardId: "cloudflare", careersUrl: "https://www.cloudflare.com/careers/" },
  { name: "Figma", slug: "figma", type: "GREENHOUSE", boardId: "figma", careersUrl: "https://www.figma.com/careers/" },
  { name: "Twilio", slug: "twilio", type: "GREENHOUSE", boardId: "twilio", careersUrl: "https://www.twilio.com/en-us/company/jobs" },
  { name: "MongoDB", slug: "mongodb", type: "GREENHOUSE", boardId: "mongodb", careersUrl: "https://www.mongodb.com/careers" },
  { name: "Databricks", slug: "databricks", type: "GREENHOUSE", boardId: "databricks", careersUrl: "https://www.databricks.com/company/careers" },
  { name: "Rubrik", slug: "rubrik", type: "GREENHOUSE", boardId: "rubrik", careersUrl: "https://www.rubrik.com/company/careers" },
  { name: "HackerRank", slug: "hackerrank", type: "GREENHOUSE", boardId: "hackerrank", careersUrl: "https://job-boards.greenhouse.io/hackerrank" },
  { name: "Enterpret", slug: "enterpret", type: "GREENHOUSE", boardId: "enterpret", careersUrl: "https://job-boards.greenhouse.io/enterpret" },
  { name: "Coinbase", slug: "coinbase", type: "GREENHOUSE", boardId: "coinbase", careersUrl: "https://www.coinbase.com/careers" },
  { name: "Stripe", slug: "stripe", type: "GREENHOUSE", boardId: "stripe", careersUrl: "https://stripe.com/jobs" },
  { name: "Dropbox", slug: "dropbox", type: "GREENHOUSE", boardId: "dropbox", careersUrl: "https://www.dropbox.com/jobs" },
  { name: "Elastic", slug: "elastic", type: "GREENHOUSE", boardId: "elastic", careersUrl: "https://www.elastic.co/careers" },
  { name: "InMobi", slug: "inmobi", type: "GREENHOUSE", boardId: "inmobi", careersUrl: "https://www.inmobi.com/company/careers" },
  { name: "Groww", slug: "groww", type: "GREENHOUSE", boardId: "groww", careersUrl: "https://groww.in/careers" },
  { name: "Airbnb", slug: "airbnb", type: "GREENHOUSE", boardId: "airbnb", careersUrl: "https://careers.airbnb.com/" },
  { name: "Okta", slug: "okta", type: "GREENHOUSE", boardId: "okta", careersUrl: "https://www.okta.com/company/careers/" },
  { name: "Brex", slug: "brex", type: "GREENHOUSE", boardId: "brex", careersUrl: "https://www.brex.com/careers" },
  { name: "Thoughtworks", slug: "thoughtworks", type: "GREENHOUSE", boardId: "thoughtworks", careersUrl: "https://www.thoughtworks.com/careers" },

  // 2. Lever verified boards
  { name: "Hevo Data", slug: "hevo-data", type: "LEVER", boardId: "hevodata", careersUrl: "https://jobs.lever.co/hevodata" },
  { name: "Merkle Science", slug: "merkle-science", type: "LEVER", boardId: "merklescience", careersUrl: "https://jobs.lever.co/merklescience" },
  { name: "CRED", slug: "cred", type: "LEVER", boardId: "cred", careersUrl: "https://careers.cred.club/" },
  { name: "Meesho", slug: "meesho", type: "LEVER", boardId: "meesho", careersUrl: "https://meesho.io/careers" },

  // 3. SmartRecruiters verified boards
  { name: "ServiceNow", slug: "servicenow", type: "SMARTRECRUITERS", boardId: "servicenow", careersUrl: "https://www.servicenow.com/careers.html" },
  { name: "Swiggy", slug: "swiggy", type: "SMARTRECRUITERS", boardId: "swiggy", careersUrl: "https://careers.swiggy.com/" },
  { name: "Freshworks", slug: "freshworks", type: "SMARTRECRUITERS", boardId: "freshworks", careersUrl: "https://www.freshworks.com/careers/" },
  { name: "Canva", slug: "canva", type: "SMARTRECRUITERS", boardId: "canva", careersUrl: "https://www.canva.com/careers/" },
  { name: "Palantir", slug: "palantir", type: "SMARTRECRUITERS", boardId: "palantir", careersUrl: "https://www.palantir.com/careers/" },
  { name: "Uber", slug: "uber", type: "SMARTRECRUITERS", boardId: "uber", careersUrl: "https://www.uber.com/us/en/careers/" },

  // 4. Amazon Jobs direct API
  { name: "Amazon", slug: "amazon", type: "AMAZON", boardId: "amazon-jobs", careersUrl: "https://www.amazon.jobs/" },

  // 5. Ashby boards
  { name: "Snowflake", slug: "snowflake", type: "ASHBY", boardId: "snowflake", careersUrl: "https://careers.snowflake.com/" },
  { name: "Plaid", slug: "plaid", type: "ASHBY", boardId: "plaid", careersUrl: "https://plaid.com/careers/" },
  { name: "UiPath", slug: "uipath", type: "ASHBY", boardId: "uipath", careersUrl: "https://www.uipath.com/company/careers" },

  // 6. Workday public CXS endpoints
  { name: "CrowdStrike", slug: "crowdstrike", type: "WORKDAY", boardId: "crowdstrike:wd5:crowdstrikecareers", careersUrl: "https://www.crowdstrike.com/careers/" },
  { name: "NVIDIA", slug: "nvidia", type: "WORKDAY", boardId: "nvidia:wd5:NVIDIAExternalCareerSite", careersUrl: "https://www.nvidia.com/en-us/about-nvidia/careers/" },
  { name: "Adobe", slug: "adobe", type: "WORKDAY", boardId: "adobe:wd5:external_experienced", careersUrl: "https://www.adobe.com/careers.html" },
  { name: "Autodesk", slug: "autodesk", type: "WORKDAY", boardId: "autodesk:wd1:Ext", careersUrl: "https://www.autodesk.com/careers" },
];

const greenhouseAdapter = new GreenhouseAdapter();
const leverAdapter = new LeverAdapter();
const ashbyAdapter = new AshbyAdapter();
const amazonAdapter = new AmazonAdapter();
const smartRecruitersAdapter = new SmartRecruitersAdapter();
const workdayAdapter = new WorkdayAdapter();

export async function runJobCollection(targetSlug?: string): Promise<CollectionResultSummary> {
  const startTime = Date.now();
  const summary: CollectionResultSummary = {
    sourcesProcessed: 0,
    totalFound: 0,
    totalCreated: 0,
    totalUpdated: 0,
    errors: [],
    durationMs: 0,
  };

  // 1. Get the default user profile for matching
  const profile = await prisma.userProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    console.warn("No user profile found for matching.");
    return summary;
  }

  // 2. CRITICAL USER REQUIREMENT:
  // "when i click one sync job then only it will delete all fetched job first and get the fresh for every company"
  console.log("🧹 Syncing jobs: Purging all previous job records first...");
  if (targetSlug) {
    const comp = await prisma.company.findUnique({ where: { slug: targetSlug } });
    if (comp) {
      await prisma.job.deleteMany({ where: { companyId: comp.id } });
    }
  } else {
    // Delete all existing jobs and matches for a 100% fresh slate
    await prisma.jobMatch.deleteMany({});
    await prisma.job.deleteMany({});
  }
  console.log("✅ Previous jobs deleted. Fetching fresh listings from career portals...");

  // 3. Filter sources if a specific company slug was targeted
  const sources = targetSlug
    ? TRACKED_SOURCES.filter((s) => s.slug === targetSlug)
    : TRACKED_SOURCES;

  for (const src of sources) {
    try {
      summary.sourcesProcessed++;

      let atsTypeEnum: "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "CUSTOM" = "CUSTOM";
      if (src.type === "GREENHOUSE") atsTypeEnum = "GREENHOUSE";
      else if (src.type === "LEVER") atsTypeEnum = "LEVER";
      else if (src.type === "ASHBY") atsTypeEnum = "ASHBY";
      else if (src.type === "WORKDAY") atsTypeEnum = "WORKDAY";

      const company = await prisma.company.upsert({
        where: { slug: src.slug },
        update: {
          name: src.name,
          atsType: atsTypeEnum,
          atsBoardId: src.boardId,
          careersUrl: src.careersUrl,
          isActive: true,
          lastCollectedAt: new Date(),
        },
        create: {
          name: src.name,
          slug: src.slug,
          atsType: atsTypeEnum,
          atsBoardId: src.boardId,
          careersUrl: src.careersUrl,
          isActive: true,
          lastCollectedAt: new Date(),
        },
      });

      let normJobs: any[] = [];
      if (src.type === "GREENHOUSE") {
        normJobs = await greenhouseAdapter.fetchJobs(src.boardId);
      } else if (src.type === "LEVER") {
        normJobs = await leverAdapter.fetchJobs(src.boardId);
      } else if (src.type === "ASHBY") {
        normJobs = await ashbyAdapter.fetchJobs(src.boardId);
      } else if (src.type === "AMAZON") {
        normJobs = await amazonAdapter.fetchJobs();
      } else if (src.type === "SMARTRECRUITERS") {
        normJobs = await smartRecruitersAdapter.fetchJobs(src.boardId);
      } else if (src.type === "WORKDAY") {
        normJobs = await workdayAdapter.fetchJobs(src.boardId);
      }

      summary.totalFound += normJobs.length;

      if (normJobs.length > 0) {
        await prisma.company.update({
          where: { id: company.id },
          data: { lastSuccessAt: new Date() },
        });
      }

      // Filter for roles located in India or remote open to India
      const indiaOrRemoteJobs = normJobs.filter(
        (job) => isJobInIndia(job) || isEligibleRemote(job)
      );

      const now = new Date();

      for (const normJob of indiaOrRemoteJobs) {
        const locations = expandLocationTokens(normJob.locations);
        const normalizedTitle = normalizeTitle(normJob.title);

        const jobRecord = await prisma.job.create({
          data: {
            externalId: normJob.externalId,
            companyId: company.id,
            title: normJob.title,
            normalizedTitle,
            description: normJob.description,
            descriptionHtml: normJob.descriptionHtml,
            locations,
            isRemote: normJob.isRemote,
            remoteRestrictions: normJob.remoteRestrictions,
            employmentType: normJob.employmentType,
            applicationUrl: normJob.applicationUrl,
            sourcePostedAt: normJob.sourcePostedAt,
            firstSeenAt: now,
            lastSeenAt: now,
            lastVerifiedAt: now,
            listingStatus: "OPEN",
            rawData: normJob.rawData as any,
          },
        });

        summary.totalCreated++;

        // Calculate and save match score
        const matchResult = computeJobMatch(
          {
            title: jobRecord.title,
            description: jobRecord.description,
            locations: jobRecord.locations,
            isRemote: jobRecord.isRemote,
            remoteRestrictions: jobRecord.remoteRestrictions,
            employmentType: jobRecord.employmentType,
          },
          {
            degree: profile.degree,
            graduationYear: profile.graduationYear,
            currentRole: profile.currentRole,
            currentCompany: profile.currentCompany,
            targetRoles: profile.targetRoles,
            employmentTypes: profile.employmentTypes,
            skills: profile.skills,
            minExperience: profile.minExperience,
            maxExperience: profile.maxExperience,
            locations: profile.locations,
          }
        );

        await prisma.jobMatch.create({
          data: {
            jobId: jobRecord.id,
            profileId: profile.id,
            overallScore: matchResult.overallScore,
            matchCategory: matchResult.matchCategory,
            gradScore: matchResult.gradScore,
            roleScore: matchResult.roleScore,
            skillScore: matchResult.skillScore,
            locationScore: matchResult.locationScore,
            experienceScore: matchResult.experienceScore,
            matchReasons: matchResult.matchReasons,
            missingSkills: matchResult.missingSkills,
            concerns: matchResult.concerns,
          },
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      summary.errors.push({ company: src.name, error: errorMsg });
    }
  }

  summary.durationMs = Date.now() - startTime;
  return summary;
}
