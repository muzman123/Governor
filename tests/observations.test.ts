import assert from "node:assert/strict";
import test from "node:test";
import { observeReceipt } from "../lib/observations";
import type { Receipt, UsageEvent } from "../lib/types";

const receipt=(overrides:Partial<Receipt>={}):Receipt=>({repositoryId:"repo",prNumber:1,title:"Test",headSha:"abc1234",totalCost:4,eventCount:2,confidence:1,models:[{model:"gpt-5.6",inputTokens:1_000,outputTokens:20,cachedInputTokens:120,costUsd:4}],actors:[{actorType:"developer",label:"Developer-assisted",eventCount:2,costUsd:4}],workType:"unclassified",updatedAt:"2026-07-17T00:00:00.000Z",...overrides} as Receipt);
const event=(cachedInputTokens:number):UsageEvent=>({id:crypto.randomUUID(),eventKey:crypto.randomUUID(),source:"otel",repositoryId:"repo",developerId:"dev",actorType:"developer",branch:"feature",headSha:"abc1234",model:"gpt-5.6",inputTokens:1_000,outputTokens:10,cachedInputTokens,occurredAt:"2026-07-17T00:00:00.000Z",costUsd:1,rateEffectiveFrom:"2026-01-01",attributionMethod:"hook_context",attributionConfidence:1});

test("flags low cache reuse only when a meaningful repository baseline exists",()=>{
  const observation=observeReceipt(receipt(),[event(120),event(120)],Array.from({length:20},()=>event(640)),[]);
  assert.equal(observation?.category,"cache_efficiency");
  assert.match(observation?.evidence ?? "",/12%/); assert.match(observation?.evidence ?? "",/64%/);
  assert.ok((observation?.impactUsd ?? 0)>0);
});

test("does not invent an efficiency observation before enough history exists",()=>{
  assert.equal(observeReceipt(receipt(),[event(10)],[event(800)],[]),undefined);
});

test("always explains low attribution as an observation without pretending it is exact",()=>{
  const observation=observeReceipt(receipt({confidence:.8}),[],[],[]);
  assert.equal(observation?.category,"attribution_quality"); assert.match(observation?.evidence ?? "",/80%/);
});

test("flags a material cost outlier against a stable same-work-type baseline",()=>{
  const current=receipt({prNumber:99,totalCost:4,workType:"feature"}); const history=Array.from({length:5},(_,index)=>receipt({prNumber:index+2,totalCost:1,workType:"feature"})); const observation=observeReceipt(current,[event(100)],[],history);
  assert.equal(observation?.category,"cost_outlier"); assert.equal(observation?.severity,"warning"); assert.equal(observation?.comparison?.scope,"work_type"); assert.equal(observation?.comparison?.sampleSize,5); assert.equal(observation?.comparison?.deltaUsd,3);
});

test("does not call a receipt an outlier before five comparable PRs exist",()=>{
  const current=receipt({prNumber:99,totalCost:4}); const history=Array.from({length:4},(_,index)=>receipt({prNumber:index+2,totalCost:1})); assert.equal(observeReceipt(current,[event(100)],[],history),undefined);
});
