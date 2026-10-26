"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { isNewGradTitle } from "@/lib/matching/titles";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: {
      name: string;
      slug: string;
      careersUrl?: string | null;
    };
    locations: string[];
    isRemote: boolean;
    employmentType: string;
    applicationUrl: string;
    firstSeenAt: string | Date;
    isSaved?: boolean;
    applicationStatus?: string | null;
    match?: {
      overallScore: number;
      matchCategory: string;
      matchReasons: string[];
      missingSkills: string[];
      concerns: string[];
    } | null;
  };
  onSaveToggle?: (jobId: string, currentSaved: boolean) => void;
  onApplyClick?: (jobId: string) => void;
}

export function JobCard({ job, onSaveToggle, onApplyClick }: JobCardProps) {
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [isSaved, setIsSaved] = useState(Boolean(job.isSaved));
  const [saving, setSaving] = useState(false);

  const match = job.match;
  const score = match?.overallScore ?? 0;
  const category = match?.matchCategory ?? "NEEDS_REVIEW";

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isSaved) {
        await fetch(`/api/saved/${job.id}`, { method: "DELETE" });
        setIsSaved(false);
        onSaveToggle?.(job.id, false);
      } else {
        await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        });
        setIsSaved(true);
        onSaveToggle?.(job.id, true);
      }
    } catch (err) {
      console.error("Save toggle error:", err);
    } finally {
      setSaving(false);
    }
  };

  const badgeVariant =
    category === "STRONG"
      ? "strong"
      : category === "POSSIBLE"
      ? "possible"
      : category === "LOW"
      ? "low"
      : category === "INELIGIBLE"
      ? "ineligible"
      : "secondary";

  return (
    <div className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/jobs/${job.id}`}
              className="text-base font-semibold transition-colors hover:text-primary"
            >
              {job.title}
            </Link>
            {job.employmentType === "INTERNSHIP" && (
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
                Internship
              </Badge>
            )}
            {job.employmentType !== "INTERNSHIP" && isNewGradTitle(job.title) && (
              <Badge variant="outline" className="border-sky-500/30 text-sky-400">
                Fresher / New Grad
              </Badge>
            )}
            {job.isRemote && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                Remote
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-foreground">{job.company.name}</span>
            <span>•</span>
            <MapPin className="h-4 w-4" />
            <span>
              {job.locations.length > 0 ? job.locations.join(", ") : "Location not specified"}
            </span>
          </div>
        </div>

        {/* Match Score Badge */}
        {match && (
          <div className="flex flex-col items-end">
            <Badge variant={badgeVariant} className="px-2.5 py-1 text-xs font-semibold">
              <Sparkles className="mr-1 h-3 w-3" />
              {score}% {category}
            </Badge>
          </div>
        )}
      </div>

      {/* Match reasons snippet / toggle */}
      {match && (match.matchReasons.length > 0 || match.concerns.length > 0) && (
        <div className="mt-3">
          <button
            onClick={() => setShowMatchDetails(!showMatchDetails)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showMatchDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showMatchDetails ? "Hide match reasoning" : "Why this matched"}
          </button>

          {showMatchDetails && (
            <div className="mt-2 rounded-lg bg-secondary/50 p-3 text-xs space-y-1.5 animate-fade-in">
              {match.matchReasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-emerald-400">
                  <span className="text-emerald-500">✓</span>
                  <span>{reason}</span>
                </div>
              ))}
              {match.concerns.map((concern, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-amber-400">
                  <span className="text-amber-500">⚠</span>
                  <span>{concern}</span>
                </div>
              ))}
              {match.missingSkills.length > 0 && (
                <div className="pt-1 text-muted-foreground">
                  Unmatched tech mentioned:{" "}
                  <span className="text-foreground">{match.missingSkills.join(", ")}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Discovered {formatRelativeTime(job.firstSeenAt)}</span>
          </div>
          {job.applicationStatus && (
            <Badge variant="secondary" className="text-[10px]">
              Status: {job.applicationStatus}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Bookmark className={`mr-1 h-3.5 w-3.5 ${isSaved ? "fill-primary text-primary" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </Button>

          {/* Details Link */}
          <Link href={`/jobs/${job.id}`}>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
              Details
            </Button>
          </Link>

          {/* Original Application Link */}
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onApplyClick?.(job.id)}
          >
            <Button size="sm" className="h-8 px-3 text-xs">
              <span>Apply</span>
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
