import type { ActorBreakdown, ModelBreakdown, Receipt, UsageEvent } from "./types";
import { categoryLabel } from "./work-context";

export function buildReceipt(events: UsageEvent[], input: { repositoryId: string; prNumber: number; title: string; headSha: string; outcome?: Receipt["outcome"]; outcomeAt?: string }): Receipt {
  const byModel = new Map<string, ModelBreakdown>();
  const byActor = new Map<ActorBreakdown["actorType"], ActorBreakdown>();
  for (const event of events) {
    const current = byModel.get(event.model) ?? { model: event.model, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, costUsd: 0 };
    current.inputTokens += event.inputTokens; current.outputTokens += event.outputTokens; current.cachedInputTokens += event.cachedInputTokens;
    current.costUsd += event.costUsd; byModel.set(event.model, current);
    const actorType=event.actorType ?? "developer";
    const actor=byActor.get(actorType) ?? {actorType,label:actorType === "agent" ? "Autonomous agent" : "Developer-assisted",eventCount:0,costUsd:0};
    actor.eventCount++; actor.costUsd+=event.costUsd; byActor.set(actorType,actor);
  }
  const totalCost = events.reduce((total, event) => total + event.costUsd, 0);
  const confidence = events.length ? events.reduce((total, event) => total + event.attributionConfidence, 0) / events.length : 0;
  return { ...input, totalCost: round(totalCost), confidence, eventCount: events.length, models: [...byModel.values()].map((model) => ({ ...model, costUsd: round(model.costUsd) })).sort((a, b) => b.costUsd - a.costUsd), actors:[...byActor.values()].map((actor)=>({...actor,costUsd:round(actor.costUsd)})).sort((a,b)=>b.costUsd-a.costUsd), updatedAt: new Date().toISOString() };
}

export function receiptMarkdown(receipt: Receipt, dashboardUrl: string): string {
  const money = (n: number) => `$${n.toFixed(2)}`;
  const modelLines = receipt.models.map((model) => "- `" + model.model + "`: " + money(model.costUsd) + " · " + model.inputTokens.toLocaleString() + " input / " + model.outputTokens.toLocaleString() + " output tokens").join("\n") || "- No Codex usage has been attributed to this branch yet.";
  const confidence = `${Math.round(receipt.confidence * 100)}% ${receipt.confidence >= 0.95 ? "exact context" : "inferred context"}`;
  const actors=(receipt.actors ?? []).map((actor)=>`**${actor.label}: ${money(actor.costUsd)}** · ${actor.eventCount} event${actor.eventCount===1?"":"s"}`).join(" · ");
  const outcome=receipt.outcome === "merged" ? "**PR outcome: Merged**" : receipt.outcome === "closed_unmerged" ? "**PR outcome: Closed without merge**" : receipt.outcome === "open" ? "**PR outcome: Open**" : "";
  const observation=receipt.observation ? `\n> **Governor observation — ${receipt.observation.title}.** ${receipt.observation.explanation}${receipt.observation.impactUsd ? ` Estimated impact: ${money(receipt.observation.impactUsd)}.` : ""}\n` : "";
  const workContext=receipt.workContext ? workContextMarkdown(receipt) : "";
  return `<!-- governor-cost-receipt -->\n## Governor cost receipt\n\n**Estimated Codex cost: ${money(receipt.totalCost)}** · ${receipt.eventCount} usage events · attribution: **${confidence}**${actors ? `\n\n${actors}` : ""}${outcome ? `\n\n${outcome}` : ""}${workContext}\n${modelLines}\n${observation}\n${receipt.explanation ? `> ${receipt.explanation}\n\n` : ""}These are transparent token-rate estimates, not invoice totals. Governor never stores prompts, responses, generated code, raw PR comments, or repository file contents. [View calculation](${dashboardUrl})`;
}

function workContextMarkdown(receipt: Receipt): string {
  const context=receipt.workContext!;
  const scope=[
    context.filesChanged!==undefined ? `${context.filesChanged} file${context.filesChanged===1?"":"s"}` : undefined,
    typeof context.additions === "number" ? `+${context.additions}` : undefined,
    typeof context.deletions === "number" ? `−${context.deletions}` : undefined,
    ...(context.categoryCoverage === "complete" ? context.categories.map((category)=>`${category.fileCount} ${categoryLabel(category.category)}`) : [])
  ].filter(Boolean).join(" · ");
  const sources=context.sources.map((source)=>source === "pr_metadata" ? "PR metadata" : source === "pr_discussion" ? "PR discussion" : "review comments").join(", ");
  return `\n\n### Work context\n\n${context.summary}${scope ? `\n\n${scope}` : ""}\n\n_Derived from ${sources}; raw comments and file contents are not stored._\n`;
}

function round(value: number) { return Math.round((value + Number.EPSILON) * 1000000) / 1000000; }
