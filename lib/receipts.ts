import type { ModelBreakdown, Receipt, UsageEvent } from "./types";

export function buildReceipt(events: UsageEvent[], input: { repositoryId: string; prNumber: number; title: string; headSha: string }): Receipt {
  const byModel = new Map<string, ModelBreakdown>();
  for (const event of events) {
    const current = byModel.get(event.model) ?? { model: event.model, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, costUsd: 0 };
    current.inputTokens += event.inputTokens; current.outputTokens += event.outputTokens; current.cachedInputTokens += event.cachedInputTokens;
    current.costUsd += event.costUsd; byModel.set(event.model, current);
  }
  const totalCost = events.reduce((total, event) => total + event.costUsd, 0);
  const confidence = events.length ? events.reduce((total, event) => total + event.attributionConfidence, 0) / events.length : 0;
  return { ...input, totalCost: round(totalCost), confidence, eventCount: events.length, models: [...byModel.values()].map((model) => ({ ...model, costUsd: round(model.costUsd) })).sort((a, b) => b.costUsd - a.costUsd), updatedAt: new Date().toISOString() };
}

export function receiptMarkdown(receipt: Receipt, dashboardUrl: string): string {
  const money = (n: number) => `$${n.toFixed(2)}`;
  const modelLines = receipt.models.map((model) => "- `" + model.model + "`: " + money(model.costUsd) + " · " + model.inputTokens.toLocaleString() + " input / " + model.outputTokens.toLocaleString() + " output tokens").join("\n") || "- No Codex usage has been attributed to this branch yet.";
  const confidence = `${Math.round(receipt.confidence * 100)}% ${receipt.confidence >= 0.95 ? "exact context" : "inferred context"}`;
  return `<!-- governor-cost-receipt -->\n## Governor cost receipt\n\n**Estimated Codex cost: ${money(receipt.totalCost)}** · ${receipt.eventCount} usage events · attribution: **${confidence}**\n\n${modelLines}\n\n${receipt.explanation ? `> ${receipt.explanation}\n\n` : ""}These are transparent token-rate estimates, not invoice totals. Governor never stores prompts, responses, or generated code. [View calculation](${dashboardUrl})`;
}

function round(value: number) { return Math.round((value + Number.EPSILON) * 1000000) / 1000000; }
