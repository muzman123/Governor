import assert from "node:assert/strict";
import test from "node:test";
import { ingestUsage, normalizeOtlpLogs } from "../lib/ingest";
import { MemoryGovernorStore } from "../lib/store";

test("hook context produces exact attribution and ingestion is idempotent",async()=>{
  const store=new MemoryGovernorStore(); const repo=await store.getRepositoryBySlug("acme/checkout"); assert.ok(repo);
  const developer=await store.createDeveloper({githubLogin:"maya",token:"test-token"});
  await store.saveContext({sessionId:"session_1",repositorySlug:repo.slug,branch:"feature/receipt",headSha:"abc1234",developerId:developer.id,observedAt:"2026-07-16T10:00:00.000Z"});
  const usage={eventKey:"event_1",source:"otel" as const,sessionId:"session_1",model:"gpt-5.6",inputTokens:1_000_000,outputTokens:0,cachedInputTokens:0,occurredAt:"2026-07-16T10:01:00.000Z"};
  const first=await ingestUsage(store,developer.id,usage); const duplicate=await ingestUsage(store,developer.id,usage);
  assert.equal(first.event?.attributionConfidence,1); assert.equal(first.event?.branch,"feature/receipt"); assert.equal(first.inserted,true); assert.equal(duplicate.inserted,false);
});

test("session file fallback remains explicitly confidence-scored",async()=>{
  const store=new MemoryGovernorStore(); const repo=await store.getRepositoryBySlug("acme/checkout"); assert.ok(repo); const developer=await store.createDeveloper({githubLogin:"maya",token:"test-token"});
  const result=await ingestUsage(store,developer.id,{eventKey:"fallback",source:"session_file",repositorySlug:repo.slug,branch:"feature/receipt",headSha:"abc1234",model:"gpt-5.6",inputTokens:1,outputTokens:1,cachedInputTokens:0,occurredAt:"2026-07-16T10:01:00.000Z"});
  assert.equal(result.event?.attributionConfidence,.8); assert.equal(result.event?.attributionMethod,"session_fallback");
});

test("normalizes current Codex OTLP token-count attributes",()=>{
  const events=normalizeOtlpLogs({resourceLogs:[{resource:{attributes:[
    {key:"conversation.id",value:{stringValue:"thread_1"}},
    {key:"model",value:{stringValue:"gpt-5.6"}},
  ]},scopeLogs:[{logRecords:[{timeUnixNano:"1784283843000000000",attributes:[
    {key:"event.name",value:{stringValue:"codex.sse_event"}},
    {key:"input_token_count",value:{intValue:"1200"}},
    {key:"output_token_count",value:{intValue:"42"}},
    {key:"cached_token_count",value:{intValue:"900"}},
  ]}]}]}]});
  assert.deepEqual(events,[{source:"otel",sessionId:"thread_1",model:"gpt-5.6",inputTokens:1200,outputTokens:42,cachedInputTokens:900,occurredAt:"2026-07-17T10:24:03.000Z"}]);
});
