"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Status = "queued" | "uploading" | "uploaded" | "failed";

interface Item {
  id: string;
  file: File;
  status: Status;
  error?: string;
}

export function CvDropzone({ jobSpecId }: { jobSpecId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<{
    scored: number;
    failed: number;
    total: number;
  } | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setItems((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "queued" as Status,
      })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxSize: 10 * 1024 * 1024,
  });

  async function uploadAll() {
    const queued = items.filter((i) => i.status === "queued");
    for (const item of queued) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i)),
      );
      const form = new FormData();
      form.append("file", item.file);
      form.append("jobSpecId", jobSpecId);
      try {
        const res = await fetch("/api/parse", { method: "POST", body: form });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: "upload failed" }));
          throw new Error(error);
        }
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "uploaded" } : i)),
        );
      } catch (e) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "failed", error: e instanceof Error ? e.message : "failed" }
              : i,
          ),
        );
      }
    }
  }

  async function scoreAll() {
    setScoring(true);
    setScoreResult(null);
    try {
      const res = await fetch("/api/score/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobSpecId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "scoring failed");
      setScoreResult(json);
      router.refresh();
    } catch (e) {
      setScoreResult({ scored: 0, failed: 0, total: 0 });
      alert(e instanceof Error ? e.message : "scoring failed");
    } finally {
      setScoring(false);
    }
  }

  const uploadedCount = items.filter((i) => i.status === "uploaded").length;
  const queuedCount = items.filter((i) => i.status === "queued").length;
  const uploadingCount = items.filter((i) => i.status === "uploading").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 px-6 py-12 text-center transition-colors",
              isDragActive && "border-primary bg-primary/5",
            )}
          >
            <input {...getInputProps()} />
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </span>
            <p className="font-medium">
              {isDragActive ? "Drop your CVs here" : "Drag CVs here or click to browse"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF, DOCX, or TXT — up to 10MB each
            </p>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            {items.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.file.name}</p>
                  {i.error && <p className="text-xs text-destructive">{i.error}</p>}
                </div>
                <StatusIcon status={i.status} />
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {uploadedCount}/{items.length} uploaded
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={uploadAll}
                  disabled={queuedCount === 0 || uploadingCount > 0}
                >
                  {uploadingCount > 0 ? "Uploading…" : "Upload all"}
                </Button>
                <Button
                  variant="accent"
                  onClick={scoreAll}
                  disabled={uploadedCount === 0 || scoring}
                >
                  {scoring ? "Scoring…" : "Score all"}
                </Button>
              </div>
            </div>

            {scoring && (
              <div className="space-y-2">
                <Progress value={50} />
                <p className="text-center text-xs text-muted-foreground">
                  Scoring in progress — this takes ~10–20s per CV in parallel.
                </p>
              </div>
            )}

            {scoreResult && !scoring && (
              <div className="rounded-lg bg-success/10 p-3 text-sm text-success">
                Scored {scoreResult.scored} of {scoreResult.total}.
                {scoreResult.failed > 0 && ` ${scoreResult.failed} failed.`}{" "}
                <a
                  href={`/jobs/${jobSpecId}`}
                  className="font-medium underline"
                >
                  View results →
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "uploaded")
    return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "uploading")
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  return <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />;
}
