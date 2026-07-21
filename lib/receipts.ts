import type { ActorBreakdown, ModelBreakdown, Receipt, UsageEvent } from "./types";
import { categoryLabel } from "./work-context";
import { workTypeLabel } from "./work-types";

export function buildReceipt(events: UsageEvent[], input: { repositoryId: string; prNumber: number; title: string; headSha: string; workType?: Receipt["workType"]; outcome?: Receipt["outcome"]; outcomeAt?: string }): Receipt {
  const byModel = new Map<string, ModelBreakdown>();
  const byActor = new Map<ActorBreakdown["actorType"], ActorBreakdown>();
  for (const event of events) {
    const current = byModel.get(event.model) ?? { model: event.model, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, costUsd: 0 };
    current.inputTokens += event.inputTokens;
    current.outputTokens += event.outputTokens;
    current.cachedInputTokens += event.cachedInputTokens;
    current.costUsd += event.costUsd;
    byModel.set(event.model, current);
    const actorType = event.actorType ?? "developer";
    const actor = byActor.get(actorType) ?? { actorType, label: actorType === "agent" ? "Autonomous agent" : "Developer-assisted", eventCount: 0, costUsd: 0 };
    actor.eventCount++;
    actor.costUsd += event.costUsd;
    byActor.set(actorType, actor);
  }
  const totalCost = events.reduce((total, event) => total + event.costUsd, 0);
  const exactContext = events.length ? events.reduce((total, event) => total + event.attributionConfidence, 0) / events.length : 0;
  return { ...input, workType: input.workType ?? "unclassified", totalCost: round(totalCost), confidence: exactContext, eventCount: events.length, models: [...byModel.values()].map((model) => ({ ...model, costUsd: round(model.costUsd) })).sort((a, b) => b.costUsd - a.costUsd), actors: [...byActor.values()].map((actor) => ({ ...actor, costUsd: round(actor.costUsd) })).sort((a, b) => b.costUsd - a.costUsd), updatedAt: new Date().toISOString() };
}

export function receiptMarkdown(receipt: Receipt, dashboardUrl: string): string {
  const money = (value: number) => `$${value.toFixed(2)}`;
  const modelLines = receipt.models.map((model) => `- **${model.model}** — ${money(model.costUsd)} · ${compactTokens(model.inputTokens)} input · ${compactTokens(model.outputTokens)} output${model.cachedInputTokens ? ` · ${compactTokens(model.cachedInputTokens)} cached` : ""}`).join("\n") || "- No Codex usage has been attributed to this branch yet.";
  const actors = (receipt.actors ?? []).length > 1 ? `\n- **Sources:** ${(receipt.actors ?? []).map((actor) => `${actor.label} ${money(actor.costUsd)}`).join(" · ")}` : "";
  const outcome = receipt.outcome === "merged" ? "Merged" : receipt.outcome === "closed_unmerged" ? "Closed without merge" : receipt.outcome === "open" ? "Open" : undefined;
  const attribution = `${Math.round(receipt.confidence * 100)}% ${receipt.confidence >= .95 ? "exact attribution" : "attribution confidence"}`;
  const observation = observationMarkdown(receipt, money);
  const workContext = receipt.workContext ? workContextMarkdown(receipt) : "";
  return `<!-- governor-cost-receipt -->\n## Governor cost receipt\n\n**${money(receipt.totalCost)} estimated Codex cost** · ${receipt.eventCount} usage events · ${attribution}${outcome ? `\n\n- **PR outcome:** ${outcome}` : ""}${actors}${workContext}\n\n### Cost breakdown\n${modelLines}${observation}\n\n_Token-rate estimate, not an invoice total. Governor stores no prompts, responses, generated code, raw PR comments, or repository file contents._\n\n[View full receipt](${dashboardUrl})`;
}

function workContextMarkdown(receipt: Receipt): string {
  const context = receipt.workContext!;
  const scope = [
    context.filesChanged !== undefined ? `${context.filesChanged} file${context.filesChanged === 1 ? "" : "s"}` : undefined,
    typeof context.additions === "number" ? `+${context.additions}` : undefined,
    typeof context.deletions === "number" ? `−${context.deletions}` : undefined
  ].filter((value): value is string => Boolean(value)).join(" · ");
  const categories = context.categoryCoverage === "complete" ? context.categories.map((category) => `${categoryLabel(category.category)} (${category.fileCount})`).join(" · ") : undefined;
  const summary = compactWorkSummary(context.summary);
  return `\n\n### Work context\n${scope ? `- **Scope:** ${scope}\n` : ""}- **Type:** ${workTypeLabel(receipt.workType)}${categories ? `\n- **Areas:** ${categories}` : ""}${summary ? `\n- **Summary:** ${summary}` : ""}`;
}

function observationMarkdown(receipt: Receipt, money: (value: number) => string): string { const observation = receipt.observation; if (!observation || observation.category === "attribution_quality") return ""; if (observation.category === "cost_outlier" && observation.comparison) { const comparison = observation.comparison; const scope = comparison.scope === "work_type" ? "similar PRs" : "repository PRs"; return `\n\n### Governor observation\n- **Above usual cost:** ${money(comparison.currentCostUsd)} vs ${money(comparison.baselineCostUsd)} median across ${comparison.sampleSize} ${scope}\n- **Difference:** +${money(comparison.deltaUsd)} · ${comparison.multiplier.toFixed(1)}× typical`; } return `\n\n### Governor observation\n- **${observation.title}:** ${observation.explanation}\n- **Evidence:** ${observation.evidence}`; }
function compactTokens(value: number): string { if (value >= 1_000_000) return `${trimDecimal(value / 1_000_000)}M`; if (value >= 1_000) return `${trimDecimal(value / 1_000)}K`; return value.toLocaleString(); }
function trimDecimal(value: number): string { return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2).replace(/\.0+$/, ""); }
function compactWorkSummary(summary: string): string | undefined { const normalized = summary.replace(/\s+/g, " ").trim(); if (!normalized || /^This receipt is attached to PR /i.test(normalized)) return; return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}…` : normalized; }

function round(value: number) { return Math.round((value + Number.EPSILON) * 1000000) / 1000000; }
