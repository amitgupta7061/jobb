import { NormalizedJob } from "@/types";

export interface JobSourceAdapter {
  readonly name: string;
  readonly sourceType: string;

  /**
   * Fetch published jobs from the company's public job board / ATS API.
   * @param boardId The ATS board identifier or slug
   */
  fetchJobs(boardId: string): Promise<NormalizedJob[]>;
}

export interface FetchResult {
  sourceId: string;
  companyId: string;
  companyName: string;
  jobs: NormalizedJob[];
  error?: string;
  durationMs: number;
}
