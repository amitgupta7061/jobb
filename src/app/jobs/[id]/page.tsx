"use client";

import { use, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Calendar,
  GraduationCap,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl border bg-card/50 p-6 skeleton" />}>
      <JobDetailContent params={params} />
    </Suspense>
  );
}

function JobDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [updatingApp, setUpdatingApp] = useState(false);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
        setIsSaved(data.isSaved);
        setApplicationStatus(data.application?.status || null);
      }
    } catch (err) {
      console.error("Fetch job detail error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handleSaveToggle = async () => {
    try {
      if (isSaved) {
        await fetch(`/api/saved/${id}`, { method: "DELETE" });
        setIsSaved(false);
      } else {
        await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: id }),
        });
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Save toggle error:", err);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setUpdatingApp(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, status }),
      });
      if (res.ok) {
        setApplicationStatus(status);
      }
    } catch (err) {
      console.error("Update application status error:", err);
    } finally {
      setUpdatingApp(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 rounded skeleton" />
        <div className="h-64 rounded-xl border skeleton" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <h2 className="text-lg font-semibold">Job not found</h2>
        <Link href="/jobs">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  const match = job.match;
  const score = match?.overallScore ?? 0;
  const category = match?.matchCategory ?? "NEEDS_REVIEW";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Jobs
      </Link>

      {/* Main Header Card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">{job.title}</h1>
              {job.employmentType === "INTERNSHIP" && (
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
                  Internship
                </Badge>
              )}
              {job.isRemote && (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                  Remote
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1 text-foreground font-medium">
                <Building2 className="h-4 w-4" />
                <span>{job.company.name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{job.locations.length > 0 ? job.locations.join(", ") : "Location not specified"}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Discovered {formatRelativeTime(job.firstSeenAt)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap sm:flex-col items-end gap-2">
            <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2 w-full sm:w-auto">
                <span>Apply on Official Site</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToggle}
                className="gap-1.5 text-xs"
              >
                <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-primary text-primary" : ""}`} />
                {isSaved ? "Saved" : "Save Job"}
              </Button>

              {/* Status Select */}
              <select
                value={applicationStatus || ""}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={updatingApp}
                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm"
              >
                <option value="">Status: Not Applied</option>
                <option value="APPLIED">Applied</option>
                <option value="ONLINE_ASSESSMENT">OA (Assessment)</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFER">Offer Received</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Match Engine Analysis Box */}
      {match && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Profile Match Engine Analysis</h2>
            </div>
            <Badge
              variant={
                category === "STRONG"
                  ? "strong"
                  : category === "POSSIBLE"
                  ? "possible"
                  : category === "LOW"
                  ? "low"
                  : "ineligible"
              }
              className="text-xs font-semibold px-3 py-1"
            >
              {score}% • {category} MATCH
            </Badge>
          </div>

          {/* Breakdown bars */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
              <span className="text-[11px] text-muted-foreground block">Grad & Degree (25%)</span>
              <span className="text-sm font-bold text-foreground">{match.gradScore}%</span>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
              <span className="text-[11px] text-muted-foreground block">Role & Exp (25%)</span>
              <span className="text-sm font-bold text-foreground">{match.roleScore}%</span>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
              <span className="text-[11px] text-muted-foreground block">Tech Skills (30%)</span>
              <span className="text-sm font-bold text-foreground">{match.skillScore}%</span>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
              <span className="text-[11px] text-muted-foreground block">Location (10%)</span>
              <span className="text-sm font-bold text-foreground">{match.locationScore}%</span>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
              <span className="text-[11px] text-muted-foreground block">Intern Exp (10%)</span>
              <span className="text-sm font-bold text-foreground">{match.experienceScore}%</span>
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-2 pt-2 text-xs">
            {match.matchReasons.map((r: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                <span>{r}</span>
              </div>
            ))}
            {match.concerns.map((c: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description Content */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold">Job Description & Responsibilities</h2>

        {job.descriptionHtml ? (
          <div
            className="job-description text-sm text-foreground/90 space-y-3 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
          />
        ) : job.description ? (
          <div className="whitespace-pre-line text-sm text-foreground/90 leading-relaxed">
            {job.description}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Full description was not provided in the public ATS feed. Please click &quot;Apply on Official Site&quot;
            to review the complete listing.
          </p>
        )}
      </div>
    </div>
  );
}
