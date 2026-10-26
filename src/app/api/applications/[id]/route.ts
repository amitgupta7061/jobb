import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateApplicationSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = updateApplicationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid update payload", details: parseResult.error.format() }, { status: 400 });
    }

    const application = await prisma.application.update({
      where: { id },
      data: parseResult.data,
      include: {
        job: {
          include: { company: true },
        },
      },
    });

    return NextResponse.json(application);
  } catch (error: any) {
    console.error("PUT /api/applications/[id] error:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.application.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/applications/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
