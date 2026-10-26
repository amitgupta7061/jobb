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
    const baseUrl = `https://${tenant}.${instance}.myworkdayjobs.com/wday/cxs/${tenant}/${board}/jobs`;
    const allJobs: NormalizedJob[] = [];
    const PAGE_LIMIT = 20; // Workday CXS enforces a strict max of 20 per page
    let offset = 0;

    try {
      while (true) {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "JobRadar/1.0 (Personal Tech Job Discovery)",
          },
          body: JSON.stringify({
            appliedFacets: {},
            limit: PAGE_LIMIT,
            offset,
            searchText: "",
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 404 || response.status === 422) {
            break;
          }
          throw new Error(`Workday API error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const postings: WorkdayPosting[] = data.jobPostings || [];

        if (postings.length === 0) break;

        const normalized = postings.map((post) => this.normalize(post, tenant, instance, board));
        allJobs.push(...normalized);

        // If we got fewer than the limit, we've reached the last page
        if (postings.length < PAGE_LIMIT) break;

        offset += PAGE_LIMIT;

        // Safety cap: don't fetch more than 500 jobs from a single tenant
        if (offset >= 500) break;
      }

      return allJobs;
    } catch (err: any) {
      console.error(`Error fetching Workday for ${tenant}:`, err.message);
      return allJobs; // Return whatever we collected so far
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
      // postedOn is human-readable (e.g. "Posted 3 Days Ago"), not a parseable date
      sourcePostedAt: null,
      requiredSkills: [],
      preferredSkills: [],
      rawData: {
        tenant,
        board,
        jobId,
        externalPath: post.externalPath,
        locationsText: locText,
        postedOn: post.postedOn,
      },
    };
  }
}
