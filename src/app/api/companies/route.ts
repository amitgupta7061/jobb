import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: [{ priority: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    return NextResponse.json(companies);
  } catch (error: any) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}
