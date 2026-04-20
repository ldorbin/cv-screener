"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PipelineStage } from "@/types";

const STAGE_CONFIG: Record<PipelineStage, { label: string; className: string }> = {
  new: { label: "New", className: "bg-slate-100 text-slate-700 border-slate-200" },
  shortlisted: { label: "Shortlisted", className: "bg-blue-50 text-blue-700 border-blue-200" },
  phone: { label: "Phone screen", className: "bg-purple-50 text-purple-700 border-purple-200" },
  interview: { label: "Interview", className: "bg-amber-50 text-amber-700 border-amber-200" },
  offer: { label: "Offer", className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
};

export function StageSelect({ cvId, initialStage }: { cvId: string; initialStage: PipelineStage }) {
  const router = useRouter();
  const [stage, setStage] = useState<PipelineStage>(initialStage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStage: PipelineStage) {
    setSaving(true);
    setError(null);
    const prev = stage;
    setStage(newStage);
    try {
      const res = await fetch(`/api/cvs/${cvId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setStage(prev);
        setError((json.error as string) ?? "Failed to update stage");
      } else {
        router.refresh();
      }
    } catch {
      setStage(prev);
      setError("Failed to update stage");
    } finally {
      setSaving(false);
    }
  }

  const cfg = STAGE_CONFIG[stage];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Stage</span>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
      <select
        value={stage}
        onChange={(e) => handleChange(e.target.value as PipelineStage)}
        disabled={saving}
        className={`rounded-md border px-3 py-1.5 text-sm font-medium cursor-pointer transition-colors ${cfg.className} disabled:opacity-50`}
      >
        {(Object.keys(STAGE_CONFIG) as PipelineStage[]).map((s) => (
          <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function StagePill({ stage }: { stage: PipelineStage }) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
