import type { ModelRate, UsageEvent } from "./types";

export const DEFAULT_MODEL_RATES: ModelRate[] = [
  { model: "gpt-5.6", effectiveFrom: "2026-01-01", inputPerMTok: 2.5, outputPerMTok: 15, cachedInputPerMTok: 0.25 },
  { model: "gpt-5.6-mini", effectiveFrom: "2026-01-01", inputPerMTok: 0.4, outputPerMTok: 2, cachedInputPerMTok: 0.04 },
  { model: "gpt-5.2-codex", effectiveFrom: "2026-01-01", inputPerMTok: 2.5, outputPerMTok: 15, cachedInputPerMTok: 0.25 }
];

export function resolveRate(model: string, occurredAt: string, rates: ModelRate[]): ModelRate {
  const date = occurredAt.slice(0, 10);
  const candidates = rates.filter((rate) => rate.model === model && rate.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  if (!candidates[0]) throw new Error(`No effective Governor rate configured for model: ${model}`);
  return candidates[0];
}

export function estimateCost(tokens: Pick<UsageEvent, "inputTokens" | "outputTokens" | "cachedInputTokens">, rate: ModelRate): number {
  const uncachedInput = Math.max(0, tokens.inputTokens - tokens.cachedInputTokens);
  const raw = (uncachedInput * rate.inputPerMTok + tokens.cachedInputTokens * rate.cachedInputPerMTok + tokens.outputTokens * rate.outputPerMTok) / 1_000_000;
  return Math.round((raw + Number.EPSILON) * 1000000) / 1000000;
}
