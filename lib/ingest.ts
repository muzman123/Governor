import crypto from "node:crypto";
import { z } from "zod";
import { estimateCost, resolveRate } from "./pricing";
import type { GovernorStore } from "./store";
import type { UsageEvent, UsageSource } from "./types";

export const ContextSchema = z.object({ sessionId:z.string().min(1), repositorySlug:z.string().regex(/^[^/]+\/[^/]+$/), branch:z.string().min(1), headSha:z.string().min(4), observedAt:z.string().datetime().optional() });
export const UsageSchema = z.object({ eventKey:z.string().min(1).optional(), source:z.enum(["otel","session_file","manual"]).default("manual"), sessionId:z.string().min(1).optional(), repositorySlug:z.string().regex(/^[^/]+\/[^/]+$/).optional(), branch:z.string().optional(), headSha:z.string().optional(), model:z.string().min(1), inputTokens:z.coerce.number().int().nonnegative(), outputTokens:z.coerce.number().int().nonnegative(), cachedInputTokens:z.coerce.number().int().nonnegative().default(0), occurredAt:z.string().datetime().optional() });
export type UsageInput = z.infer<typeof UsageSchema>;

export async function ingestUsage(store: GovernorStore, developerId: string, input: UsageInput): Promise<{ inserted: boolean; event?: UsageEvent }> {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const context = input.sessionId ? await store.getContext(input.sessionId) : undefined;
  const repositorySlug = context?.repositorySlug ?? input.repositorySlug;
  if (!repositorySlug) throw new Error("Usage event needs a session context or repositorySlug");
  const repository = await store.getRepositoryBySlug(repositorySlug);
  if (!repository) throw new Error(`Governor is not installed for repository ${repositorySlug}`);
  const rate = resolveRate(input.model, occurredAt, await store.getRates());
  const exact = Boolean(context && context.developerId === developerId);
  const event: UsageEvent = {
    id: crypto.randomUUID(), eventKey: input.eventKey ?? crypto.createHash("sha256").update(JSON.stringify([input.sessionId,input.model,input.inputTokens,input.outputTokens,input.cachedInputTokens,occurredAt])).digest("hex"), source: input.source as UsageSource,
    sessionId: input.sessionId, repositoryId: repository.id, developerId, branch: context?.branch ?? input.branch, headSha: context?.headSha ?? input.headSha, model: input.model,
    inputTokens: input.inputTokens, outputTokens: input.outputTokens, cachedInputTokens: input.cachedInputTokens, occurredAt, costUsd: estimateCost(input, rate), rateEffectiveFrom:rate.effectiveFrom,
    attributionMethod: exact ? "hook_context" : input.source === "session_file" ? "session_fallback" : "branch_inferred", attributionConfidence: exact ? 1 : input.source === "session_file" ? .8 : .6
  };
  return { ...(await store.ingestEvent(event)), event };
}

type OtelValue = { stringValue?: string; intValue?: string | number; doubleValue?: number; boolValue?: boolean };
type OtelAttribute = { key: string; value?: OtelValue };
const value = (attribute?: OtelAttribute) => { const v=attribute?.value; return v?.stringValue ?? v?.intValue ?? v?.doubleValue ?? v?.boolValue; };
const numberAttr = (attrs: OtelAttribute[], keys: string[]) => { for (const key of keys) { const result=value(attrs.find((attr)=>attr.key===key)); if(result !== undefined && Number.isFinite(Number(result))) return Number(result); } return 0; };
const stringAttr = (attrs: OtelAttribute[], keys: string[]) => { for (const key of keys) { const result=value(attrs.find((attr)=>attr.key===key)); if(typeof result === "string" && result) return result; } return undefined; };

/** Normalizes OTLP/HTTP JSON logs. Unknown events are ignored rather than guessed. */
export function normalizeOtlpLogs(payload: unknown): UsageInput[] {
  const root = payload as { resourceLogs?: Array<{ scopeLogs?: Array<{ logRecords?: Array<{ timeUnixNano?: string; attributes?: OtelAttribute[]; traceId?: string; body?: { stringValue?: string } }> }> }> };
  const records = root.resourceLogs?.flatMap((resource)=>resource.scopeLogs?.flatMap((scope)=>scope.logRecords ?? []) ?? []) ?? [];
  return records.flatMap((record) => {
    const attrs=record.attributes ?? []; let body: Record<string, unknown>={}; try { body=record.body?.stringValue ? JSON.parse(record.body.stringValue) : {}; } catch { /* body remains intentionally unused */ }
    const inputTokens=numberAttr(attrs,["input_tokens","gen_ai.usage.input_tokens","response.input_tokens"]) || Number(body.input_tokens ?? 0);
    const outputTokens=numberAttr(attrs,["output_tokens","gen_ai.usage.output_tokens","response.output_tokens"]) || Number(body.output_tokens ?? 0);
    const cachedInputTokens=numberAttr(attrs,["cached_input_tokens","gen_ai.usage.cached_input_tokens","response.cached_input_tokens"]) || Number(body.cached_input_tokens ?? 0);
    const model=stringAttr(attrs,["model","gen_ai.request.model","response.model"]) ?? (typeof body.model === "string" ? body.model : undefined);
    if (!model || (!inputTokens && !outputTokens)) return [];
    const nanos=record.timeUnixNano ? Number(record.timeUnixNano) : Date.now();
    return [{ source:"otel", sessionId:stringAttr(attrs,["conversation_id","session_id","codex.conversation_id"]) ?? record.traceId, model, inputTokens, outputTokens, cachedInputTokens, occurredAt:new Date(nanos / 1_000_000).toISOString() } satisfies UsageInput];
  });
}
