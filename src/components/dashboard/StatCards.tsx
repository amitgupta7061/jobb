import { Sparkles, Briefcase, Bookmark, ClipboardCheck, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface StatCardsProps {
  stats: {
    totalJobs: number;
    newToday: number;
    strongMatches: number;
    possibleMatches: number;
    savedJobs: number;
    appliedJobs: number;
    activeCompanies: number;
  };
}

export function StatCards({ stats }: StatCardsProps) {
  const cards = [
    {
      title: "Strong Matches",
      value: stats.strongMatches,
      subtitle: `${stats.possibleMatches} possible matches`,
      icon: Sparkles,
      iconColor: "text-emerald-400 bg-emerald-500/10",
      href: "/jobs?matchCategory=STRONG",
    },
    {
      title: "New Jobs Today",
      value: stats.newToday,
      subtitle: `Across ${stats.activeCompanies} verified companies`,
      icon: Briefcase,
      iconColor: "text-indigo-400 bg-indigo-500/10",
      href: "/jobs?sortBy=newest",
    },
    {
      title: "Saved Jobs",
      value: stats.savedJobs,
      subtitle: "Saved for later review",
      icon: Bookmark,
      iconColor: "text-amber-400 bg-amber-500/10",
      href: "/saved",
    },
    {
      title: "Applications",
      value: stats.appliedJobs,
      subtitle: "Actively being tracked",
      icon: ClipboardCheck,
      iconColor: "text-sky-400 bg-sky-500/10",
      href: "/applications",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Link
            key={idx}
            href={card.href}
            className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
              <div className={`rounded-lg p-2 ${card.iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground">{card.value}</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
          </Link>
        );
      })}
    </div>
  );
}
