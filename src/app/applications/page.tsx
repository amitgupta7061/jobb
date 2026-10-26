"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  ExternalLink,
  Calendar,
  Building2,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "APPLIED", label: "Applied", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  { value: "ONLINE_ASSESSMENT", label: "Online Assessment", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  { value: "INTERVIEW", label: "Interviewing", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  { value: "OFFER", label: "Offer Received", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  { value: "WITHDRAWN", label: "Withdrawn", color: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Edit notes state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  const fetchApplications = async () => {
    try {
      const url = statusFilter
        ? `/api/applications?status=${statusFilter}`
        : "/api/applications";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error("Fetch applications error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchApplications();
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  const handleSaveNotes = async (appId: string) => {
    try {
      await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText }),
      });
      setEditingId(null);
      fetchApplications();
    } catch (err) {
      console.error("Save notes error:", err);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Are you sure you want to stop tracking this application?")) return;
    try {
      await fetch(`/api/applications/${appId}`, { method: "DELETE" });
      fetchApplications();
    } catch (err) {
      console.error("Delete application error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Application Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Track interviews, online assessments, and offer statuses for all your applications
        </p>
      </div>

      {/* Status Filter Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter("")}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            statusFilter === "" ? "bg-primary text-primary-foreground border-transparent" : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({applications.length})
        </button>
        {STATUS_OPTIONS.map((opt) => {
          const count = applications.filter((a) => a.status === opt.value).length;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(statusFilter === opt.value ? "" : opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border bg-card/50 p-5 skeleton" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 p-12 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-semibold">No Applications Tracked Yet</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            When you apply for a job, select &quot;Applied&quot; or update its status to monitor it here.
          </p>
          <Link href="/jobs">
            <Button size="sm" className="mt-4 text-xs">
              Explore Jobs to Apply
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const currentStatus = STATUS_OPTIONS.find((s) => s.value === app.status) || STATUS_OPTIONS[0];

            return (
              <div
                key={app.id}
                className="rounded-xl border bg-card p-5 space-y-3 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/jobs/${app.job.id}`}
                        className="text-base font-semibold hover:text-primary transition-colors"
                      >
                        {app.job.title}
                      </Link>
                      <Badge variant="outline" className={currentStatus.color}>
                        {currentStatus.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">{app.job.company.name}</span>
                      <span>•</span>
                      <span>Applied: {formatDate(app.appliedAt || app.createdAt)}</span>
                      <span>•</span>
                      <span>Updated: {formatRelativeTime(app.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <a
                      href={app.job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(app.id)}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="border-t pt-2 text-xs">
                  {editingId === app.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Add notes (e.g. interviewer names, assessment topics, follow-up dates)..."
                        className="w-full rounded-lg border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveNotes(app.id)}
                          className="h-7 px-3 text-xs"
                        >
                          Save Notes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="h-7 px-2 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2 text-muted-foreground">
                      <p className="italic">
                        {app.notes ? `Note: "${app.notes}"` : "No notes added yet."}
                      </p>
                      <button
                        onClick={() => {
                          setEditingId(app.id);
                          setNotesText(app.notes || "");
                        }}
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>{app.notes ? "Edit" : "Add Note"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
