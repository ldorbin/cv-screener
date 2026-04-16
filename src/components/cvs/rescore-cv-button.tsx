"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RescoreCvButton({ cvId }: { cvId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
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
    <Button onClick={onClick} disabled={loading} variant="outline" size="sm">
      <RotateCw className="h-4 w-4" />
      {loading ? "Re-scoring…" : "Re-score"}
    </Button>
  );
}
