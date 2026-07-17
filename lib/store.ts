import crypto from "node:crypto";
import { Pool } from "pg";
import type { Dashboard, Developer, ModelRate, PullRequest, Receipt, Repository, SessionContext, UsageEvent, VerificationSession } from "./types";
import { DEFAULT_MODEL_RATES } from "./pricing";

export interface GovernorStore {
  getRepositoryBySlug(slug: string): Promise<Repository | undefined>;
  upsertRepository(repo: Repository): Promise<Repository>;
  getDeveloperByToken(token: string): Promise<Developer | undefined>;
  createDeveloper(input: Omit<Developer, "id" | "tokenHash"> & { token: string }): Promise<Developer>;
  saveContext(context: SessionContext): Promise<void>;
  attachPendingEvents(context: SessionContext, repositoryId: string): Promise<number>;
  getContext(sessionId: string): Promise<SessionContext | undefined>;
  getVerificationSessions(developerId: string, after: string): Promise<VerificationSession[]>;
  getRates(): Promise<ModelRate[]>;
  ingestEvent(event: UsageEvent): Promise<{ inserted: boolean }>;
  getEvents(repositoryId: string, options?: { branch?: string; from?: string; to?: string }): Promise<UsageEvent[]>;
  upsertPullRequest(pr: PullRequest): Promise<PullRequest>;
  getPullRequest(repositoryId: string, number: number): Promise<PullRequest | undefined>;
  saveReceipt(receipt: Receipt): Promise<void>;
  getReceipt(repositoryId: string, number: number): Promise<Receipt | undefined>;
  getDashboard(repositoryId: string): Promise<Dashboard>;
}

const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export class MemoryGovernorStore implements GovernorStore {
  private repos = new Map<string, Repository>();
  private developers = new Map<string, Developer>();
  private contexts = new Map<string, SessionContext>();
  private events = new Map<string, UsageEvent>();
  private prs = new Map<string, PullRequest>();
  private receipts = new Map<string, Receipt>();
  constructor(private rates: ModelRate[] = DEFAULT_MODEL_RATES) { this.seed(); }
  private key(repoId: string, number: number) { return `${repoId}:${number}`; }
  private seed() {
    const repo = { id: "repo_demo", slug: "acme/checkout", defaultBranch: "main" }; this.repos.set(repo.id, repo);
    const now = Date.now();
    const data: UsageEvent[] = [
      { id:"evt_1", eventKey:"demo-1", source:"otel", repositoryId:repo.id, developerId:"demo", branch:"fix/cart-race", headSha:"4b46ac", model:"gpt-5.6", inputTokens:1_080_000, outputTokens:44_000, cachedInputTokens:720_000, occurredAt:new Date(now-2*86400000).toISOString(), costUsd:1.62, rateEffectiveFrom:"2026-01-01", attributionMethod:"hook_context", attributionConfidence:1 },
      { id:"evt_2", eventKey:"demo-2", source:"otel", repositoryId:repo.id, developerId:"demo", branch:"fix/cart-race", headSha:"4b46ac", model:"gpt-5.6-mini", inputTokens:300_000, outputTokens:20_000, cachedInputTokens:180_000, occurredAt:new Date(now-2*86400000+5000).toISOString(), costUsd:0.088, rateEffectiveFrom:"2026-01-01", attributionMethod:"hook_context", attributionConfidence:1 },
      { id:"evt_3", eventKey:"demo-3", source:"session_file", repositoryId:repo.id, developerId:"demo", branch:"refactor/taxes", headSha:"06bc9a", model:"gpt-5.6", inputTokens:680_000, outputTokens:34_000, cachedInputTokens:210_000, occurredAt:new Date(now-6*86400000).toISOString(), costUsd:1.72, rateEffectiveFrom:"2026-01-01", attributionMethod:"session_fallback", attributionConfidence:.8 }
    ];
    data.forEach((event) => this.events.set(event.eventKey, event));
    const pr1 = { id:"pr_412", repositoryId:repo.id, number:412, branch:"fix/cart-race", headSha:"4b46ac", title:"Prevent cart race conditions", state:"open" as const, updatedAt:new Date().toISOString() };
    const pr2 = { id:"pr_408", repositoryId:repo.id, number:408, branch:"refactor/taxes", headSha:"06bc9a", title:"Simplify tax quote pipeline", state:"closed" as const, updatedAt:new Date().toISOString() };
    this.prs.set(this.key(repo.id, 412),pr1); this.prs.set(this.key(repo.id,408),pr2);
  }
  async getRepositoryBySlug(slug: string) { return [...this.repos.values()].find((repo) => repo.slug === slug); }
  async upsertRepository(repo: Repository) { this.repos.set(repo.id, repo); return repo; }
  async getDeveloperByToken(token: string) { return [...this.developers.values()].find((developer) => developer.tokenHash === hash(token)); }
  async createDeveloper(input: Omit<Developer, "id" | "tokenHash"> & { token: string }) { const developer={id:crypto.randomUUID(),githubLogin:input.githubLogin,email:input.email,tokenHash:hash(input.token)}; this.developers.set(developer.id,developer); return developer; }
  async saveContext(context: SessionContext) { this.contexts.set(context.sessionId, context); }
  async attachPendingEvents(context: SessionContext, repositoryId: string) {
    let attached=0;
    for (const event of this.events.values()) {
      if (event.sessionId!==context.sessionId || event.developerId!==context.developerId || event.repositoryId) continue;
      event.repositoryId=repositoryId; event.branch=context.branch; event.headSha=context.headSha; event.attributionMethod="hook_context"; event.attributionConfidence=1; attached++;
    }
    return attached;
  }
  async getContext(sessionId: string) { return this.contexts.get(sessionId); }
  async getVerificationSessions(developerId: string, after: string) {
    return [...this.contexts.values()]
      .filter((context) => context.developerId === developerId && context.observedAt >= after)
      .map((context) => ({ ...context, eventCount:[...this.events.values()].filter((event) => event.developerId === developerId && event.sessionId === context.sessionId && event.repositoryId).length }))
      .sort((a,b) => b.observedAt.localeCompare(a.observedAt));
  }
  async getRates() { return this.rates; }
  async ingestEvent(event: UsageEvent) { if (this.events.has(event.eventKey)) return { inserted:false }; this.events.set(event.eventKey,event); return { inserted:true }; }
  async getEvents(repositoryId: string, options: { branch?: string; from?: string; to?: string } = {}) { return [...this.events.values()].filter((event) => event.repositoryId===repositoryId && (!options.branch || event.branch===options.branch) && (!options.from || event.occurredAt>=options.from) && (!options.to || event.occurredAt<=options.to)); }
  async upsertPullRequest(pr: PullRequest) { this.prs.set(this.key(pr.repositoryId,pr.number),pr); return pr; }
  async getPullRequest(repositoryId: string, number: number) { return this.prs.get(this.key(repositoryId,number)); }
  async saveReceipt(receipt: Receipt) { this.receipts.set(this.key(receipt.repositoryId,receipt.prNumber),receipt); }
  async getReceipt(repositoryId: string, number: number) { return this.receipts.get(this.key(repositoryId,number)); }
  async getDashboard(repositoryId: string) { const repo=[...this.repos.values()].find((candidate)=>candidate.id===repositoryId); if(!repo) throw new Error("Repository not found"); const now=Date.now(); const events=await this.getEvents(repositoryId); const sum=(days:number)=>events.filter((event)=>Date.parse(event.occurredAt)>=now-days*86400000).reduce((total,event)=>total+event.costUsd,0); const receipts=[...this.receipts.values()].filter((receipt)=>receipt.repositoryId===repositoryId); if(!receipts.length){ for(const pr of [...this.prs.values()].filter((candidate)=>candidate.repositoryId===repositoryId)){ const { buildReceipt } = await import("./receipts"); const receipt=buildReceipt(await this.getEvents(repositoryId,{branch:pr.branch}),{repositoryId,prNumber:pr.number,title:pr.title,headSha:pr.headSha}); this.receipts.set(this.key(repositoryId,pr.number),receipt); receipts.push(receipt); } } return {repo,metrics:{spend7d:sum(7),spend30d:sum(30),prCount:receipts.length,avgConfidence:receipts.reduce((total,receipt)=>total+receipt.confidence,0)/(receipts.length||1)},receipts:receipts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}; }
}

/** PostgreSQL adapter used whenever DATABASE_URL is configured. Run db/schema.sql before first use. */
export class PostgresGovernorStore implements GovernorStore {
  private pool: Pool;
  constructor(url: string) { this.pool = new Pool({ connectionString:url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized:false } }); }
  async getRepositoryBySlug(slug: string) { const r=await this.pool.query("SELECT id, slug, installation_id AS \"installationId\", default_branch AS \"defaultBranch\" FROM repositories WHERE slug=$1",[slug]); return r.rows[0] as Repository | undefined; }
  async upsertRepository(repo: Repository) { const r=await this.pool.query("INSERT INTO repositories(id,slug,installation_id,default_branch) VALUES($1,$2,$3,$4) ON CONFLICT (slug) DO UPDATE SET installation_id=EXCLUDED.installation_id,default_branch=EXCLUDED.default_branch RETURNING id,slug,installation_id AS \"installationId\",default_branch AS \"defaultBranch\"",[repo.id,repo.slug,repo.installationId ?? null,repo.defaultBranch]); return r.rows[0] as Repository; }
  async getDeveloperByToken(token: string) { const r=await this.pool.query("SELECT id,github_login AS \"githubLogin\",email,token_hash AS \"tokenHash\" FROM developers WHERE token_hash=$1",[hash(token)]); return r.rows[0] as Developer | undefined; }
  async createDeveloper(input: Omit<Developer,"id"|"tokenHash"> & {token:string}) { const developer={id:crypto.randomUUID(),githubLogin:input.githubLogin,email:input.email,tokenHash:hash(input.token)}; const r=await this.pool.query("INSERT INTO developers(id,github_login,email,token_hash) VALUES($1,$2,$3,$4) RETURNING id,github_login AS \"githubLogin\",email,token_hash AS \"tokenHash\"",[developer.id,developer.githubLogin,developer.email ?? null,developer.tokenHash]); return r.rows[0] as Developer; }
  async saveContext(context: SessionContext) { await this.pool.query("INSERT INTO session_contexts(session_id,repository_slug,branch,head_sha,developer_id,observed_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(session_id) DO UPDATE SET repository_slug=EXCLUDED.repository_slug,branch=EXCLUDED.branch,head_sha=EXCLUDED.head_sha,developer_id=EXCLUDED.developer_id,observed_at=EXCLUDED.observed_at",[context.sessionId,context.repositorySlug,context.branch,context.headSha,context.developerId,context.observedAt]); }
  async attachPendingEvents(context: SessionContext, repositoryId: string) { const r=await this.pool.query("UPDATE usage_events SET repository_id=$3,branch=$4,head_sha=$5,attribution_method='hook_context',attribution_confidence=1 WHERE session_id=$1 AND developer_id=$2 AND repository_id IS NULL",[context.sessionId,context.developerId,repositoryId,context.branch,context.headSha]); return r.rowCount ?? 0; }
  async getContext(sessionId: string) { const r=await this.pool.query("SELECT session_id AS \"sessionId\",repository_slug AS \"repositorySlug\",branch,head_sha AS \"headSha\",developer_id AS \"developerId\",observed_at AS \"observedAt\" FROM session_contexts WHERE session_id=$1",[sessionId]); return r.rows[0] as SessionContext | undefined; }
  async getVerificationSessions(developerId: string, after: string) {
    const r=await this.pool.query("SELECT sc.session_id AS \"sessionId\",sc.repository_slug AS \"repositorySlug\",sc.branch,sc.head_sha AS \"headSha\",sc.observed_at AS \"observedAt\",COUNT(ue.id)::int AS \"eventCount\" FROM session_contexts sc LEFT JOIN usage_events ue ON ue.session_id=sc.session_id AND ue.developer_id=$1 AND ue.repository_id IS NOT NULL WHERE sc.developer_id=$1 AND sc.observed_at >= $2 GROUP BY sc.session_id,sc.repository_slug,sc.branch,sc.head_sha,sc.observed_at ORDER BY sc.observed_at DESC",[developerId,after]);
    return r.rows as VerificationSession[];
  }
  async getRates() { const r=await this.pool.query("SELECT model,effective_from::text AS \"effectiveFrom\",input_per_mtok::float AS \"inputPerMTok\",output_per_mtok::float AS \"outputPerMTok\",cached_input_per_mtok::float AS \"cachedInputPerMTok\" FROM model_rates"); return r.rows as ModelRate[]; }
  async ingestEvent(event: UsageEvent) { const r=await this.pool.query("INSERT INTO usage_events(id,event_key,source,session_id,repository_id,developer_id,branch,head_sha,model,input_tokens,output_tokens,cached_input_tokens,occurred_at,cost_usd,rate_effective_from,attribution_method,attribution_confidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT(event_key) DO NOTHING",[event.id,event.eventKey,event.source,event.sessionId ?? null,event.repositoryId ?? null,event.developerId ?? null,event.branch ?? null,event.headSha ?? null,event.model,event.inputTokens,event.outputTokens,event.cachedInputTokens,event.occurredAt,event.costUsd,event.rateEffectiveFrom,event.attributionMethod,event.attributionConfidence]); return {inserted:r.rowCount===1}; }
  async getEvents(repositoryId: string, options: {branch?:string;from?:string;to?:string} = {}) { const clauses=["repository_id=$1"]; const values:unknown[]=[repositoryId]; if(options.branch){ values.push(options.branch);clauses.push(`branch=$${values.length}`); } if(options.from){values.push(options.from);clauses.push(`occurred_at >= $${values.length}`);}if(options.to){values.push(options.to);clauses.push(`occurred_at <= $${values.length}`);} const r=await this.pool.query(`SELECT id,event_key AS "eventKey",source,session_id AS "sessionId",repository_id AS "repositoryId",developer_id AS "developerId",branch,head_sha AS "headSha",model,input_tokens::int AS "inputTokens",output_tokens::int AS "outputTokens",cached_input_tokens::int AS "cachedInputTokens",occurred_at AS "occurredAt",cost_usd::float AS "costUsd",rate_effective_from::text AS "rateEffectiveFrom",attribution_method AS "attributionMethod",attribution_confidence AS "attributionConfidence" FROM usage_events WHERE ${clauses.join(" AND ")} ORDER BY occurred_at`,values); return r.rows as UsageEvent[]; }
  async upsertPullRequest(pr: PullRequest) { const r=await this.pool.query("INSERT INTO pull_requests(repository_id,number,branch,head_sha,title,state,comment_id,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(repository_id,number) DO UPDATE SET branch=EXCLUDED.branch,head_sha=EXCLUDED.head_sha,title=EXCLUDED.title,state=EXCLUDED.state,comment_id=EXCLUDED.comment_id,updated_at=EXCLUDED.updated_at RETURNING repository_id AS \"repositoryId\",number,branch,head_sha AS \"headSha\",title,state,comment_id AS \"commentId\",updated_at AS \"updatedAt\"",[pr.repositoryId,pr.number,pr.branch,pr.headSha,pr.title,pr.state,pr.commentId ?? null,pr.updatedAt]); return {...r.rows[0],id:pr.id} as PullRequest; }
  async getPullRequest(repositoryId: string,number: number) { const r=await this.pool.query("SELECT repository_id AS \"repositoryId\",number,branch,head_sha AS \"headSha\",title,state,comment_id AS \"commentId\",updated_at AS \"updatedAt\" FROM pull_requests WHERE repository_id=$1 AND number=$2",[repositoryId,number]); return r.rows[0] ? {...r.rows[0],id:`pr_${repositoryId}_${number}`} as PullRequest : undefined; }
  async saveReceipt(receipt: Receipt) { await this.pool.query("INSERT INTO receipts(repository_id,pr_number,receipt) VALUES($1,$2,$3::jsonb) ON CONFLICT(repository_id,pr_number) DO UPDATE SET receipt=EXCLUDED.receipt",[receipt.repositoryId,receipt.prNumber,JSON.stringify(receipt)]); }
  async getReceipt(repositoryId: string,number: number) { const r=await this.pool.query("SELECT receipt FROM receipts WHERE repository_id=$1 AND pr_number=$2",[repositoryId,number]); return r.rows[0]?.receipt as Receipt | undefined; }
  async getDashboard(repositoryId: string) { const repo=await this.pool.query("SELECT id,slug,installation_id AS \"installationId\",default_branch AS \"defaultBranch\" FROM repositories WHERE id=$1",[repositoryId]); if(!repo.rows[0]) throw new Error("Repository not found"); const events=await this.getEvents(repositoryId); const now=Date.now(); const total=(days:number)=>events.filter((event)=>Date.parse(event.occurredAt)>=now-days*86400000).reduce((sum,event)=>sum+event.costUsd,0); const result=await this.pool.query("SELECT receipt FROM receipts WHERE repository_id=$1",[repositoryId]); const receipts=result.rows.map((row)=>row.receipt as Receipt); return {repo:repo.rows[0] as Repository,metrics:{spend7d:total(7),spend30d:total(30),prCount:receipts.length,avgConfidence:receipts.reduce((sum,receipt)=>sum+receipt.confidence,0)/(receipts.length||1)},receipts:receipts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}; }
}

let singleton: GovernorStore | undefined;
export function getStore(): GovernorStore { if (!singleton) singleton = process.env.DATABASE_URL ? new PostgresGovernorStore(process.env.DATABASE_URL) : new MemoryGovernorStore(); return singleton; }
