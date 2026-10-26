"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Sparkles, Clock, ArrowRight, AlertCircle, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCards } from "@/components/dashboard/StatCards";
import { JobCard } from "@/components/jobs/JobCard";
import { formatRelativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalJobs: 0,
    newToday: 0,
    strongMatches: 0,
    possibleMatches: 0,
    savedJobs: 0,
    appliedJobs: 0,
    activeCompanies: 0,
    lastSyncAt: null as string | null,
  });

  const [strongJobs, setStrongJobs] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  const loadDashboardData = async () => {
    try {
      const [healthRes, strongRes, recentRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/jobs?matchCategory=STRONG&pageSize=5"),
        fetch("/api/jobs?sortBy=newest&pageSize=5"),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setStats(healthData.stats);
      }

      if (strongRes.ok) {
        const strongData = await strongRes.json();
        setStrongJobs(strongData.data || []);
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentJobs(recentData.data || []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(data.message || "Sync completed successfully.");
        await loadDashboardData();
      } else {
        setSyncMessage(data.error || "Sync encountered an issue.");
      }
    } catch (err: any) {
      setSyncMessage(err.message || "Failed to trigger sync.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal Job Radar</h1>
          <p className="text-sm text-muted-foreground">
            4th year CSE • ServiceNow intern • Intern & fresher roles in India or remote
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Last sync: {formatRelativeTime(stats.lastSyncAt)}
          </span>
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Discovering..." : "Sync Jobs"}
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary animate-fade-in">
          <Radar className="h-4 w-4" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Stat Cards */}
      <StatCards stats={stats} />

      {/* Empty State if No Jobs Collected Yet */}
      {!loading && stats.totalJobs === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Radar className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No Jobs Discovered Yet</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Your 83 company integrations are configured and ready. Click below to run the live collector
            across verified Greenhouse, Lever, and Ashby boards.
          </p>
          <Button onClick={handleSync} disabled={syncing} className="mt-5 gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Running Live Discovery..." : "Run First Job Discovery"}
          </Button>
        </div>
      )}

      {/* Feed Layout: Strong Matches & Recent Discoveries */}
      {stats.totalJobs > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Strong Matches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <h2 className="text-base font-semibold">Top Strong Matches</h2>
              </div>
              <Link
                href="/jobs?matchCategory=STRONG"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {strongJobs.length === 0 ? (
              <div className="rounded-lg border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                No strong matches currently found. Check Possible Matches or view All Jobs.
              </div>
            ) : (
              <div className="space-y-3">
                {strongJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-semibold">Recently Discovered</h2>
              </div>
              <Link
                href="/jobs?sortBy=newest"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <div className="rounded-lg border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                No recent jobs discovered yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
