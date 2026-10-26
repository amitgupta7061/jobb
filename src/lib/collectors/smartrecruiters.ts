import { JobSourceAdapter } from "./base";
import { NormalizedJob, EmploymentType } from "@/types";
import { isInternshipTitle } from "@/lib/matching/titles";

export class SmartRecruitersAdapter implements JobSourceAdapter {
  readonly name = "SmartRecruiters";
  readonly sourceType = "CUSTOM";

  async fetchJobs(companyIdentifier: string): Promise<NormalizedJob[]> {
    const allJobs: NormalizedJob[] = [];
    const PAGE_LIMIT = 100;
    let offset = 0;
    const MAX_PAGES = 10; // Safety cap to avoid infinite loops (up to 1,000 jobs)

    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings?limit=${PAGE_LIMIT}&offset=${offset}`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "JobRadar/1.0 (Personal Tech Job Discovery)",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 404) {
            break;
          }
          throw new Error(`SmartRecruiters API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const rawJobs = Array.isArray(data.content) ? data.content : [];
        if (rawJobs.length === 0) {
          break;
        }

        for (const raw of rawJobs) {
          allJobs.push(this.normalize(raw, companyIdentifier));
        }

        offset += rawJobs.length;
        if (typeof data.totalFound === "number" && offset >= data.totalFound) {
          break;
        }

        if (rawJobs.length < PAGE_LIMIT) {
          break;
        }
      }

      return allJobs;
    } catch {
      return allJobs;
    }
  }

  private normalize(raw: any, companyIdentifier: string): NormalizedJob {
    const title = (raw.name || "").trim();
    const city = raw.location?.city ? raw.location.city.trim() : "";
    const country = raw.location?.country ? raw.location.country.trim() : "";

    const locations: string[] = [];
    if (city) locations.push(city);
    if (country.toLowerCase() === "in" || country.toLowerCase() === "india") {
      locations.push("India");
    }

    let employmentType: EmploymentType = "FULL_TIME";
    const typeId = (raw.typeOfEmployment?.id || "").toLowerCase();
    const expId = (raw.experienceLevel?.id || "").toLowerCase();

    if (
      typeId.includes("intern") ||
      expId.includes("intern") ||
      isInternshipTitle(title)
    ) {
      employmentType = "INTERNSHIP";
    }

    const applicationUrl = raw.actions?.apply || `https://jobs.smartrecruiters.com/${companyIdentifier}/${raw.id}`;

    return {
      externalId: String(raw.id),
      title,
      description: `Job ID: ${raw.refNumber || raw.id}\nDepartment: ${raw.department?.label || "Engineering"}\nCompany: ${companyIdentifier}`,
      descriptionHtml: null,
      locations,
      isRemote: Boolean(raw.location?.remote),
      remoteRestrictions: null,
      employmentType,
      applicationUrl,
      sourcePostedAt: raw.releasedDate ? new Date(raw.releasedDate) : null,
      requiredSkills: [],
      preferredSkills: [],
      rawData: {
        id: raw.id,
        refNumber: raw.refNumber,
        department: raw.department,
        function: raw.function,
        experienceLevel: raw.experienceLevel,
      },
    };
  }
}
