"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobStatus } from "@/types";

const STATUS_CONFIG: Record<JobStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-green-50 text-green-700 border-green-200" },
  on_hold: { label: "On hold", className: "bg-amber-50 text-amber-700 border-amber-200" },
  filled: { label: "Filled", className: "bg-blue-50 text-blue-700 border-blue-200" },
  closed: { label: "Closed", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function StatusSelect({ jobId, initialStatus }: { jobId: string; initialStatus: JobStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<JobStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStatus: JobStatus) {
    setSaving(true);
    setError(null);
    const prev = status;
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setStatus(prev);
        setError((json.error as string) ?? "Failed to update status");
      } else {
        router.refresh();
      }
    } catch {
      setStatus(prev);
      setError("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  const cfg = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col gap-1">
      {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as JobStatus)}
        disabled={saving}
        className={`rounded-md border px-3 py-1.5 text-sm font-medium cursor-pointer transition-colors ${cfg.className} disabled:opacity-50`}
      >
        {(Object.keys(STATUS_CONFIG) as JobStatus[]).map((s) => (
          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
