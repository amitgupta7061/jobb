import { prisma } from "../lib/db";
import { GreenhouseAdapter } from "../lib/collectors/greenhouse";
import { LeverAdapter } from "../lib/collectors/lever";
import { AmazonAdapter } from "../lib/collectors/amazon";
import { normalizeTitle } from "../lib/matching/titles";
import { computeJobMatch } from "../lib/matching/engine";
import { expandLocationTokens } from "../lib/matching/rules";

const TARGET_COMPANIES = [
  {
    name: "Amazon",
    slug: "amazon",
    atsType: "CUSTOM" as const,
    atsBoardId: "amazon-jobs",
    careersUrl: "https://www.amazon.jobs/",
    priority: 1,
  },
  {
    name: "Hevo Data",
    slug: "hevo-data",
    atsType: "LEVER" as const,
    atsBoardId: "hevodata",
    careersUrl: "https://jobs.lever.co/hevodata",
    priority: 1,
  },
  {
    name: "Merkle Science",
    slug: "merkle-science",
    atsType: "LEVER" as const,
    atsBoardId: "merklescience",
    careersUrl: "https://jobs.lever.co/merklescience",
    priority: 1,
  },
  {
    name: "HackerRank",
    slug: "hackerrank",
    atsType: "GREENHOUSE" as const,
    atsBoardId: "hackerrank",
    careersUrl: "https://job-boards.greenhouse.io/hackerrank",
    priority: 1,
  },
  {
    name: "Enterpret",
    slug: "enterpret",
    atsType: "GREENHOUSE" as const,
    atsBoardId: "enterpret",
    careersUrl: "https://job-boards.greenhouse.io/enterpret",
    priority: 1,
  },
];

async function main() {
  console.log("Starting targeted ingestion of top tech companies in India...");

  const profile = await prisma.userProfile.findFirst();
  if (!profile) {
    console.error("No user profile found!");
    return;
  }

  const greenhouseAdapter = new GreenhouseAdapter();
  const leverAdapter = new LeverAdapter();
  const amazonAdapter = new AmazonAdapter();

  for (const compData of TARGET_COMPANIES) {
    console.log(`\nProcessing ${compData.name} (${compData.atsType} - ${compData.atsBoardId})...`);

    const company = await prisma.company.upsert({
      where: { slug: compData.slug },
      update: {
        name: compData.name,
        atsType: compData.atsType,
        atsBoardId: compData.atsBoardId,
        careersUrl: compData.careersUrl,
        priority: compData.priority,
        isActive: true,
      },
      create: {
        name: compData.name,
        slug: compData.slug,
        atsType: compData.atsType,
        atsBoardId: compData.atsBoardId,
        careersUrl: compData.careersUrl,
        priority: compData.priority,
        isActive: true,
      },
    });

    const source = await prisma.jobSource.upsert({
      where: { id: `${company.id}-primary` },
      update: {
        companyId: company.id,
        sourceType: compData.atsType,
        boardIdentifier: compData.atsBoardId,
        isActive: true,
      },
      create: {
        id: `${company.id}-primary`,
        companyId: company.id,
        sourceType: compData.atsType,
        boardIdentifier: compData.atsBoardId,
        isActive: true,
      },
    });

    let normJobs: any[] = [];
    if (compData.atsType === "GREENHOUSE") {
      normJobs = await greenhouseAdapter.fetchJobs(compData.atsBoardId);
    } else if (compData.atsType === "LEVER") {
      normJobs = await leverAdapter.fetchJobs(compData.atsBoardId);
    } else if (compData.slug === "amazon") {
      normJobs = await amazonAdapter.fetchJobs();
    }

    console.log(`Fetched ${normJobs.length} normalized jobs from ${compData.name}.`);

    let createdCount = 0;
    let matchedCount = 0;

    for (const normJob of normJobs) {
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
          sourceId: source.id,
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

      createdCount++;

      // Compute match
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

      if (matchResult.matchCategory !== "INELIGIBLE") {
        matchedCount++;
        console.log(`  -> [ELIGIBLE ${matchResult.overallScore}% ${matchResult.matchCategory}] ${jobRecord.title} (${jobRecord.locations.join(", ")})`);
      }
    }

    console.log(`Finished ${compData.name}: ${createdCount} processed, ${matchedCount} eligible 0-1 YOE India/Remote-India jobs.`);
  }

  console.log("\nTargeted ingestion completed successfully!");
}

main()
  .catch((e) => {
    console.error("Ingestion failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
