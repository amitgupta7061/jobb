import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: true,
        match: true,
        savedJobs: { select: { id: true } },
        applications: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            notes: true,
            followUpDate: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...job,
      isSaved: job.savedJobs.length > 0,
      application: job.applications[0] || null,
      savedJobs: undefined,
      applications: undefined,
    });
  } catch (error: any) {
    console.error("GET /api/jobs/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch job details" }, { status: 500 });
  }
}
