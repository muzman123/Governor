import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { Pool } from "pg";
import { DEFAULT_MODEL_RATES } from "../lib/pricing";
import { buildReceipt } from "../lib/receipts";
import type { UsageEvent } from "../lib/types";

async function main() {
  if(!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for db:init");
  const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes("localhost")?undefined:{rejectUnauthorized:false}});
  await pool.query(await fs.readFile(path.join(process.cwd(),"db","schema.sql"),"utf8"));
  for(const rate of DEFAULT_MODEL_RATES) await pool.query("INSERT INTO model_rates(model,effective_from,input_per_mtok,output_per_mtok,cached_input_per_mtok) VALUES($1,$2,$3,$4,$5) ON CONFLICT(model,effective_from) DO UPDATE SET input_per_mtok=EXCLUDED.input_per_mtok,output_per_mtok=EXCLUDED.output_per_mtok,cached_input_per_mtok=EXCLUDED.cached_input_per_mtok",[rate.model,rate.effectiveFrom,rate.inputPerMTok,rate.outputPerMTok,rate.cachedInputPerMTok]);
  await pool.query("INSERT INTO repositories(id,slug,default_branch) VALUES('repo_demo','acme/checkout','main') ON CONFLICT(slug) DO NOTHING");
  await pool.query("INSERT INTO developers(id,github_login,token_hash) VALUES('dev_demo','demo',$1) ON CONFLICT(id) DO NOTHING",[crypto.createHash("sha256").update("demo-token").digest("hex")]);
  const now=Date.now(); const events: UsageEvent[]=[
    {id:"evt_demo_1",eventKey:"demo-1",source:"otel",repositoryId:"repo_demo",developerId:"dev_demo",branch:"fix/cart-race",headSha:"4b46ac",model:"gpt-5.6",inputTokens:1_080_000,outputTokens:44_000,cachedInputTokens:720_000,occurredAt:new Date(now-2*86400000).toISOString(),costUsd:1.62,rateEffectiveFrom:"2026-01-01",attributionMethod:"hook_context",attributionConfidence:1},
    {id:"evt_demo_2",eventKey:"demo-2",source:"otel",repositoryId:"repo_demo",developerId:"dev_demo",branch:"fix/cart-race",headSha:"4b46ac",model:"gpt-5.6-mini",inputTokens:300_000,outputTokens:20_000,cachedInputTokens:180_000,occurredAt:new Date(now-2*86400000+5000).toISOString(),costUsd:.088,rateEffectiveFrom:"2026-01-01",attributionMethod:"hook_context",attributionConfidence:1}
  ];
  for(const event of events) await pool.query("INSERT INTO usage_events(id,event_key,source,repository_id,developer_id,branch,head_sha,model,input_tokens,output_tokens,cached_input_tokens,occurred_at,cost_usd,rate_effective_from,attribution_method,attribution_confidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT(event_key) DO NOTHING",[event.id,event.eventKey,event.source,event.repositoryId,event.developerId,event.branch,event.headSha,event.model,event.inputTokens,event.outputTokens,event.cachedInputTokens,event.occurredAt,event.costUsd,event.rateEffectiveFrom,event.attributionMethod,event.attributionConfidence]);
  const receipt=buildReceipt(events,{repositoryId:"repo_demo",prNumber:412,title:"Prevent cart race conditions",headSha:"4b46ac"}); await pool.query("INSERT INTO pull_requests(repository_id,number,branch,head_sha,title,state,updated_at) VALUES('repo_demo',412,'fix/cart-race','4b46ac','Prevent cart race conditions','open',NOW()) ON CONFLICT(repository_id,number) DO NOTHING"); await pool.query("INSERT INTO receipts(repository_id,pr_number,receipt) VALUES('repo_demo',412,$1::jsonb) ON CONFLICT(repository_id,pr_number) DO NOTHING",[JSON.stringify(receipt)]);
  await pool.end(); console.log("Governor PostgreSQL schema, rates, and demo repository initialized.");
}
void main();
