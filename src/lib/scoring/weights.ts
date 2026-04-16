import { DIMENSION_KEYS, DEFAULT_WEIGHTS, type DimensionWeights } from "@/types";

export function normaliseWeights(
  weights: Partial<DimensionWeights> | null | undefined,
): DimensionWeights {
  const base: DimensionWeights = { ...DEFAULT_WEIGHTS, ...(weights ?? {}) };
  const total = DIMENSION_KEYS.reduce((s, k) => s + (base[k] ?? 0), 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  const scaled = {} as DimensionWeights;
  DIMENSION_KEYS.forEach((k) => {
    scaled[k] = Math.round((base[k] / total) * 100);
  });
  return scaled;
}
