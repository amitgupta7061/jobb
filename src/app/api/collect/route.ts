import { NextRequest, NextResponse } from "next/server";
import { runJobCollection } from "@/lib/collectors/orchestrator";

export async function POST(request: NextRequest) {
  try {
    // Check optional collection secret if configured
    const authHeader = request.headers.get("authorization");
    const secret = process.env.COLLECTION_SECRET;

    if (secret && secret !== "change-me-to-a-random-string") {
      if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized collection request" }, { status: 401 });
      }
    }

    let sourceId: string | undefined;
    try {
      const body = await request.json();
      sourceId = body?.sourceId;
    } catch {
      // Body is optional
    }

    // Run collection
    const result = await runJobCollection(sourceId);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.sourcesProcessed} sources. Discovered ${result.totalFound} jobs (${result.totalCreated} new, ${result.totalUpdated} updated).`,
      result,
    });
  } catch (error: any) {
    console.error("POST /api/collect error:", error);
    return NextResponse.json({ error: "Job collection failed", message: error.message }, { status: 500 });
  }
}
