"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightsEditor } from "./weights-editor";
import { DEFAULT_WEIGHTS, type DimensionWeights } from "@/types";

export function JobForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [blindMode, setBlindMode] = useState(false);
  const [weights, setWeights] = useState<DimensionWeights>({ ...DEFAULT_WEIGHTS });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("job_specs")
      .insert({
        user_id: user.id,
        title,
        company: company || null,
        description,
        weights,
        blind_mode: blindMode,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/jobs/${data.id}/upload`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Role details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Job title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior Backend Engineer"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Job description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={14}
              placeholder="Paste the full job description: responsibilities, required skills, nice-to-haves, seniority, domain context…"
              required
            />
            <p className="text-xs text-muted-foreground">
              Richer descriptions give Claude more to reason against. Include responsibilities, required skills, nice-to-haves, and seniority signals.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 p-3">
            <div>
              <Label htmlFor="blind" className="cursor-pointer">Blind mode</Label>
              <p className="text-xs text-muted-foreground">
                Redact emails, phone numbers, and URLs before scoring — an extra bias guardrail.
              </p>
            </div>
            <Switch id="blind" checked={blindMode} onCheckedChange={setBlindMode} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dimension weights</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightsEditor value={weights} onChange={setWeights} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Saving…" : "Create & upload CVs"}
        </Button>
      </div>
    </form>
  );
}
