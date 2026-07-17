export type AttributionMethod = "hook_context" | "session_fallback" | "branch_inferred";
export type UsageSource = "otel" | "session_file" | "manual";

export type Repository = { id: string; slug: string; installationId?: number; defaultBranch: string };
export type Developer = { id: string; githubLogin: string; email?: string; tokenHash: string };
export type ModelRate = { model: string; effectiveFrom: string; inputPerMTok: number; outputPerMTok: number; cachedInputPerMTok: number };
export type SessionContext = { sessionId: string; repositorySlug: string; branch: string; headSha: string; developerId: string; observedAt: string };
export type VerificationSession = { sessionId: string; repositorySlug: string; branch: string; headSha: string; observedAt: string; eventCount: number };
export type UsageEvent = {
  id: string; eventKey: string; source: UsageSource; sessionId?: string; repositoryId?: string; developerId?: string;
  branch?: string; headSha?: string; model: string; inputTokens: number; outputTokens: number; cachedInputTokens: number;
  occurredAt: string; costUsd: number; rateEffectiveFrom: string; attributionMethod: AttributionMethod; attributionConfidence: number;
};
export type PullRequest = { id: string; repositoryId: string; number: number; branch: string; headSha: string; title: string; state: "open" | "closed"; commentId?: number; updatedAt: string };
export type ModelBreakdown = { model: string; inputTokens: number; outputTokens: number; cachedInputTokens: number; costUsd: number };
export type Receipt = { repositoryId: string; prNumber: number; title: string; headSha: string; totalCost: number; confidence: number; eventCount: number; models: ModelBreakdown[]; explanation?: string; updatedAt: string };
export type Dashboard = { repo: Repository; metrics: { spend7d: number; spend30d: number; prCount: number; avgConfidence: number }; receipts: Receipt[] };
