"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/JobCard";

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl border bg-card/50 p-5 skeleton" />
          ))}
        </div>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageContent() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [search, setSearch] = useState("");
  const [matchCategory, setMatchCategory] = useState(searchParams.get("matchCategory") || "");
  const [roleLevel, setRoleLevel] = useState(searchParams.get("roleLevel") || "intern_or_fresher");
  const [locationScope, setLocationScope] = useState(searchParams.get("locationScope") || "india_or_remote");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "score");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (matchCategory) params.set("matchCategory", matchCategory);
      if (roleLevel) params.set("roleLevel", roleLevel);
      if (locationScope) params.set("locationScope", locationScope);
      if (sortBy) params.set("sortBy", sortBy);
      params.set("page", page.toString());
      params.set("pageSize", "24");

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setJobs(json.data || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error("Fetch jobs error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, matchCategory, roleLevel, locationScope, sortBy, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const resetFilters = () => {
    setSearch("");
    setMatchCategory("");
    setRoleLevel("intern_or_fresher");
    setLocationScope("india_or_remote");
    setSortBy("score");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search ||
    matchCategory ||
    roleLevel !== "intern_or_fresher" ||
    locationScope !== "india_or_remote" ||
    sortBy !== "score"
  );

  return (
    <div className="space-y-6">
      {/* Page Title & View Toggle */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs you can apply to</h1>
          <p className="text-sm text-muted-foreground">
            {total} intern and fresher / new-grad roles in India or remote, pulled from company career boards
          </p>
        </div>

        {/* View Switcher: Grid vs List */}
        <div className="flex items-center rounded-lg border bg-card p-1 text-xs">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid View (more jobs on one page)"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid View</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="List View"
          >
            <List className="h-3.5 w-3.5" />
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by role, company name, skill (e.g., Python, React, SDE)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Match Score */}
          <select
            value={matchCategory}
            onChange={(e) => {
              setMatchCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm"
          >
            <option value="">All Match Scores</option>
            <option value="STRONG">Strong Match (80%+)</option>
            <option value="POSSIBLE">Possible Match (55-79%)</option>
            <option value="LOW">Low Match (&lt;55%)</option>
          </select>

          {/* Intern vs fresher */}
          <select
            value={roleLevel}
            onChange={(e) => {
              setRoleLevel(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm"
          >
            <option value="intern_or_fresher">Intern + Fresher only</option>
            <option value="intern">Internships only</option>
            <option value="fresher">Fresher / new-grad only</option>
          </select>

          {/* Location Scope (India or Remote) */}
          <select
            value={locationScope}
            onChange={(e) => {
              setLocationScope(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm font-medium"
          >
            <option value="india_or_remote">📍 India & Remote Only</option>
            <option value="india">🇮🇳 India Locations Only</option>
            <option value="remote">🌐 Remote Roles Only</option>
            <option value="all">🌍 All listings (including ineligible)</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm"
          >
            <option value="score">Sort: Highest Match</option>
            <option value="newest">Sort: Newly Discovered</option>
            <option value="company">Sort: Company Name</option>
            <option value="title">Sort: Job Title</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Results Feed */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl border bg-card/50 p-5 skeleton" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center text-sm text-muted-foreground">
          No intern or fresher roles in India/remote yet. Click Sync Jobs, or widen filters.
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onSaveToggle={fetchJobs} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} total results)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 gap-1 px-2.5 text-xs"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 gap-1 px-2.5 text-xs"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
