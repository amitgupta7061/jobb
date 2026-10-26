import { JobSourceAdapter } from "./base";
import { NormalizedJob, EmploymentType } from "@/types";
import { isInternshipTitle } from "@/lib/matching/titles";

interface GreenhouseJob {
  id: number;
  internal_job_id?: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  location?: {
    name?: string;
  };
  content?: string;
  metadata?: Array<{
    id: number;
    name: string;
    value: string | string[] | null;
    value_type: string;
  }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export class GreenhouseAdapter implements JobSourceAdapter {
  readonly name = "Greenhouse";
  readonly sourceType = "GREENHOUSE";

  async fetchJobs(boardId: string): Promise<NormalizedJob[]> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardId)}/jobs?content=true`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobRadar/1.0 (Personal Tech Job Discovery)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Greenhouse board "${boardId}" not found (404)`);
      }
      throw new Error(`Greenhouse API error ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as GreenhouseResponse;
    if (!data || !Array.isArray(data.jobs)) {
      return [];
    }

    return data.jobs.map((job) => this.normalize(job, boardId));
  }

  private normalize(raw: GreenhouseJob, boardId: string): NormalizedJob {
    const rawLocation = raw.location?.name?.trim() || "";
    const extractedLocations: string[] = [];

    if (rawLocation && rawLocation !== "Hybrid" && rawLocation !== "In-Office") {
      extractedLocations.push(rawLocation);
    }

    // Check Greenhouse metadata for actual cities/countries
    if (Array.isArray(raw.metadata)) {
      for (const meta of raw.metadata) {
        const metaName = (meta.name || "").toLowerCase();
        if (
          metaName.includes("location") ||
          metaName.includes("office") ||
          metaName.includes("city") ||
          metaName.includes("country")
        ) {
          if (Array.isArray(meta.value)) {
            for (const val of meta.value) {
              if (typeof val === "string" && val.trim()) {
                extractedLocations.push(val.trim());
              }
            }
          } else if (typeof meta.value === "string" && meta.value.trim()) {
            extractedLocations.push(meta.value.trim());
          }
        }
      }
    }

    if (extractedLocations.length === 0 && rawLocation) {
      extractedLocations.push(rawLocation);
    }

    const locString = extractedLocations.join(" ").toLowerCase();
    const isRemote =
      rawLocation.toLowerCase().includes("remote") ||
      raw.title.toLowerCase().includes("remote") ||
      locString.includes("remote");

    const locations = Array.from(new Set(extractedLocations));

    // Determine employment type
    let employmentType: EmploymentType = "FULL_TIME";
    if (isInternshipTitle(raw.title)) {
      employmentType = "INTERNSHIP";
    }

    // Extract text content from html if present
    const rawContent = raw.content || "";
    const plainText = rawContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    return {
      externalId: `gh-${boardId}-${raw.id}`,
      title: raw.title.trim(),
      description: plainText || null,
      descriptionHtml: rawContent || null,
      locations,
      isRemote,
      remoteRestrictions: isRemote ? rawLocation : null,
      employmentType,
      applicationUrl: raw.absolute_url,
      sourcePostedAt: raw.updated_at ? new Date(raw.updated_at) : null,
      requiredSkills: [],
      preferredSkills: [],
      rawData: {
        id: raw.id,
        boardId,
        metadata: raw.metadata,
      },
    };
  }
}
