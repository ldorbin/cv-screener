"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitCompare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Job {
  id: string;
  title: string;
  company: string | null;
}

export function CrossJobButton({ cvId, otherJobs }: { cvId: string; otherJobs: Job[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (otherJobs.length === 0) return null;

  async function score(targetJobSpecId: string) {
    setLoading(true);
    setError(null);
    setOpen(false);
    try {
      const res = await fetch("/api/score/cross-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCvId: cvId, targetJobSpecId }),
      });
      let json: Record<string, unknown> = {};
      try { json = await res.json(); } catch { /* HTML error page */ }
      if (!res.ok) {
        setError((json.error as string) ?? "Failed");
        return;
      }
      const targetId = (json.newCvId ?? json.existingCvId) as string;
      router.push(`/cv/${targetId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={loading}
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <GitCompare className="h-4 w-4" />}
        {loading ? "Scoring…" : "Match to another job"}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border/60 bg-card p-2 shadow-lg">
            <p className="mb-1 px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Score against
            </p>
            <div className="max-h-64 overflow-y-auto">
              {otherJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => score(job.id)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <span className="font-medium">{job.title}</span>
                  {job.company && (
                    <span className="ml-1 text-muted-foreground">· {job.company}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
