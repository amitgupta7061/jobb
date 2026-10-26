import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const profile = await prisma.userProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.savedJob.deleteMany({
      where: {
        jobId,
        profileId: profile.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/saved/[jobId] error:", error);
    return NextResponse.json({ error: "Failed to unsave job" }, { status: 500 });
  }
}
