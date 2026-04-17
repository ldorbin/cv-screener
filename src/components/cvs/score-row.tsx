import Link from "next/link";
import { ChevronRight, XCircle } from "lucide-react";
import { VerdictBadge } from "./verdict-badge";
import type { Cv, Score } from "@/types";

export function ScoreRow({ cv, score }: { cv: Cv; score: Score | null }) {
  return (
    <Link
      href={`/cv/${cv.id}`}
      className="flex items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-semibold text-primary">
        {score ? score.overall_score : "—"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {cv.candidate_name ?? cv.file_name ?? "Candidate"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {cv.file_name ?? ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {score?.has_hard_reject && (
          <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            <XCircle className="h-3 w-3" />
            Hard reject
          </span>
        )}
        {score ? (
          <VerdictBadge verdict={score.verdict} />
        ) : cv.status === "failed" ? (
          <span className="text-xs text-destructive">Failed</span>
        ) : cv.status === "scoring" ? (
          <span className="text-xs text-primary">Scoring…</span>
        ) : (
          <span className="text-xs text-muted-foreground">Pending</span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
