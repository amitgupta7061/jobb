import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveJobSchema } from "@/lib/validators";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const savedJobs = await prisma.savedJob.findMany({
      where: { profileId: profile.id },
      include: {
        job: {
          include: {
            company: true,
            match: true,
            applications: {
              where: { profileId: profile.id },
              select: { id: true, status: true },
            },
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    const formatted = savedJobs.map((item) => ({
      ...item.job,
      savedAt: item.savedAt,
      isSaved: true,
      applicationStatus: item.job.applications[0]?.status || null,
      applications: undefined,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET /api/saved error:", error);
    return NextResponse.json({ error: "Failed to fetch saved jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = saveJobSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    const profile = await prisma.userProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const saved = await prisma.savedJob.upsert({
      where: {
        jobId_profileId: {
          jobId: parseResult.data.jobId,
          profileId: profile.id,
        },
      },
      create: {
        jobId: parseResult.data.jobId,
        profileId: profile.id,
      },
      update: {},
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/saved error:", error);
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
}
