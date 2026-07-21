import crypto from "node:crypto";
import { Pool } from "pg";
import type { AgentToken, Dashboard, Developer, ModelRate, OutcomeMetrics, PullRequest, Receipt, Repository, SessionContext, UsageEvent, VerificationSession } from "./types";
import { DEFAULT_MODEL_RATES } from "./pricing";

export interface GovernorStore {
  getRepositoryBySlug(slug: string): Promise<Repository | undefined>;
  listRepositories(): Promise<Repository[]>;
  upsertRepository(repo: Repository): Promise<Repository>;
  getDeveloperByToken(token: string): Promise<Developer | undefined>;
  getDeveloperById(id: string): Promise<Developer | undefined>;
  getDeveloperByGithubLogin(githubLogin: string): Promise<Developer | undefined>;
  createDeveloper(input: Omit<Developer, "id" | "tokenHash"> & { token: string }): Promise<Developer>;
  rotateDeveloperToken(id: string, token: string): Promise<void>;
  issueAgentToken(input: { repositoryId: string; label: string; createdByDeveloperId: string; token: string }): Promise<AgentToken>;
  getAgentTokenByToken(token: string): Promise<AgentToken | undefined>;
  hasActiveAgentToken(repositoryId: string): Promise<boolean>;
  markAgentTokenUsed(id: string): Promise<void>;
  saveContext(context: SessionContext): Promise<void>;
  attachPendingEvents(context: SessionContext, repositoryId: string, allowEarlier?: boolean): Promise<number>;
  getContext(sessionId: string, occurredAt?: string): Promise<SessionContext | undefined>;
  getVerificationSessions(developerId: string, after: string): Promise<VerificationSession[]>;
  getRates(): Promise<ModelRate[]>;
  ingestEvent(event: UsageEvent): Promise<{ inserted: boolean }>;
  getEvents(repositoryId: string, options?: { branch?: string; from?: string; to?: string }): Promise<UsageEvent[]>;
  upsertPullRequest(pr: PullRequest): Promise<PullRequest>;
  getPullRequest(repositoryId: string, number: number): Promise<PullRequest | undefined>;
  getPullRequestsByBranch(repositoryId: string, branch: string): Promise<PullRequest[]>;
  saveReceipt(receipt: Receipt): Promise<void>;
  getReceipt(repositoryId: string, number: number): Promise<Receipt | undefined>;
  getDashboard(repositoryId: string): Promise<Dashboard>;
}

const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const round = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
const emptyOutcomes = (): OutcomeMetrics => ({ openCount:0, mergedCount:0, closedUnmergedCount:0, mergedCost:0, closedUnmergedCost:0 });

function outcomeMetrics(receipts: Receipt[]): OutcomeMetrics {
  const outcomes=emptyOutcomes();
  for(const receipt of receipts) {
    if(receipt.outcome === "merged") { outcomes.mergedCount++; outcomes.mergedCost+=receipt.totalCost; }
    else if(receipt.outcome === "closed_unmerged") { outcomes.closedUnmergedCount++; outcomes.closedUnmergedCost+=receipt.totalCost; }
    else outcomes.openCount++;
  }
  outcomes.mergedCost=round(outcomes.mergedCost); outcomes.closedUnmergedCost=round(outcomes.closedUnmergedCost);
  if(outcomes.mergedCount) outcomes.costPerMergedPr=round(outcomes.mergedCost/outcomes.mergedCount);
  return outcomes;
}

function dashboardFor(repo: Repository, events: UsageEvent[], receipts: Receipt[]): Dashboard {
  const now=Date.now();
  const total=(days:number, actorType?:UsageEvent["actorType"])=>round(events.filter((event)=>Date.parse(event.occurredAt)>=now-days*86_400_000 && (!actorType || event.actorType===actorType)).reduce((sum,event)=>sum+event.costUsd,0));
  return {repo,metrics:{spend7d:total(7),spend30d:total(30),agentSpend7d:total(7,"agent"),agentSpend30d:total(30,"agent"),prCount:receipts.length,avgConfidence:receipts.reduce((sum,receipt)=>sum+receipt.confidence,0)/(receipts.length||1),outcomes:outcomeMetrics(receipts)},receipts:receipts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
}

function receiptWithCurrentOutcome(receipt: Receipt, pr?: PullRequest): Receipt {
  return {...receipt,actors:receipt.actors ?? [],outcome:receipt.outcome ?? pr?.outcome,outcomeAt:receipt.outcomeAt ?? pr?.mergedAt ?? pr?.closedAt};
}

export class MemoryGovernorStore implements GovernorStore {
  private repos = new Map<string, Repository>();
  private developers = new Map<string, Developer>();
  private agentTokens = new Map<string, AgentToken>();
  private contexts = new Map<string, SessionContext>();
  private contextHistory = new Map<string, SessionContext[]>();
  private events = new Map<string, UsageEvent>();
  private prs = new Map<string, PullRequest>();
  private receipts = new Map<string, Receipt>();
  constructor(private rates: ModelRate[] = DEFAULT_MODEL_RATES) { this.seed(); }
  private key(repoId: string, number: number) { return `${repoId}:${number}`; }
  private seed() {
    const repo = { id: "repo_demo", slug: "acme/checkout", defaultBranch: "main" }; this.repos.set(repo.id, repo);
    const now = Date.now();
    const data: UsageEvent[] = [
      { id:"evt_1", eventKey:"demo-1", source:"otel", repositoryId:repo.id, developerId:"demo", actorType:"developer", actorName:"maya", branch:"fix/cart-race", headSha:"4b46ac", model:"gpt-5.6", inputTokens:1_080_000, outputTokens:44_000, cachedInputTokens:720_000, occurredAt:new Date(now-2*86400000).toISOString(), costUsd:1.62, rateEffectiveFrom:"2026-01-01", attributionMethod:"hook_context", attributionConfidence:1 },
      { id:"evt_2", eventKey:"demo-2", source:"github_actions", repositoryId:repo.id, actorType:"agent", actorName:"Codex PR review", workflowName:"Codex pull request review", workflowRunId:"1042", workflowRunUrl:"https://github.com/acme/checkout/actions/runs/1042", branch:"fix/cart-race", headSha:"4b46ac", model:"gpt-5.6-mini", inputTokens:300_000, outputTokens:20_000, cachedInputTokens:180_000, occurredAt:new Date(now-2*86400000+5000).toISOString(), costUsd:0.088, rateEffectiveFrom:"2026-01-01", attributionMethod:"github_actions", attributionConfidence:1 },
      { id:"evt_3", eventKey:"demo-3", source:"session_file", repositoryId:repo.id, developerId:"demo", actorType:"developer", actorName:"maya", branch:"refactor/taxes", headSha:"06bc9a", model:"gpt-5.6", inputTokens:680_000, outputTokens:34_000, cachedInputTokens:210_000, occurredAt:new Date(now-6*86400000).toISOString(), costUsd:1.72, rateEffectiveFrom:"2026-01-01", attributionMethod:"session_fallback", attributionConfidence:.8 }
    ];
    data.forEach((event) => this.events.set(event.eventKey, event));
    const pr1:PullRequest = { id:"pr_412", repositoryId:repo.id, number:412, branch:"fix/cart-race", headSha:"4b46ac", title:"Prevent cart race conditions", state:"closed", outcome:"merged", mergedAt:new Date(now-86400000).toISOString(), closedAt:new Date(now-86400000).toISOString(), updatedAt:new Date().toISOString() };
    const pr2:PullRequest = { id:"pr_408", repositoryId:repo.id, number:408, branch:"refactor/taxes", headSha:"06bc9a", title:"Simplify tax quote pipeline", state:"closed", outcome:"closed_unmerged", closedAt:new Date(now-5*86400000).toISOString(), updatedAt:new Date().toISOString() };
    this.prs.set(this.key(repo.id, 412),pr1); this.prs.set(this.key(repo.id,408),pr2);
  }
  async getRepositoryBySlug(slug: string) { return [...this.repos.values()].find((repo) => repo.slug === slug); }
  async listRepositories() { return [...this.repos.values()]; }
  async upsertRepository(repo: Repository) { this.repos.set(repo.id, repo); return repo; }
  async getDeveloperByToken(token: string) { return [...this.developers.values()].find((developer) => developer.tokenHash === hash(token)); }
  async getDeveloperById(id: string) { return this.developers.get(id); }
  async getDeveloperByGithubLogin(githubLogin: string) { return [...this.developers.values()].find((developer) => developer.githubLogin.toLowerCase()===githubLogin.toLowerCase()); }
  async createDeveloper(input: Omit<Developer, "id" | "tokenHash"> & { token: string }) { const developer={id:crypto.randomUUID(),githubLogin:input.githubLogin,email:input.email,tokenHash:hash(input.token)}; this.developers.set(developer.id,developer); return developer; }
  async rotateDeveloperToken(id: string, token: string) { const developer=this.developers.get(id); if(!developer) throw new Error("Developer not found"); developer.tokenHash=hash(token); }
  async issueAgentToken(input: { repositoryId: string; label: string; createdByDeveloperId: string; token: string }) { const now=new Date().toISOString(); for(const existing of this.agentTokens.values()) if(existing.repositoryId===input.repositoryId && !existing.revokedAt) existing.revokedAt=now; const agent={id:crypto.randomUUID(),repositoryId:input.repositoryId,label:input.label,createdByDeveloperId:input.createdByDeveloperId,tokenHash:hash(input.token),createdAt:now}; this.agentTokens.set(agent.id,agent); return agent; }
  async getAgentTokenByToken(token: string) { return [...this.agentTokens.values()].find((agent)=>agent.tokenHash===hash(token) && !agent.revokedAt); }
  async hasActiveAgentToken(repositoryId: string) { return [...this.agentTokens.values()].some((agent)=>agent.repositoryId===repositoryId && !agent.revokedAt); }
  async markAgentTokenUsed(id: string) { const token=this.agentTokens.get(id); if(token) token.lastUsedAt=new Date().toISOString(); }
  async saveContext(context: SessionContext) {
    this.contexts.set(context.sessionId, context);
    const history=this.contextHistory.get(context.sessionId) ?? [];
    const existing=history.findIndex((entry)=>entry.observedAt===context.observedAt);
    if(existing>=0) history[existing]=context; else history.push(context);
    history.sort((a,b)=>a.observedAt.localeCompare(b.observedAt)); this.contextHistory.set(context.sessionId,history);
  }
  async attachPendingEvents(context: SessionContext, repositoryId: string, allowEarlier=false) {
    let attached=0;
    for (const event of this.events.values()) {
      if (event.sessionId!==context.sessionId || event.developerId!==context.developerId || event.repositoryId || (!allowEarlier && event.occurredAt<context.observedAt)) continue;
      event.repositoryId=repositoryId; event.branch=context.branch; event.headSha=context.headSha; event.attributionMethod="hook_context"; event.attributionConfidence=1; attached++;
    }
    return attached;
  }
  async getContext(sessionId: string, occurredAt?: string) {
    if(!occurredAt) return this.contexts.get(sessionId);
    return [...(this.contextHistory.get(sessionId) ?? [])].reverse().find((context)=>context.observedAt<=occurredAt);
  }
  async getVerificationSessions(developerId: string, after: string) {
    return [...this.contexts.values()].filter((context) => context.developerId === developerId && context.observedAt >= after).map((context) => ({ ...context, eventCount:[...this.events.values()].filter((event) => event.developerId === developerId && event.sessionId === context.sessionId && event.repositoryId).length })).sort((a,b) => b.observedAt.localeCompare(a.observedAt));
  }
  async getRates() { return this.rates; }
  async ingestEvent(event: UsageEvent) { if (this.events.has(event.eventKey)) return { inserted:false }; this.events.set(event.eventKey,event); return { inserted:true }; }
  async getEvents(repositoryId: string, options: { branch?: string; from?: string; to?: string } = {}) { return [...this.events.values()].filter((event)=>event.repositoryId===repositoryId && (!options.branch || event.branch===options.branch) && (!options.from || event.occurredAt>=options.from) && (!options.to || event.occurredAt<=options.to)); }
  async upsertPullRequest(pr: PullRequest) { this.prs.set(this.key(pr.repositoryId,pr.number),pr); return pr; }
  async getPullRequest(repositoryId: string, number: number) { return this.prs.get(this.key(repositoryId,number)); }
  async getPullRequestsByBranch(repositoryId: string, branch: string) { return [...this.prs.values()].filter((pr)=>pr.repositoryId===repositoryId && pr.branch===branch); }
  async saveReceipt(receipt: Receipt) { this.receipts.set(this.key(receipt.repositoryId,receipt.prNumber),receipt); }
  async getReceipt(repositoryId: string, number: number) { const receipt=this.receipts.get(this.key(repositoryId,number)); return receipt?receiptWithCurrentOutcome(receipt,await this.getPullRequest(repositoryId,number)):undefined; }
  async getDashboard(repositoryId: string) {
    const repo=[...this.repos.values()].find((candidate)=>candidate.id===repositoryId); if(!repo) throw new Error("Repository not found"); const events=await this.getEvents(repositoryId); const receipts=[...this.receipts.values()].filter((receipt)=>receipt.repositoryId===repositoryId);
    if(!receipts.length){ for(const pr of [...this.prs.values()].filter((candidate)=>candidate.repositoryId===repositoryId)){ const { buildReceipt } = await import("./receipts"); const receipt=buildReceipt(await this.getEvents(repositoryId,{branch:pr.branch}),{repositoryId,prNumber:pr.number,title:pr.title,headSha:pr.headSha,outcome:pr.outcome,outcomeAt:pr.mergedAt ?? pr.closedAt}); this.receipts.set(this.key(repositoryId,pr.number),receipt); receipts.push(receipt); } }
    const enriched=await Promise.all(receipts.map(async(receipt)=>receiptWithCurrentOutcome(receipt,await this.getPullRequest(repositoryId,receipt.prNumber))));
    return dashboardFor(repo,events,enriched);
  }
}

/** PostgreSQL adapter used whenever DATABASE_URL is configured. Run db/schema.sql before first use. */
export class PostgresGovernorStore implements GovernorStore {
  private pool: Pool;
  constructor(url: string) { this.pool = new Pool({ connectionString:url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized:false } }); }
  async getRepositoryBySlug(slug: string) { const r=await this.pool.query("SELECT id,slug,installation_id AS \"installationId\",default_branch AS \"defaultBranch\" FROM repositories WHERE slug=$1",[slug]); return r.rows[0] as Repository | undefined; }
  async listRepositories() { const r=await this.pool.query("SELECT id,slug,installation_id AS \"installationId\",default_branch AS \"defaultBranch\" FROM repositories ORDER BY slug"); return r.rows as Repository[]; }
  async upsertRepository(repo: Repository) { const r=await this.pool.query("INSERT INTO repositories(id,slug,installation_id,default_branch) VALUES($1,$2,$3,$4) ON CONFLICT(slug) DO UPDATE SET installation_id=EXCLUDED.installation_id,default_branch=EXCLUDED.default_branch RETURNING id,slug,installation_id AS \"installationId\",default_branch AS \"defaultBranch\"",[repo.id,repo.slug,repo.installationId ?? null,repo.defaultBranch]); return r.rows[0] as Repository; }
  async getDeveloperByToken(token: string) { const r=await this.pool.query("SELECT id,github_login AS \"githubLogin\",email,token_hash AS \"tokenHash\" FROM developers WHERE token_hash=$1",[hash(token)]); return r.rows[0] as Developer | undefined; }
  async getDeveloperById(id: string) { const r=await this.pool.query("SELECT id,github_login AS \"githubLogin\",email,token_hash AS \"tokenHash\" FROM developers WHERE id=$1",[id]); return r.rows[0] as Developer | undefined; }
  async getDeveloperByGithubLogin(githubLogin: string) { const r=await this.pool.query("SELECT id,github_login AS \"githubLogin\",email,token_hash AS \"tokenHash\" FROM developers WHERE LOWER(github_login)=LOWER($1)",[githubLogin]); return r.rows[0] as Developer | undefined; }
  async createDeveloper(input: Omit<Developer,"id"|"tokenHash"> & {token:string}) { const developer={id:crypto.randomUUID(),githubLogin:input.githubLogin,email:input.email,tokenHash:hash(input.token)}; const r=await this.pool.query("INSERT INTO developers(id,github_login,email,token_hash) VALUES($1,$2,$3,$4) RETURNING id,github_login AS \"githubLogin\",email,token_hash AS \"tokenHash\"",[developer.id,developer.githubLogin,developer.email ?? null,developer.tokenHash]); return r.rows[0] as Developer; }
  async rotateDeveloperToken(id: string, token: string) { await this.pool.query("UPDATE developers SET token_hash=$2 WHERE id=$1",[id,hash(token)]); }
  async issueAgentToken(input: { repositoryId: string; label: string; createdByDeveloperId: string; token: string }) { const createdAt=new Date().toISOString(); await this.pool.query("UPDATE agent_tokens SET revoked_at=NOW() WHERE repository_id=$1 AND revoked_at IS NULL",[input.repositoryId]); const agent={id:crypto.randomUUID(),repositoryId:input.repositoryId,label:input.label,createdByDeveloperId:input.createdByDeveloperId,tokenHash:hash(input.token),createdAt}; await this.pool.query("INSERT INTO agent_tokens(id,repository_id,label,token_hash,created_by_developer_id,created_at) VALUES($1,$2,$3,$4,$5,$6)",[agent.id,agent.repositoryId,agent.label,agent.tokenHash,agent.createdByDeveloperId,agent.createdAt]); return agent; }
  async getAgentTokenByToken(token: string) { const r=await this.pool.query("SELECT id,repository_id AS \"repositoryId\",label,token_hash AS \"tokenHash\",created_by_developer_id AS \"createdByDeveloperId\",created_at::text AS \"createdAt\",revoked_at::text AS \"revokedAt\",last_used_at::text AS \"lastUsedAt\" FROM agent_tokens WHERE token_hash=$1 AND revoked_at IS NULL",[hash(token)]); return r.rows[0] as AgentToken | undefined; }
  async hasActiveAgentToken(repositoryId: string) { const r=await this.pool.query("SELECT 1 FROM agent_tokens WHERE repository_id=$1 AND revoked_at IS NULL LIMIT 1",[repositoryId]); return Boolean(r.rows[0]); }
  async markAgentTokenUsed(id: string) { await this.pool.query("UPDATE agent_tokens SET last_used_at=NOW() WHERE id=$1 AND revoked_at IS NULL",[id]); }
  async saveContext(context: SessionContext) {
    const values=[context.sessionId,context.repositorySlug,context.branch,context.headSha,context.developerId,context.observedAt];
    await this.pool.query("INSERT INTO session_context_history(session_id,repository_slug,branch,head_sha,developer_id,observed_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(session_id,observed_at) DO UPDATE SET repository_slug=EXCLUDED.repository_slug,branch=EXCLUDED.branch,head_sha=EXCLUDED.head_sha,developer_id=EXCLUDED.developer_id",values);
    await this.pool.query("INSERT INTO session_contexts(session_id,repository_slug,branch,head_sha,developer_id,observed_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(session_id) DO UPDATE SET repository_slug=EXCLUDED.repository_slug,branch=EXCLUDED.branch,head_sha=EXCLUDED.head_sha,developer_id=EXCLUDED.developer_id,observed_at=EXCLUDED.observed_at",values);
  }
  async attachPendingEvents(context: SessionContext, repositoryId: string, allowEarlier=false) { const values=[context.sessionId,context.developerId,repositoryId,context.branch,context.headSha]; if(!allowEarlier) values.push(context.observedAt); const r=await this.pool.query(`UPDATE usage_events SET repository_id=$3,branch=$4,head_sha=$5,attribution_method='hook_context',attribution_confidence=1 WHERE session_id=$1 AND developer_id=$2 AND repository_id IS NULL${allowEarlier ? "" : " AND occurred_at >= $6"}`,values); return r.rowCount ?? 0; }
  async getContext(sessionId: string, occurredAt?: string) {
    const query=occurredAt ? "SELECT session_id AS \"sessionId\",repository_slug AS \"repositorySlug\",branch,head_sha AS \"headSha\",developer_id AS \"developerId\",observed_at::text AS \"observedAt\" FROM session_context_history WHERE session_id=$1 AND observed_at <= $2 ORDER BY observed_at DESC LIMIT 1" : "SELECT session_id AS \"sessionId\",repository_slug AS \"repositorySlug\",branch,head_sha AS \"headSha\",developer_id AS \"developerId\",observed_at::text AS \"observedAt\" FROM session_contexts WHERE session_id=$1";
    const r=await this.pool.query(query,occurredAt?[sessionId,occurredAt]:[sessionId]); return r.rows[0] as SessionContext | undefined;
  }
  async getVerificationSessions(developerId: string, after: string) { const r=await this.pool.query("SELECT sc.session_id AS \"sessionId\",sc.repository_slug AS \"repositorySlug\",sc.branch,sc.head_sha AS \"headSha\",sc.observed_at::text AS \"observedAt\",COUNT(ue.id)::int AS \"eventCount\" FROM session_contexts sc LEFT JOIN usage_events ue ON ue.session_id=sc.session_id AND ue.developer_id=$1 AND ue.repository_id IS NOT NULL WHERE sc.developer_id=$1 AND sc.observed_at >= $2 GROUP BY sc.session_id,sc.repository_slug,sc.branch,sc.head_sha,sc.observed_at ORDER BY sc.observed_at DESC",[developerId,after]); return r.rows as VerificationSession[]; }
  async getRates() { const r=await this.pool.query("SELECT model,effective_from::text AS \"effectiveFrom\",input_per_mtok::float AS \"inputPerMTok\",output_per_mtok::float AS \"outputPerMTok\",cached_input_per_mtok::float AS \"cachedInputPerMTok\" FROM model_rates"); const rates=new Map(DEFAULT_MODEL_RATES.map((rate)=>[`${rate.model}:${rate.effectiveFrom}`,rate])); for(const rate of r.rows as ModelRate[]) rates.set(`${rate.model}:${rate.effectiveFrom}`,rate); return [...rates.values()]; }
  async ingestEvent(event: UsageEvent) { const r=await this.pool.query("INSERT INTO usage_events(id,event_key,source,session_id,repository_id,developer_id,actor_type,actor_name,workflow_run_id,workflow_run_url,workflow_name,branch,head_sha,model,input_tokens,output_tokens,cached_input_tokens,occurred_at,cost_usd,rate_effective_from,attribution_method,attribution_confidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) ON CONFLICT(event_key) DO NOTHING",[event.id,event.eventKey,event.source,event.sessionId ?? null,event.repositoryId ?? null,event.developerId ?? null,event.actorType,event.actorName ?? null,event.workflowRunId ?? null,event.workflowRunUrl ?? null,event.workflowName ?? null,event.branch ?? null,event.headSha ?? null,event.model,event.inputTokens,event.outputTokens,event.cachedInputTokens,event.occurredAt,event.costUsd,event.rateEffectiveFrom,event.attributionMethod,event.attributionConfidence]); return {inserted:r.rowCount===1}; }
  async getEvents(repositoryId: string, options: {branch?:string;from?:string;to?:string} = {}) { const clauses=["repository_id=$1"]; const values:unknown[]=[repositoryId]; if(options.branch){ values.push(options.branch);clauses.push(`branch=$${values.length}`); } if(options.from){values.push(options.from);clauses.push(`occurred_at >= $${values.length}`);}if(options.to){values.push(options.to);clauses.push(`occurred_at <= $${values.length}`);} const r=await this.pool.query(`SELECT id,event_key AS "eventKey",source,session_id AS "sessionId",repository_id AS "repositoryId",developer_id AS "developerId",actor_type AS "actorType",actor_name AS "actorName",workflow_run_id AS "workflowRunId",workflow_run_url AS "workflowRunUrl",workflow_name AS "workflowName",branch,head_sha AS "headSha",model,input_tokens::int AS "inputTokens",output_tokens::int AS "outputTokens",cached_input_tokens::int AS "cachedInputTokens",occurred_at::text AS "occurredAt",cost_usd::float AS "costUsd",rate_effective_from::text AS "rateEffectiveFrom",attribution_method AS "attributionMethod",attribution_confidence AS "attributionConfidence" FROM usage_events WHERE ${clauses.join(" AND ")} ORDER BY occurred_at`,values); return r.rows as UsageEvent[]; }
  async upsertPullRequest(pr: PullRequest) { const r=await this.pool.query("INSERT INTO pull_requests(repository_id,number,branch,head_sha,title,state,outcome,comment_id,merged_at,closed_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(repository_id,number) DO UPDATE SET branch=EXCLUDED.branch,head_sha=EXCLUDED.head_sha,title=EXCLUDED.title,state=EXCLUDED.state,outcome=EXCLUDED.outcome,comment_id=EXCLUDED.comment_id,merged_at=EXCLUDED.merged_at,closed_at=EXCLUDED.closed_at,updated_at=EXCLUDED.updated_at RETURNING repository_id AS \"repositoryId\",number,branch,head_sha AS \"headSha\",title,state,outcome,comment_id AS \"commentId\",merged_at::text AS \"mergedAt\",closed_at::text AS \"closedAt\",updated_at::text AS \"updatedAt\"",[pr.repositoryId,pr.number,pr.branch,pr.headSha,pr.title,pr.state,pr.outcome,pr.commentId ?? null,pr.mergedAt ?? null,pr.closedAt ?? null,pr.updatedAt]); return {...r.rows[0],id:pr.id} as PullRequest; }
  async getPullRequest(repositoryId: string,number: number) { const r=await this.pool.query("SELECT repository_id AS \"repositoryId\",number,branch,head_sha AS \"headSha\",title,state,outcome,comment_id AS \"commentId\",merged_at::text AS \"mergedAt\",closed_at::text AS \"closedAt\",updated_at::text AS \"updatedAt\" FROM pull_requests WHERE repository_id=$1 AND number=$2",[repositoryId,number]); return r.rows[0] ? {...r.rows[0],id:`pr_${repositoryId}_${number}`} as PullRequest : undefined; }
  async getPullRequestsByBranch(repositoryId: string,branch: string) { const r=await this.pool.query("SELECT repository_id AS \"repositoryId\",number,branch,head_sha AS \"headSha\",title,state,outcome,comment_id AS \"commentId\",merged_at::text AS \"mergedAt\",closed_at::text AS \"closedAt\",updated_at::text AS \"updatedAt\" FROM pull_requests WHERE repository_id=$1 AND branch=$2",[repositoryId,branch]); return r.rows.map((row)=>({...row,id:`pr_${repositoryId}_${row.number}`} as PullRequest)); }
  async saveReceipt(receipt: Receipt) { await this.pool.query("INSERT INTO receipts(repository_id,pr_number,receipt) VALUES($1,$2,$3::jsonb) ON CONFLICT(repository_id,pr_number) DO UPDATE SET receipt=EXCLUDED.receipt",[receipt.repositoryId,receipt.prNumber,JSON.stringify(receipt)]); }
  async getReceipt(repositoryId: string,number: number) { const r=await this.pool.query("SELECT receipt FROM receipts WHERE repository_id=$1 AND pr_number=$2",[repositoryId,number]); if(!r.rows[0]) return; return receiptWithCurrentOutcome(r.rows[0].receipt as Receipt,await this.getPullRequest(repositoryId,number)); }
  async getDashboard(repositoryId: string) { const result=await this.pool.query("SELECT id,slug,installation_id AS \"installationId\",default_branch AS \"defaultBranch\" FROM repositories WHERE id=$1",[repositoryId]); const repo=result.rows[0] as Repository | undefined; if(!repo) throw new Error("Repository not found"); const events=await this.getEvents(repositoryId); const raw=await this.pool.query("SELECT receipt FROM receipts WHERE repository_id=$1",[repositoryId]); const receipts=await Promise.all(raw.rows.map(async(row)=>receiptWithCurrentOutcome(row.receipt as Receipt,await this.getPullRequest(repositoryId,Number((row.receipt as Receipt).prNumber))))); return dashboardFor(repo,events,receipts); }
}

let singleton: GovernorStore | undefined;
export function getStore(): GovernorStore { if (!singleton) singleton = process.env.GOVERNOR_USE_MEMORY === "1" || !process.env.DATABASE_URL ? new MemoryGovernorStore() : new PostgresGovernorStore(process.env.DATABASE_URL); return singleton; }
