import { JobSourceAdapter } from "./base";
import { NormalizedJob, EmploymentType } from "@/types";
import { isInternshipTitle } from "@/lib/matching/titles";

interface WorkdayPosting {
  title: string;
  externalPath: string;
  locationsText: string;
  postedOn?: string;
  bulletFields?: string[];
}

export class WorkdayAdapter implements JobSourceAdapter {
  readonly name = "Workday";
  readonly sourceType = "WORKDAY";

  /**
   * Fetches jobs from Workday public CXS endpoint
   * @param config Format: "tenant:instance:board" (e.g., "crowdstrike:wd5:crowdstrikecareers")
   */
  async fetchJobs(config: string): Promise<NormalizedJob[]> {
    const parts = config.split(":");
    if (parts.length < 3) {
      console.warn(`Invalid Workday config format: ${config}. Expected tenant:instance:board`);
      return [];
    }

    const [tenant, instance, board] = parts;
    const url = `https://${tenant}.${instance}.myworkdayjobs.com/wday/cxs/${tenant}/${board}/jobs`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "JobRadar/1.0 (Personal Tech Job Discovery)",
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit: 100,
          offset: 0,
          searchText: "",
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 422) {
          return [];
        }
        throw new Error(`Workday API error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const postings: WorkdayPosting[] = data.jobPostings || [];

      return postings.map((post) => this.normalize(post, tenant, instance, board));
    } catch (err: any) {
      console.error(`Error fetching Workday for ${tenant}:`, err.message);
      return [];
    }
  }

  private normalize(
    post: WorkdayPosting,
    tenant: string,
    instance: string,
    board: string
  ): NormalizedJob {
    const title = (post.title || "").trim();
    const locText = (post.locationsText || "").trim();
    const isRemote =
      locText.toLowerCase().includes("remote") ||
      title.toLowerCase().includes("remote");

    let employmentType: EmploymentType = "FULL_TIME";
    if (isInternshipTitle(title) || /intern|co-op|apprentice/i.test(title)) {
      employmentType = "INTERNSHIP";
    }

    const locations = locText ? [locText] : [];
    const jobId = post.bulletFields?.[0] || post.externalPath.split("/").pop() || Math.random().toString(36).slice(2);
    const applicationUrl = `https://${tenant}.${instance}.myworkdayjobs.com/en-US/${board}${post.externalPath}`;

    return {
      externalId: `workday-${tenant}-${jobId}`,
      title,
      description: `Job ID: ${jobId}\nLocation: ${locText}\nCompany: ${tenant}`,
      descriptionHtml: null,
      locations,
      isRemote,
      remoteRestrictions: isRemote ? locText : null,
      employmentType,
      applicationUrl,
      sourcePostedAt: post.postedOn ? new Date() : null,
      requiredSkills: [],
      preferredSkills: [],
      rawData: {
        tenant,
        board,
        jobId,
        externalPath: post.externalPath,
        locationsText: locText,
      },
    };
  }
}
