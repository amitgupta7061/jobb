import { JobSourceAdapter } from "./base";
import { NormalizedJob, EmploymentType } from "@/types";
import { isInternshipTitle } from "@/lib/matching/titles";

interface AshbyJob {
  id: string;
  title: string;
  department?: string;
  location?: string;
  isRemote?: boolean;
  employmentType?: string;
  publishedAt?: string;
  applyUrl?: string;
  jobUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
}

interface AshbyResponse {
  jobs?: AshbyJob[];
  results?: AshbyJob[];
}

export class AshbyAdapter implements JobSourceAdapter {
  readonly name = "Ashby";
  readonly sourceType = "ASHBY";

  async fetchJobs(boardId: string): Promise<NormalizedJob[]> {
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardId)}`;

      const response = await fetch(`${url}?includeCompensation=false`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "JobRadar/1.0 (Personal Tech Job Discovery)",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as AshbyResponse;
      const jobs = data.jobs || data.results || [];
      if (!Array.isArray(jobs)) {
        return [];
      }

      return jobs.map((job) => this.normalize(job, boardId));
    } catch {
      return [];
    }
  }

  private normalize(raw: AshbyJob, boardId: string): NormalizedJob {
    const isRemote = Boolean(
      raw.isRemote ||
      raw.location?.toLowerCase().includes("remote") ||
      raw.title.toLowerCase().includes("remote")
    );

    let employmentType: EmploymentType = "FULL_TIME";
    const rawType = (raw.employmentType || "").toLowerCase();
    if (/\b(interns?|internship|co-op)\b/.test(rawType) || isInternshipTitle(raw.title)) {
      employmentType = "INTERNSHIP";
    } else if (rawType.includes("contract")) {
      employmentType = "CONTRACT";
    }

    const locations = raw.location?.trim() ? [raw.location.trim()] : [];

    return {
      externalId: `ashby-${boardId}-${raw.id}`,
      title: raw.title.trim(),
      description: raw.descriptionPlain || null,
      descriptionHtml: raw.descriptionHtml || null,
      locations,
      isRemote,
      remoteRestrictions: isRemote ? raw.location || null : null,
      employmentType,
      applicationUrl: raw.applyUrl || raw.jobUrl || `https://jobs.ashbyhq.com/${boardId}/${raw.id}`,
      sourcePostedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
      requiredSkills: [],
      preferredSkills: [],
      rawData: {
        id: raw.id,
        boardId,
        department: raw.department,
      },
    };
  }
}
