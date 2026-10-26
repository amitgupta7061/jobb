"use client";

import { useEffect, useState } from "react";
import {
  Save,
  Building2,
  ExternalLink,
  Plus,
  X,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New tag inputs
  const [newSkill, setNewSkill] = useState("");
  const [newRole, setNewRole] = useState("");

  const loadData = async () => {
    try {
      const [profileRes, companiesRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/companies"),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p);
      }
      if (companiesRes.ok) {
        const c = await companiesRes.json();
        setCompanies(c);
      }
    } catch (err) {
      console.error("Load settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          degree: profile.degree,
          graduationYear: Number(profile.graduationYear),
          currentRole: profile.currentRole,
          currentCompany: profile.currentCompany,
          minExperience: Number(profile.minExperience),
          maxExperience: Number(profile.maxExperience),
          skills: profile.skills,
          targetRoles: profile.targetRoles,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save profile error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter((s: string) => s !== skillToRemove),
    });
  };

  const handleAddRole = () => {
    if (!newRole.trim()) return;
    if (!profile.targetRoles.includes(newRole.trim())) {
      setProfile({ ...profile, targetRoles: [...profile.targetRoles, newRole.trim()] });
    }
    setNewRole("");
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setProfile({
      ...profile,
      targetRoles: profile.targetRoles.filter((r: string) => r !== roleToRemove),
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-40 rounded skeleton" />
        <div className="h-96 rounded-xl border skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Candidate Profile</h1>
        <p className="text-sm text-muted-foreground">
          Configure your candidate profile, target roles, technical skills, and manage the company registry
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="rounded-xl border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-base font-semibold">Candidate Profile</h2>
            <p className="text-xs text-muted-foreground">
              Used by the deterministic matching engine to evaluate job eligibility and compute scores
            </p>
          </div>

          <Button type="submit" disabled={saving} size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving & Recalculating..." : "Save Profile"}
          </Button>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Profile saved successfully! Matching scores are being recalculated.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Full Name</label>
            <Input
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Degree Program</label>
            <Input
              value={profile.degree || ""}
              onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Graduation Year</label>
            <Input
              type="number"
              value={profile.graduationYear || 2027}
              onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Current / Previous Company</label>
            <Input
              value={profile.currentCompany || ""}
              onChange={(e) => setProfile({ ...profile, currentCompany: e.target.value })}
              placeholder="e.g. ServiceNow"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Current Title</label>
            <Input
              value={profile.currentRole || ""}
              onChange={(e) => setProfile({ ...profile, currentRole: e.target.value })}
              placeholder="e.g. Associate Software Engineer Intern"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Full-Time Experience Preference (Years)</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={profile.minExperience || 0}
                onChange={(e) => setProfile({ ...profile, minExperience: e.target.value })}
                placeholder="Min"
                className="w-24"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number"
                value={profile.maxExperience || 1}
                onChange={(e) => setProfile({ ...profile, maxExperience: e.target.value })}
                placeholder="Max"
                className="w-24"
              />
              <span className="text-muted-foreground text-xs">years</span>
            </div>
          </div>
        </div>

        {/* Skills Tags */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-xs font-medium text-foreground">Technical Skills</label>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills?.map((skill: string) => (
              <Badge
                key={skill}
                variant="secondary"
                className="gap-1 px-2.5 py-1 text-xs"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1 max-w-sm">
            <Input
              placeholder="Add skill (e.g. Docker, Redis)..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSkill}
              className="h-8 px-2.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Target Roles */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-xs font-medium text-foreground">Target Roles</label>
          <div className="flex flex-wrap gap-1.5">
            {profile.targetRoles?.map((role: string) => (
              <Badge
                key={role}
                variant="outline"
                className="gap-1 px-2.5 py-1 text-xs border-primary/30 text-primary"
              >
                <span>{role}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRole(role)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1 max-w-sm">
            <Input
              placeholder="Add target role (e.g. Platform Engineer)..."
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRole();
                }
              }}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRole}
              className="h-8 px-2.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </form>

      {/* Company Registry Table */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Company Registry ({companies.length} Employers)</h2>
          <p className="text-xs text-muted-foreground">
            Registry with verified ATS integrations (Greenhouse, Lever, Ashby) and official career links
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto rounded-lg border text-xs">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-secondary/80 backdrop-blur border-b">
              <tr>
                <th className="p-2.5 font-medium">Company</th>
                <th className="p-2.5 font-medium">ATS Integration</th>
                <th className="p-2.5 font-medium">Board Identifier</th>
                <th className="p-2.5 font-medium">Priority</th>
                <th className="p-2.5 font-medium">Careers Page</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="p-2.5 font-medium text-foreground">{c.name}</td>
                  <td className="p-2.5">
                    <Badge
                      variant="outline"
                      className={
                        c.atsType === "GREENHOUSE"
                          ? "border-emerald-500/30 text-emerald-400"
                          : c.atsType === "LEVER"
                          ? "border-indigo-500/30 text-indigo-400"
                          : c.atsType === "ASHBY"
                          ? "border-purple-500/30 text-purple-400"
                          : "border-slate-500/30 text-slate-400"
                      }
                    >
                      {c.atsType}
                    </Badge>
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                    {c.atsBoardId || "—"}
                  </td>
                  <td className="p-2.5 text-muted-foreground">P{c.priority}</td>
                  <td className="p-2.5">
                    {c.careersUrl && (
                      <a
                        href={c.careersUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <span>Official Site</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
