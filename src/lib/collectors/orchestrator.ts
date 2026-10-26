import { prisma } from "@/lib/db";
import { getAdapter } from "./registry";
import { computeJobMatch } from "@/lib/matching/engine";
import { expandLocationTokens } from "@/lib/matching/rules";
import { normalizeTitle } from "@/lib/matching/titles";

export interface CollectionResultSummary {
  sourcesProcessed: number;
  totalFound: number;
  totalCreated: number;
  totalUpdated: number;
  errors: Array<{ company: string; error: string }>;
  durationMs: number;
}

export async function runJobCollection(targetSourceId?: string): Promise<CollectionResultSummary> {
  const startTime = Date.now();
  const summary: CollectionResultSummary = {
    sourcesProcessed: 0,
    totalFound: 0,
    totalCreated: 0,
    totalUpdated: 0,
    errors: [],
    durationMs: 0,
  };

  // 1. Get the default profile for matching
  const profile = await prisma.userProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    console.warn("No user profile found for matching. Please run database seed first.");
    return summary;
  }

  // 2. Query active job sources
  const whereClause = targetSourceId
    ? { id: targetSourceId, isActive: true }
    : { isActive: true, boardIdentifier: { not: null } };

  const sources = await prisma.jobSource.findMany({
    where: whereClause,
    include: { company: true },
  });

  for (const source of sources) {
    if (!source.boardIdentifier) continue;

    summary.sourcesProcessed++;
    const sourceStartTime = Date.now();
    let jobsCreated = 0;
    let jobsUpdated = 0;
    let jobsUnchanged = 0;

    const adapter = getAdapter(source.sourceType);
    if (!adapter) {
      console.warn(`No adapter found for source type: ${source.sourceType}`);
      continue;
    }

    // Create CollectionRun record
    const run = await prisma.collectionRun.create({
      data: {
        companyId: source.companyId,
        sourceId: source.id,
        status: "RUNNING",
      },
    });

    try {
      // Fetch from ATS API
      const normalizedJobs = await adapter.fetchJobs(source.boardIdentifier);
      const now = new Date();

      for (const normJob of normalizedJobs) {
        const normalizedTitle = normalizeTitle(normJob.title);
        const locations = expandLocationTokens(normJob.locations);

        // Check if job exists
        const existingJob = await prisma.job.findUnique({
          where: {
            externalId_companyId: {
              externalId: normJob.externalId,
              companyId: source.companyId,
            },
          },
        });

        let jobRecord;

        if (!existingJob) {
          // Create new job
          jobRecord = await prisma.job.create({
            data: {
              externalId: normJob.externalId,
              companyId: source.companyId,
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
              firstSeenAt: now,
              lastSeenAt: now,
              lastVerifiedAt: now,
              listingStatus: "OPEN",
              rawData: normJob.rawData as any,
            },
          });
          jobsCreated++;
        } else {
          // Update existing job
          jobRecord = await prisma.job.update({
            where: { id: existingJob.id },
            data: {
              title: normJob.title,
              normalizedTitle,
              description: normJob.description || existingJob.description,
              descriptionHtml: normJob.descriptionHtml || existingJob.descriptionHtml,
              locations: locations.length > 0 ? locations : existingJob.locations,
              isRemote: normJob.isRemote,
              remoteRestrictions: normJob.remoteRestrictions || existingJob.remoteRestrictions,
              employmentType: normJob.employmentType,
              applicationUrl: normJob.applicationUrl,
              lastSeenAt: now,
              lastVerifiedAt: now,
              listingStatus: "OPEN",
            },
          });
          jobsUpdated++;
        }

        // Calculate and upsert Match Score
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
        });
      }

      summary.totalFound += normalizedJobs.length;
      summary.totalCreated += jobsCreated;
      summary.totalUpdated += jobsUpdated;

      // Update source & company stats
      const durationMs = Date.now() - sourceStartTime;
      await prisma.jobSource.update({
        where: { id: source.id },
        data: {
          lastFetchedAt: now,
          lastSuccessAt: now,
          failureCount: 0,
          lastError: null,
        },
      });

      await prisma.company.update({
        where: { id: source.companyId },
        data: {
          lastCollectedAt: now,
          lastSuccessAt: now,
        },
      });

      // Update collection run
      await prisma.collectionRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          jobsFound: normalizedJobs.length,
          jobsCreated,
          jobsUpdated,
          jobsUnchanged,
          durationMs,
        },
      });
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      summary.errors.push({ company: source.company.name, error: errorMsg });

      await prisma.jobSource.update({
        where: { id: source.id },
        data: {
          lastFetchedAt: new Date(),
          failureCount: { increment: 1 },
          lastError: errorMsg,
        },
      });

      await prisma.collectionRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errors: { message: errorMsg },
          durationMs: Date.now() - sourceStartTime,
        },
      });
    }
  }

  // Re-score every open job so rule changes apply without waiting for a re-fetch
  await recalculateOpenJobMatches(profile);

  summary.durationMs = Date.now() - startTime;
  return summary;
}

export async function recalculateOpenJobMatches(profile: {
  id: string;
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
}) {
  const jobs = await prisma.job.findMany({
    where: { listingStatus: "OPEN" },
  });

  for (const job of jobs) {
    const matchResult = computeJobMatch(
      {
        title: job.title,
        description: job.description,
        locations: job.locations,
        isRemote: job.isRemote,
        remoteRestrictions: job.remoteRestrictions,
        employmentType: job.employmentType,
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
      where: { jobId: job.id },
      create: {
        jobId: job.id,
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
    });
  }
}
