"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RescoreButton({ jobSpecId }: { jobSpecId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/score/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobSpecId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "scoring failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "scoring failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={onClick} disabled={loading} variant="accent">
      <Sparkles className="h-4 w-4" />
      {loading ? "Scoring…" : "Score pending"}
    </Button>
  );
}
