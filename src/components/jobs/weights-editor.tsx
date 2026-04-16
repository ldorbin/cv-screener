"use client";

import { DIMENSION_KEYS, DIMENSION_LABELS, DEFAULT_WEIGHTS, type DimensionWeights } from "@/types";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export function WeightsEditor({
  value,
  onChange,
}: {
  value: DimensionWeights;
  onChange: (w: DimensionWeights) => void;
}) {
  const total = DIMENSION_KEYS.reduce((s, k) => s + value[k], 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Adjust per-dimension weights. Totals don&apos;t need to sum to 100 — they&apos;ll be normalised.
        </p>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          className="text-xs font-medium text-primary hover:underline"
        >
          Reset
        </button>
      </div>
      <div className="space-y-3">
        {DIMENSION_KEYS.map((k) => (
          <div key={k} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{DIMENSION_LABELS[k]}</Label>
              <span className="text-sm font-medium">
                {value[k]} <span className="text-muted-foreground">({pct(value[k], total)}%)</span>
              </span>
            </div>
            <Slider
              value={[value[k]]}
              min={0}
              max={50}
              step={1}
              onValueChange={([v]) => onChange({ ...value, [k]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function pct(v: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((v / total) * 100);
}
