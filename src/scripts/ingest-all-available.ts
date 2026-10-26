import { prisma } from "../lib/db";
import { GreenhouseAdapter } from "../lib/collectors/greenhouse";
import { LeverAdapter } from "../lib/collectors/lever";
import { AshbyAdapter } from "../lib/collectors/ashby";
import { AmazonAdapter } from "../lib/collectors/amazon";
import { SmartRecruitersAdapter } from "../lib/collectors/smartrecruiters";
import { WorkdayAdapter } from "../lib/collectors/workday";
import { normalizeTitle } from "../lib/matching/titles";
import { computeJobMatch } from "../lib/matching/engine";
import { expandLocationTokens, isJobInIndia, isEligibleRemote } from "../lib/matching/rules";

interface TrackedSource {
  name: string;
  slug: string;
  type: "GREENHOUSE" | "LEVER" | "ASHBY" | "AMAZON" | "SMARTRECRUITERS" | "WORKDAY";
  boardId: string;
  careersUrl: string;
}

const SOURCES: TrackedSource[] = [
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

  // 3. Ashby verified boards
  { name: "Snowflake", slug: "snowflake", type: "ASHBY", boardId: "snowflake", careersUrl: "https://careers.snowflake.com/" },
  { name: "Plaid", slug: "plaid", type: "ASHBY", boardId: "plaid", careersUrl: "https://plaid.com/careers/" },
  { name: "UiPath", slug: "uipath", type: "ASHBY", boardId: "uipath", careersUrl: "https://www.uipath.com/company/careers" },

  // 4. SmartRecruiters verified boards
  { name: "ServiceNow", slug: "servicenow", type: "SMARTRECRUITERS", boardId: "servicenow", careersUrl: "https://www.servicenow.com/careers.html" },
  { name: "Swiggy", slug: "swiggy", type: "SMARTRECRUITERS", boardId: "swiggy", careersUrl: "https://careers.swiggy.com/" },
  { name: "Freshworks", slug: "freshworks", type: "SMARTRECRUITERS", boardId: "freshworks", careersUrl: "https://www.freshworks.com/careers/" },
  { name: "Canva", slug: "canva", type: "SMARTRECRUITERS", boardId: "canva", careersUrl: "https://www.canva.com/careers/" },
  { name: "Palantir", slug: "palantir", type: "SMARTRECRUITERS", boardId: "palantir", careersUrl: "https://www.palantir.com/careers/" },
  { name: "Uber", slug: "uber", type: "SMARTRECRUITERS", boardId: "uber", careersUrl: "https://www.uber.com/us/en/careers/" },

  // 5. Amazon Jobs direct API
  { name: "Amazon", slug: "amazon", type: "AMAZON", boardId: "amazon-jobs", careersUrl: "https://www.amazon.jobs/" },

  // 6. Workday public CXS endpoints
  { name: "CrowdStrike", slug: "crowdstrike", type: "WORKDAY", boardId: "crowdstrike:wd5:crowdstrikecareers", careersUrl: "https://www.crowdstrike.com/careers/" },
  { name: "NVIDIA", slug: "nvidia", type: "WORKDAY", boardId: "nvidia:wd5:NVIDIAExternalCareerSite", careersUrl: "https://www.nvidia.com/en-us/about-nvidia/careers/" },
  { name: "Adobe", slug: "adobe", type: "WORKDAY", boardId: "adobe:wd5:external_experienced", careersUrl: "https://www.adobe.com/careers.html" },
  { name: "Autodesk", slug: "autodesk", type: "WORKDAY", boardId: "autodesk:wd1:Ext", careersUrl: "https://www.autodesk.com/careers" },
];

async function main() {
  console.log(`Starting comprehensive live ingestion across ${SOURCES.length} companies...`);

  const profile = await prisma.userProfile.findFirst();
  if (!profile) {
    console.error("No user profile found!");
    return;
  }

  const greenhouseAdapter = new GreenhouseAdapter();
  const leverAdapter = new LeverAdapter();
  const ashbyAdapter = new AshbyAdapter();
  const amazonAdapter = new AmazonAdapter();
  const smartRecruitersAdapter = new SmartRecruitersAdapter();
  const workdayAdapter = new WorkdayAdapter();

  let totalSuccessfulCompanies = 0;
  let totalIndiaJobsIngested = 0;
  let totalEligible0To1Yoe = 0;

  for (const src of SOURCES) {
    console.log(`\nFetching [${src.type}] ${src.name} (${src.boardId})...`);

    try {
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

      console.log(`  -> Retrieved ${normJobs.length} live jobs worldwide.`);
      if (normJobs.length > 0) {
        totalSuccessfulCompanies++;
        await prisma.company.update({
          where: { id: company.id },
          data: { lastSuccessAt: new Date() },
        });
      }

      // Filter for roles located in India or remote open to India
      const indiaOrRemoteJobs = normJobs.filter(
        (job) => isJobInIndia(job) || isEligibleRemote(job)
      );

      console.log(`  -> Found ${indiaOrRemoteJobs.length} roles located in India / Remote India.`);

      for (const normJob of indiaOrRemoteJobs) {
        const locations = expandLocationTokens(normJob.locations);
        const normalizedTitle = normalizeTitle(normJob.title);

        const jobRecord = await prisma.job.upsert({
          where: {
            externalId_companyId: {
              externalId: normJob.externalId,
              companyId: company.id,
            },
          },
          update: {
            title: normJob.title,
            normalizedTitle,
            description: normJob.description,
            descriptionHtml: normJob.descriptionHtml,
            locations: locations.length > 0 ? locations : undefined,
            isRemote: normJob.isRemote,
            remoteRestrictions: normJob.remoteRestrictions,
            employmentType: normJob.employmentType,
            applicationUrl: normJob.applicationUrl,
            lastSeenAt: new Date(),
            lastVerifiedAt: new Date(),
            listingStatus: "OPEN",
          },
          create: {
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
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            lastVerifiedAt: new Date(),
            listingStatus: "OPEN",
            rawData: normJob.rawData as any,
          },
        });

        totalIndiaJobsIngested++;

        // Compute Match
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

        await prisma.jobMatch.upsert({
          where: { jobId: jobRecord.id },
          update: {
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
          create: {
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

        if (matchResult.overallScore >= 55) {
          totalEligible0To1Yoe++;
          console.log(`    🎯 [${matchResult.overallScore}% MATCH] ${jobRecord.title} at ${src.name}`);
        }
      }
    } catch (e: any) {
      console.error(`  ❌ Failed fetching ${src.name}:`, e.message);
    }
  }

  console.log("\n==========================================");
  console.log(`✅ Completed Live Ingestion Across All Sources!`);
  console.log(`Reachable Career Boards: ${totalSuccessfulCompanies} / ${SOURCES.length}`);
  console.log(`India / Remote-India Jobs Ingested: ${totalIndiaJobsIngested}`);
  console.log(`0-1 YOE Technical Matches (55%+): ${totalEligible0To1Yoe}`);
  console.log("==========================================");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
