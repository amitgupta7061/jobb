import { JobSourceAdapter } from "./base";
import { NormalizedJob, EmploymentType } from "@/types";
import { isInternshipTitle } from "@/lib/matching/titles";

export class AmazonAdapter implements JobSourceAdapter {
  readonly name = "Amazon Jobs";
  readonly sourceType = "CUSTOM";

  async fetchJobs(_boardId?: string): Promise<NormalizedJob[]> {
    const url = "https://www.amazon.jobs/en/search.json?country=IND&base_query=Software+Development+Engineer&result_limit=100";

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Amazon Jobs API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];

    return rawJobs.map((raw: any) => this.normalize(raw));
  }

  private normalize(raw: any): NormalizedJob {
    const title = (raw.title || "").trim();
    const city = raw.city ? raw.city.trim() : "India";
    const locations = [city, "India"];

    let employmentType: EmploymentType = "FULL_TIME";
    if (raw.is_intern || isInternshipTitle(title)) {
      employmentType = "INTERNSHIP";
    }

    const basicQual = raw.basic_qualifications || "";
    const prefQual = raw.preferred_qualifications || "";
    const desc = raw.description || "";

    const combinedDesc = `${desc}\n\nBasic Qualifications:\n${basicQual}\n\nPreferred Qualifications:\n${prefQual}`
      .replace(/<[^>]+>/g, " ")
      .trim();

    const applicationUrl = `https://www.amazon.jobs${raw.job_path || `/en/jobs/${raw.id}`}`;

    return {
      externalId: String(raw.id || raw.id_icims),
      title,
      description: combinedDesc,
      descriptionHtml: desc,
      locations,
      isRemote: false,
      remoteRestrictions: null,
      employmentType,
      applicationUrl,
      sourcePostedAt: raw.posted_date ? new Date(raw.posted_date) : null,
      requiredSkills: [],
      preferredSkills: [],
      rawData: {
        id: raw.id,
        id_icims: raw.id_icims,
        city: raw.city,
        state: raw.state,
        country: raw.country_code,
        job_category: raw.job_category,
      },
    };
  }
}
