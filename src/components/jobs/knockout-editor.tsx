"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KnockoutCriterion, CriterionType } from "@/types";

const TYPE_LABELS: Record<CriterionType, string> = {
  "must-have": "Must-have",
  "nice-to-have": "Nice-to-have",
  "hard-reject": "Hard reject",
};

const TYPE_COLORS: Record<CriterionType, string> = {
  "must-have": "bg-blue-100 text-blue-800 border-blue-200",
  "nice-to-have": "bg-green-100 text-green-800 border-green-200",
  "hard-reject": "bg-red-100 text-red-800 border-red-200",
};

interface Props {
  value: KnockoutCriterion[];
  onChange: (v: KnockoutCriterion[]) => void;
}

export function KnockoutEditor({ value, onChange }: Props) {
  function add() {
    onChange([
      ...value,
      { id: crypto.randomUUID(), text: "", type: "must-have" },
    ]);
  }

  function update(id: string, patch: Partial<KnockoutCriterion>) {
    onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function remove(id: string) {
    onChange(value.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No criteria yet. Add must-haves, nice-to-haves, or hard-reject conditions.
        </p>
      )}
      {value.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <select
            value={c.type}
            onChange={(e) => update(c.id, { type: e.target.value as CriterionType })}
            className={`shrink-0 rounded-md border px-2 py-1.5 text-xs font-medium ${TYPE_COLORS[c.type]}`}
          >
            {(Object.keys(TYPE_LABELS) as CriterionType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <Input
            value={c.text}
            onChange={(e) => update(c.id, { text: e.target.value })}
            placeholder="e.g. 5+ years Python, UK right to work, Active SC clearance…"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(c.id)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" />
        Add criterion
      </Button>
    </div>
  );
}
