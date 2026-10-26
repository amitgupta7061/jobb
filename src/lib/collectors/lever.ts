import { JobSourceAdapter } from "./base";
import { NormalizedJob, EmploymentType } from "@/types";
import { isInternshipTitle } from "@/lib/matching/titles";

interface LeverPosting {
  id: string;
  text: string;
  createdAt: number;
  hostedUrl: string;
  applyUrl: string;
  categories?: {
    commitment?: string;
    location?: string;
    team?: string;
    department?: string;
  };
  descriptionPlain?: string;
  description?: string;
  additionalPlain?: string;
  workplaceType?: string;
}

export class LeverAdapter implements JobSourceAdapter {
  readonly name = "Lever";
  readonly sourceType = "LEVER";

  async fetchJobs(boardId: string): Promise<NormalizedJob[]> {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(boardId)}?mode=json`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobRadar/1.0 (Personal Tech Job Discovery)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Lever board "${boardId}" not found (404)`);
      }
      throw new Error(`Lever API error ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as LeverPosting[];
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((job) => this.normalize(job, boardId));
  }

  private normalize(raw: LeverPosting, boardId: string): NormalizedJob {
    const location = raw.categories?.location?.trim() || "";
    const commitment = raw.categories?.commitment?.toLowerCase() || "";
    const workplaceType = raw.workplaceType?.toLowerCase() || "";

    const isRemote =
      workplaceType === "remote" ||
      location.toLowerCase().includes("remote") ||
      raw.text.toLowerCase().includes("remote");

    let employmentType: EmploymentType = "FULL_TIME";
    if (
      /\b(interns?|internship|co-op)\b/.test(commitment) ||
      isInternshipTitle(raw.text)
    ) {
      employmentType = "INTERNSHIP";
    } else if (commitment.includes("part-time") || commitment.includes("contract")) {
      employmentType = "CONTRACT";
    }

    const locations = location ? [location] : [];

    const description = [raw.descriptionPlain, raw.additionalPlain]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    return {
      externalId: `lever-${boardId}-${raw.id}`,
      title: raw.text.trim(),
      description: description || null,
      descriptionHtml: raw.description || null,
      locations,
      isRemote,
      remoteRestrictions: isRemote ? location : null,
      employmentType,
      applicationUrl: raw.applyUrl || raw.hostedUrl,
      sourcePostedAt: raw.createdAt ? new Date(raw.createdAt) : null,
      requiredSkills: [],
      preferredSkills: [],
      rawData: {
        id: raw.id,
        boardId,
        categories: raw.categories,
      },
    };
  }
}
