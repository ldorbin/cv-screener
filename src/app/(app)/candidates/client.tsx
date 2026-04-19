"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { VerdictBadge } from "@/components/cvs/verdict-badge";
import { formatDate } from "@/lib/utils";
import type { Verdict } from "@/types";

export interface CandidateGroup {
  name: string;
  slug: string;
  jobCount: number;
  bestScore: number | null;
  bestVerdict: Verdict | null;
  lastActivity: string;
}

export function CandidatesClient({ candidates }: { candidates: CandidateGroup[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? candidates.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : candidates;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search candidates…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border/60 bg-card py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {query ? `No candidates matching "${query}"` : "No candidates yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-secondary/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Jobs applied</th>
                <th className="px-4 py-3">Best score</th>
                <th className="px-4 py-3">Verdict</th>
                <th className="hidden sm:table-cell px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {filtered.map((c) => (
                <tr key={c.slug} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/candidates/${c.slug}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.jobCount} role{c.jobCount !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary">
                    {c.bestScore ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.bestVerdict ? <VerdictBadge verdict={c.bestVerdict} /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                    {formatDate(c.lastActivity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
