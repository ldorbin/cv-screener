"use client";

import { useState, useEffect } from "react";
import { Link2, Copy, Check, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareData { id: string; token: string }

export function ShareButton({ jobId }: { jobId: string }) {
  const [share, setShare] = useState<ShareData | null | undefined>(undefined); // undefined = loading
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/share`)
      .then((r) => r.json())
      .then((j) => setShare(j.share ?? null))
      .catch(() => setShare(null));
  }, [jobId]);

  const shareUrl = share
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${share.token}`
    : null;

  async function createShare() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/share`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError((json.error as string) ?? "Failed"); return; }
      setShare(json.share as ShareData);
    } catch { setError("Failed"); }
    finally { setLoading(false); }
  }

  async function revokeShare() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/share`, { method: "DELETE" });
      if (!res.ok) { setError("Failed to revoke"); return; }
      setShare(null);
    } catch { setError("Failed to revoke"); }
    finally { setLoading(false); }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (share === undefined) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Share shortlist
      </Button>
    );
  }

  if (!share) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" size="sm" onClick={createShare} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Share shortlist
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-1.5">
        <span className="max-w-48 truncate text-xs text-muted-foreground">{shareUrl}</span>
        <button onClick={copyLink} className="text-muted-foreground transition-colors hover:text-foreground" title="Copy link">
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button onClick={revokeShare} disabled={loading} className="text-muted-foreground transition-colors hover:text-destructive" title="Revoke link">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
