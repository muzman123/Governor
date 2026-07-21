import crypto from "node:crypto";
import { z } from "zod";
import { estimateCost, resolveRate } from "./pricing";
import type { GovernorStore } from "./store";
import type { AgentToken, UsageEvent, UsageSource } from "./types";

export const ContextSchema = z.object({ sessionId:z.string().min(1), repositorySlug:z.string().regex(/^[^/]+\/[^/]+$/), branch:z.string().min(1), headSha:z.string().min(4), observedAt:z.string().datetime().optional(), phase:z.enum(["turn_start","post_tool","turn_end"]).optional() });
export const SessionFinalizeSchema = z.object({ sessionId:z.string().min(1), branch:z.string().min(1), headSha:z.string().min(4), observedAt:z.string().datetime().optional() });
export const UsageSchema = z.object({ eventKey:z.string().min(1).optional(), source:z.enum(["otel","session_file","manual"]).default("manual"), sessionId:z.string().min(1).optional(), repositorySlug:z.string().regex(/^[^/]+\/[^/]+$/).optional(), branch:z.string().optional(), headSha:z.string().optional(), model:z.string().min(1), inputTokens:z.coerce.number().int().nonnegative(), outputTokens:z.coerce.number().int().nonnegative(), cachedInputTokens:z.coerce.number().int().nonnegative().default(0), occurredAt:z.string().datetime().optional() });
export type UsageInput = z.infer<typeof UsageSchema>;

/** A direct Actions event is repository-scoped by its own agent credential, never a developer token. */
export const AgentUsageSchema = z.object({
  eventKey:z.string().min(1).optional(), sessionId:z.string().min(1).optional(), repositorySlug:z.string().regex(/^[^/]+\/[^/]+$/), branch:z.string().min(1), headSha:z.string().min(4),
  model:z.string().min(1), inputTokens:z.coerce.number().int().nonnegative(), outputTokens:z.coerce.number().int().nonnegative(), cachedInputTokens:z.coerce.number().int().nonnegative().default(0), occurredAt:z.string().datetime().optional(),
  workflowRunId:z.string().min(1).max(160), workflowRunUrl:z.string().url().refine((url)=>url.startsWith("https://"),"workflowRunUrl must use HTTPS"), workflowName:z.string().min(1).max(200), actorName:z.string().min(1).max(200).optional()
});
export type AgentUsageInput = z.infer<typeof AgentUsageSchema>;
export const AgentFinalizeSchema=z.object({repositorySlug:z.string().regex(/^[^/]+\/[^/]+$/),branch:z.string().min(1)});

export async function ingestUsage(store: GovernorStore, developerId: string, input: UsageInput): Promise<{ inserted: boolean; event?: UsageEvent; pending?: boolean }> {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const context = input.sessionId ? await store.getContext(input.sessionId,occurredAt) : undefined;
  const repositorySlug = context?.repositorySlug ?? input.repositorySlug;
  const repository = repositorySlug ? await store.getRepositoryBySlug(repositorySlug) : undefined;
  if (repositorySlug && !repository) throw new Error(`Governor is not installed for repository ${repositorySlug}`);
  if (!repository && !input.sessionId) throw new Error("Usage event needs a session context or repositorySlug");
  const rate = resolveRate(input.model, occurredAt, await store.getRates());
  const exact = Boolean(context && context.developerId === developerId);
  const developer=await store.getDeveloperById(developerId);
  const event: UsageEvent = {
    id: crypto.randomUUID(), eventKey: input.eventKey ?? crypto.createHash("sha256").update(JSON.stringify([input.sessionId,input.model,input.inputTokens,input.outputTokens,input.cachedInputTokens,occurredAt])).digest("hex"), source: input.source as UsageSource,
    sessionId: input.sessionId, repositoryId: repository?.id, developerId, actorType:"developer", actorName:developer?.githubLogin, branch: context?.branch ?? input.branch, headSha: context?.headSha ?? input.headSha, model: input.model,
    inputTokens: input.inputTokens, outputTokens: input.outputTokens, cachedInputTokens: input.cachedInputTokens, occurredAt, costUsd: estimateCost(input, rate), rateEffectiveFrom:rate.effectiveFrom,
    attributionMethod: exact ? "hook_context" : input.source === "session_file" ? "session_fallback" : "branch_inferred", attributionConfidence: exact ? 1 : input.source === "session_file" ? .8 : repository ? .6 : 0
  };
  return { ...(await store.ingestEvent(event)), event, pending:!repository };
}

export async function ingestAgentUsage(store: GovernorStore, agent: AgentToken, input: AgentUsageInput): Promise<{ inserted: boolean; event: UsageEvent }> {
  const repository=await store.getRepositoryBySlug(input.repositorySlug);
  if(!repository || repository.id!==agent.repositoryId) throw new Error("Agent token is not authorized for this repository");
  const occurredAt=input.occurredAt ?? new Date().toISOString(); const rate=resolveRate(input.model,occurredAt,await store.getRates());
  const event:UsageEvent={
    id:crypto.randomUUID(),eventKey:input.eventKey ?? crypto.createHash("sha256").update(JSON.stringify([agent.id,input.workflowRunId,input.sessionId,input.model,input.inputTokens,input.outputTokens,input.cachedInputTokens,occurredAt])).digest("hex"),source:"github_actions",sessionId:input.sessionId,repositoryId:repository.id,
    actorType:"agent",actorName:input.workflowName || agent.label,workflowRunId:input.workflowRunId,workflowRunUrl:input.workflowRunUrl,workflowName:input.workflowName,branch:input.branch,headSha:input.headSha,model:input.model,inputTokens:input.inputTokens,outputTokens:input.outputTokens,cachedInputTokens:input.cachedInputTokens,occurredAt,costUsd:estimateCost(input,rate),rateEffectiveFrom:rate.effectiveFrom,attributionMethod:"github_actions",attributionConfidence:1
  };
  const result=await store.ingestEvent(event); if(result.inserted) await store.markAgentTokenUsed(agent.id); return { ...result,event };
}

type OtelValue = { stringValue?: string; intValue?: string | number; doubleValue?: number; boolValue?: boolean; kvlistValue?: { values?: Array<{ key: string; value?: OtelValue }> } };
type OtelAttribute = { key: string; value?: OtelValue };
const value = (attribute?: OtelAttribute) => { const v=attribute?.value; return v?.stringValue ?? v?.intValue ?? v?.doubleValue ?? v?.boolValue; };
const numberAttr = (attrs: OtelAttribute[], keys: string[]) => { for (const key of keys) { const result=value(attrs.find((attr)=>attr.key===key)); if(result !== undefined && Number.isFinite(Number(result))) return Number(result); } return 0; };
const stringAttr = (attrs: OtelAttribute[], keys: string[]) => { for (const key of keys) { const result=value(attrs.find((attr)=>attr.key===key)); if(typeof result === "string" && result) return result; } return undefined; };
const bodyObject = (body: OtelValue | undefined): Record<string, unknown> => {
  if (typeof body?.stringValue === "string") {
    try { const parsed=JSON.parse(body.stringValue); return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}; } catch { return {}; }
  }
  return Object.fromEntries((body?.kvlistValue?.values ?? []).map((entry)=>[entry.key, value({key:entry.key,value:entry.value})]));
};
const timestamp = (raw: string | undefined) => {
  const value=raw ? Number(raw) : NaN;
  if (!Number.isFinite(value)) return new Date().toISOString();
  // OTLP specifies nanoseconds, but accept common seconds/milliseconds/
  // microseconds variants so a malformed exporter cannot turn a 2026 event into 1970.
  const milliseconds=value>=1e18 ? value/1_000_000 : value>=1e15 ? value/1_000 : value>=1e12 ? value : value>=1e9 ? value*1_000 : NaN;
  return Number.isFinite(milliseconds) && !Number.isNaN(new Date(milliseconds).valueOf()) ? new Date(milliseconds).toISOString() : new Date().toISOString();
};

/** Normalizes OTLP/HTTP JSON logs. Unknown events are ignored rather than guessed. */
export function normalizeOtlpLogs(payload: unknown): UsageInput[] {
  const root = payload as { resourceLogs?: Array<{ resource?: { attributes?: OtelAttribute[] }; scopeLogs?: Array<{ logRecords?: Array<{ timeUnixNano?: string; observedTimeUnixNano?: string; attributes?: OtelAttribute[]; traceId?: string; body?: OtelValue }> }> }> };
  const records = root.resourceLogs?.flatMap((resource)=>resource.scopeLogs?.flatMap((scope)=>(scope.logRecords ?? []).map((record)=>({resource,record}))) ?? []) ?? [];
  return records.flatMap(({resource,record}) => {
    const attrs=[...(resource.resource?.attributes ?? []),...(record.attributes ?? [])]; const body=bodyObject(record.body);
    // Codex's current OTLP log events use *_token_count and conversation.id.
    const inputTokens=numberAttr(attrs,["input_token_count","input_tokens","gen_ai.usage.input_tokens","response.input_tokens"]) || Number(body.input_token_count ?? body.input_tokens ?? 0);
    const outputTokens=numberAttr(attrs,["output_token_count","output_tokens","gen_ai.usage.output_tokens","response.output_tokens"]) || Number(body.output_token_count ?? body.output_tokens ?? 0);
    const cachedInputTokens=numberAttr(attrs,["cached_token_count","cached_input_tokens","gen_ai.usage.cached_input_tokens","response.cached_input_tokens"]) || Number(body.cached_token_count ?? body.cached_input_tokens ?? 0);
    const model=stringAttr(attrs,["model","gen_ai.request.model","response.model"]) ?? (typeof body.model === "string" ? body.model : undefined);
    if (!model || (!inputTokens && !outputTokens)) return [];
    return [{ source:"otel", sessionId:stringAttr(attrs,["conversation.id","conversation_id","session_id","codex.conversation_id"]) ?? record.traceId, model, inputTokens, outputTokens, cachedInputTokens, occurredAt:timestamp(record.timeUnixNano ?? record.observedTimeUnixNano) } satisfies UsageInput];
  });
}
