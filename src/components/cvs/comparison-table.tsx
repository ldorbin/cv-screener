"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "./verdict-badge";
import { DIMENSION_LABELS, type Cv, type KnockoutCriterion, type Score } from "@/types";

type Row = { cv: Cv; score: Score };
type SortKey = "overall_score" | keyof typeof DIMENSION_LABELS;

function scoreColor(n: number) {
  if (n >= 75) return "bg-green-100 text-green-800";
  if (n >= 50) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

interface Props {
  rows: Row[];
  knockoutCriteria: KnockoutCriterion[];
  showHardRejects?: boolean;
}

export function ComparisonTable({ rows: initialRows, knockoutCriteria, showHardRejects: initialShow = false }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("overall_score");
  const [showRejects, setShowRejects] = useState(initialShow);

  const filtered = showRejects ? initialRows : initialRows.filter((r) => !r.score.has_hard_reject);
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "overall_score") return b.score.overall_score - a.score.overall_score;
    const da = a.score.result.dimensions[sortKey as keyof typeof a.score.result.dimensions]?.score ?? 0;
    const db = b.score.result.dimensions[sortKey as keyof typeof b.score.result.dimensions]?.score ?? 0;
    return db - da;
  });

  const dimKeys = Object.keys(DIMENSION_LABELS) as (keyof typeof DIMENSION_LABELS)[];
  const hasKnockout = knockoutCriteria.length > 0;
  const rejectedCount = initialRows.filter((r) => r.score.has_hard_reject).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sorted.length} candidate{sorted.length !== 1 ? "s" : ""}
          {!showRejects && rejectedCount > 0 && (
            <span className="ml-1 text-destructive">· {rejectedCount} hard reject{rejectedCount !== 1 ? "s" : ""} hidden</span>
          )}
        </p>
        {rejectedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowRejects(!showRejects)}>
            {showRejects ? "Hide" : "Show"} hard rejects
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-secondary/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Candidate</th>
              <th
                className="cursor-pointer px-3 py-3 text-center font-medium hover:text-primary"
                onClick={() => setSortKey("overall_score")}
              >
                <span className="flex items-center justify-center gap-1">
                  Score <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              {dimKeys.map((k) => (
                <th
                  key={k}
                  className="cursor-pointer px-3 py-3 text-center font-medium hover:text-primary"
                  onClick={() => setSortKey(k)}
                  title={DIMENSION_LABELS[k]}
                >
                  <span className="flex items-center justify-center gap-1">
                    <span className="hidden lg:inline">{DIMENSION_LABELS[k].split(" ")[0]}</span>
                    <span className="lg:hidden">{DIMENSION_LABELS[k].slice(0, 3)}</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
              ))}
              {hasKnockout && (
                <th className="px-3 py-3 text-center font-medium">Criteria</th>
              )}
              <th className="px-3 py-3 text-center font-medium">Verdict</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sorted.map(({ cv, score }) => (
              <tr
                key={cv.id}
                className={`transition-colors hover:bg-secondary/20 ${score.has_hard_reject ? "opacity-60" : ""}`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{cv.candidate_name ?? cv.file_name ?? "Candidate"}</p>
                  {score.has_hard_reject && (
                    <span className="text-xs text-destructive">Hard reject</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-block rounded-md px-2 py-1 text-sm font-semibold ${scoreColor(score.overall_score)}`}>
                    {score.overall_score}
                  </span>
                </td>
                {dimKeys.map((k) => {
                  const s = score.result.dimensions[k]?.score ?? 0;
                  return (
                    <td key={k} className="px-3 py-3 text-center">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${scoreColor(s)}`}>
                        {s}
                      </span>
                    </td>
                  );
                })}
                {hasKnockout && (
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {knockoutCriteria.map((c) => {
                        const r = score.knockout_results?.find((kr) => kr.criterionId === c.id);
                        return r?.met === false ? (
                          <span key={c.id} title={`Failed: ${c.text}`}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </span>
                        ) : r?.met === true ? (
                          <span key={c.id} title={`Passed: ${c.text}`}>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </span>
                        ) : (
                          <span key={c.id} className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" title={c.text} />
                        );
                      })}
                    </div>
                  </td>
                )}
                <td className="px-3 py-3 text-center">
                  <VerdictBadge verdict={score.verdict} />
                </td>
                <td className="px-3 py-3 text-center">
                  <Link href={`/cv/${cv.id}`}>
                    <Button variant="ghost" size="icon" title="View full report">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
