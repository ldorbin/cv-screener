"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RescoreCvButton({ cvId }: { cvId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      });
      let json: Record<string, unknown> = {};
      try { json = await res.json(); } catch { /* HTML error page */ }
      if (!res.ok) {
        setError((json.error as string) ?? "Scoring failed");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={onClick} disabled={loading} variant="outline" size="sm">
        <RotateCw className="h-4 w-4" />
        {loading ? "Re-scoring…" : "Re-score"}
      </Button>
      {error && <p className="text-xs text-destructive max-w-xs text-right">{error}</p>}
    </div>
  );
}
