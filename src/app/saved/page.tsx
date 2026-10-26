"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/JobCard";

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    try {
      const res = await fetch("/api/saved");
      if (res.ok) {
        const data = await res.json();
        setSavedJobs(data);
      }
    } catch (err) {
      console.error("Fetch saved jobs error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saved Jobs</h1>
        <p className="text-sm text-muted-foreground">
          {savedJobs.length} opportunities bookmarked for application
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border bg-card/50 p-5 skeleton" />
          ))}
        </div>
      ) : savedJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 p-12 text-center">
          <div className="rounded-full bg-amber-500/10 p-3 text-amber-400">
            <Bookmark className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-semibold">No Saved Jobs Yet</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Bookmark interesting roles while exploring to keep them organized here.
          </p>
          <Link href="/jobs">
            <Button size="sm" className="mt-4 gap-1.5 text-xs">
              <span>Explore Opportunities</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {savedJobs.map((job) => (
            <JobCard key={job.id} job={job} onSaveToggle={fetchSaved} />
          ))}
        </div>
      )}
    </div>
  );
}
