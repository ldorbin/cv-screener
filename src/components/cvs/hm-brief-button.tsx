"use client";

import { useState } from "react";
import { Copy, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  cvId: string;
}

export function HmBriefButton({ cvId }: Props) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setOpen(true);
    setBrief(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* HTML error page */ }
      if (!res.ok) throw new Error((data.error as string) ?? "Failed to generate brief");
      setBrief(data.brief as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate brief");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!brief) return;
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button variant="outline" onClick={generate} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        HM brief
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Hiring manager brief</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating brief…
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              {brief && (
                <>
                  <div className="whitespace-pre-wrap rounded-lg bg-secondary/40 p-4 text-sm leading-relaxed">
                    {brief}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={copy}>
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={generate}>
                      Regenerate
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
