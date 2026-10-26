import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators";
import { computeJobMatch } from "@/lib/matching/engine";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = updateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Validation failed", details: parseResult.error.format() }, { status: 400 });
    }

    const currentProfile = await prisma.userProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!currentProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const updatedProfile = await prisma.userProfile.update({
      where: { id: currentProfile.id },
      data: parseResult.data,
    });

    // Recalculate matches for all active jobs asynchronously
    (async () => {
      try {
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
              degree: updatedProfile.degree,
              graduationYear: updatedProfile.graduationYear,
              currentRole: updatedProfile.currentRole,
              currentCompany: updatedProfile.currentCompany,
              targetRoles: updatedProfile.targetRoles,
              employmentTypes: updatedProfile.employmentTypes,
              skills: updatedProfile.skills,
              minExperience: updatedProfile.minExperience,
              maxExperience: updatedProfile.maxExperience,
              locations: updatedProfile.locations,
            }
          );

          await prisma.jobMatch.upsert({
            where: { jobId: job.id },
            create: {
              jobId: job.id,
              profileId: updatedProfile.id,
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
      } catch (err) {
        console.error("Match recalculation error:", err);
      }
    })();

    return NextResponse.json(updatedProfile);
  } catch (error: any) {
    console.error("PUT /api/profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
