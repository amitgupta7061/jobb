import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createApplicationSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");

    const profile = await prisma.userProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const where: any = { profileId: profile.id };
    if (status) {
      where.status = status;
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        job: {
          include: {
            company: true,
            match: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error: any) {
    console.error("GET /api/applications error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = createApplicationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid application payload", details: parseResult.error.format() }, { status: 400 });
    }

    const profile = await prisma.userProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const application = await prisma.application.upsert({
      where: {
        jobId_profileId: {
          jobId: parseResult.data.jobId,
          profileId: profile.id,
        },
      },
      create: {
        jobId: parseResult.data.jobId,
        profileId: profile.id,
        status: parseResult.data.status || "APPLIED",
        appliedAt: new Date(),
        notes: parseResult.data.notes || null,
      },
      update: {
        status: parseResult.data.status || "APPLIED",
        appliedAt: new Date(),
        notes: parseResult.data.notes !== undefined ? parseResult.data.notes : undefined,
      },
      include: {
        job: {
          include: { company: true },
        },
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/applications error:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}
