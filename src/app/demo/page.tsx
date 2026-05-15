"use client";

import { useState, useRef } from "react";
import { Sparkles, Upload, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScoreResult, DimensionKey } from "@/types";
import { DIMENSION_LABELS } from "@/types";

const VERDICT_CONFIG = {
  "strong-match": { label: "Strong match", className: "bg-green-100 text-green-800 border-green-200" },
  "potential-match": { label: "Potential match", className: "bg-amber-100 text-amber-800 border-amber-200" },
  "weak-match": { label: "Weak match", className: "bg-red-100 text-red-800 border-red-200" },
} as const;

const CONFIDENCE_CONFIG = {
  high: "bg-blue-50 text-blue-700",
  medium: "bg-slate-100 text-slate-600",
  low: "bg-orange-50 text-orange-700",
} as const;

function ScoreRing({ score }: { score: number }) {
  const colour = score >= 75 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  return (
    <div className={`flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 ${score >= 75 ? "border-green-200" : score >= 50 ? "border-amber-200" : "border-red-200"}`}>
      <span className={`text-3xl font-bold ${colour}`}>{score}</span>
      <span className="text-xs text-muted-foreground">/100</span>
    </div>
  );
}

function DimensionRow({ label, score, reasoning }: { label: string; score: number; reasoning: string }) {
  const [open, setOpen] = useState(false);
  const width = `${score}%`;
  const colour = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="space-y-1">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-secondary/50 transition-colors">
        <span className="w-44 shrink-0 text-sm font-medium">{label}</span>
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <div className={`h-full rounded-full ${colour} transition-all`} style={{ width }} />
        </div>
        <span className="w-8 text-right text-sm font-semibold">{score}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <p className="ml-1 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">{reasoning}</p>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setCvFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cvFile || !jobTitle.trim() || !jobDescription.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("cv", cvFile);
    form.append("jobTitle", jobTitle.trim());
    form.append("jobDescription", jobDescription.trim());

    try {
      const res = await fetch("/api/demo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setResult(json.result as ScoreResult);
      setCandidateName(json.candidateName ?? null);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!cvFile && jobTitle.trim().length >= 2 && jobDescription.trim().length >= 20 && !loading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-semibold text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            TalentLens
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            AI Demo
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        {/* Intro */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI-powered CV screening, live
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Paste a job description, upload a CV, and watch TalentLens reason across
            six dimensions — skills, experience, domain fit, responsibilities, growth trajectory, and credentials.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job inputs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Data Engineer"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Job description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              placeholder="Paste the full job description here — the more detail, the more accurate the analysis…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* CV upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload CV</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                dragging ? "border-primary bg-primary/5" : cvFile ? "border-green-400 bg-green-50" : "border-border hover:border-primary/50 hover:bg-secondary/40"
              }`}
            >
              {cvFile ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                  <p className="font-medium text-sm">{cvFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(cvFile.size / 1024).toFixed(0)} KB · Click to replace</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drop CV here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT · max 10 MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={(e) => { if (e.target.files?.[0]) setCvFile(e.target.files[0]); }} />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing CV…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyse CV
              </>
            )}
          </Button>
        </form>

        {/* Results */}
        {result && (
          <div ref={resultsRef} className="space-y-6 pt-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Analysis result</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Score summary card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <ScoreRing score={result.overallScore} />
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    {candidateName && <p className="font-semibold text-lg">{candidateName}</p>}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <Badge className={`border ${VERDICT_CONFIG[result.verdict].className}`}>
                        {VERDICT_CONFIG[result.verdict].label}
                      </Badge>
                      <Badge variant="outline" className={CONFIDENCE_CONFIG[result.confidence]}>
                        {result.confidence} confidence
                      </Badge>
                      {result.hasHardReject && (
                        <Badge className="border border-red-200 bg-red-100 text-red-800">
                          Hard reject triggered
                        </Badge>
                      )}
                    </div>
                    {result.summary && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardContent className="p-6 space-y-2">
                <h2 className="font-semibold mb-4">Dimension breakdown</h2>
                {(Object.keys(result.dimensions) as DimensionKey[]).map((key) => (
                  <DimensionRow
                    key={key}
                    label={DIMENSION_LABELS[key]}
                    score={result.dimensions[key].score}
                    reasoning={result.dimensions[key].reasoning}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Strengths / Gaps / Probes */}
            <div className="grid gap-4 md:grid-cols-3">
              {result.strengths.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold mb-3 text-green-700">Strengths</h3>
                    <ul className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {result.gaps.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold mb-3 text-amber-700">Gaps</h3>
                    <ul className="space-y-2">
                      {result.gaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {result.interviewProbes.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold mb-3 text-blue-700">Interview probes</h3>
                    <ul className="space-y-2">
                      {result.interviewProbes.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {result.transferableStrengths.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold mb-3 text-purple-700">Transferable strengths</h3>
                  <ul className="space-y-2">
                    {result.transferableStrengths.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {result.redFlags.length > 0 && (
              <Card className="border-red-200">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold mb-3 text-red-700">Red flags</h3>
                  <ul className="space-y-2">
                    {result.redFlags.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 px-6 py-6 text-center text-xs text-muted-foreground mt-10">
        TalentLens · Powered by Claude AI
      </footer>
    </div>
  );
}
