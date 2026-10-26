import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eligibleWhere = {
      listingStatus: "OPEN" as const,
      match: { matchCategory: { not: "INELIGIBLE" as const } },
    };

    const [
      totalJobs,
      newToday,
      strongMatches,
      possibleMatches,
      savedJobs,
      appliedJobs,
      activeCompanies,
      lastRun,
      failedSources,
    ] = await Promise.all([
      prisma.job.count({ where: eligibleWhere }),
      prisma.job.count({
        where: {
          ...eligibleWhere,
          firstSeenAt: { gte: today },
        },
      }),
      prisma.jobMatch.count({
        where: { matchCategory: "STRONG" },
      }),
      prisma.jobMatch.count({
        where: { matchCategory: "POSSIBLE" },
      }),
      prisma.savedJob.count(),
      prisma.application.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.collectionRun.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { completedAt: "desc" },
      }),
      prisma.jobSource.findMany({
        where: { failureCount: { gt: 0 } },
        include: { company: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalJobs,
        newToday,
        strongMatches,
        possibleMatches,
        savedJobs,
        appliedJobs,
        activeCompanies,
        lastSyncAt: lastRun?.completedAt || null,
      },
      health: {
        lastRunStatus: lastRun?.status || "NEVER_RUN",
        failedSourcesCount: failedSources.length,
        failedSources: failedSources.map((s) => ({
          company: s.company.name,
          failureCount: s.failureCount,
          lastError: s.lastError,
          lastFetchedAt: s.lastFetchedAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("GET /api/health error:", error);
    return NextResponse.json({ error: "Failed to fetch health stats" }, { status: 500 });
  }
}
