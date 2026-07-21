export type ActorType = "developer" | "agent";
export type AttributionMethod = "hook_context" | "session_fallback" | "branch_inferred" | "github_actions";
export type UsageSource = "otel" | "session_file" | "manual" | "github_actions";
export type PullRequestOutcome = "open" | "merged" | "closed_unmerged";

export type Repository = { id: string; slug: string; installationId?: number; defaultBranch: string };
export type Developer = { id: string; githubLogin: string; email?: string; tokenHash: string };
export type AgentToken = { id: string; repositoryId: string; label: string; tokenHash: string; createdByDeveloperId: string; createdAt: string; revokedAt?: string; lastUsedAt?: string };
export type ModelRate = { model: string; effectiveFrom: string; inputPerMTok: number; outputPerMTok: number; cachedInputPerMTok: number };
export type SessionContext = { sessionId: string; repositorySlug: string; branch: string; headSha: string; developerId: string; observedAt: string };
export type VerificationSession = { sessionId: string; repositorySlug: string; branch: string; headSha: string; observedAt: string; eventCount: number };

export type UsageEvent = {
  id: string; eventKey: string; source: UsageSource; sessionId?: string; repositoryId?: string; developerId?: string;
  actorType: ActorType; actorName?: string; workflowRunId?: string; workflowRunUrl?: string; workflowName?: string;
  branch?: string; headSha?: string; model: string; inputTokens: number; outputTokens: number; cachedInputTokens: number;
  occurredAt: string; costUsd: number; rateEffectiveFrom: string; attributionMethod: AttributionMethod; attributionConfidence: number;
};

export type PullRequest = {
  id: string; repositoryId: string; number: number; branch: string; headSha: string; title: string; state: "open" | "closed";
  outcome: PullRequestOutcome; commentId?: number; mergedAt?: string; closedAt?: string; updatedAt: string;
};

export type ModelBreakdown = { model: string; inputTokens: number; outputTokens: number; cachedInputTokens: number; costUsd: number };
export type ActorBreakdown = { actorType: ActorType; label: string; eventCount: number; costUsd: number };
export type WorkContextCategory = "application" | "tests" | "documentation" | "configuration" | "dependencies" | "ci" | "migrations" | "other";
export type WorkContextCategoryCount = { category: WorkContextCategory; fileCount: number };
export type WorkContextSource = "pr_metadata" | "pr_discussion" | "review_comments";
export type WorkContextComment = { kind: "discussion" | "review" | "inline_review"; body: string; createdAt?: string };

/**
 * Ephemeral, sanitized GitHub facts used to describe the scope of a PR. This
 * object must never be persisted: it can contain file paths and PR-comment text.
 */
export type WorkContextInput = {
  title: string; repositoryDescription?: string; headSha: string;
  filesChanged?: number; additions?: number; deletions?: number;
  categories: WorkContextCategoryCount[]; categoryCoverage: "complete" | "partial" | "unavailable";
  comments: WorkContextComment[]; sources: WorkContextSource[]; fingerprint: string;
};

/** A privacy-safe, stored description of the engineering work on a receipt. */
export type WorkContext = {
  summary: string; filesChanged?: number; additions?: number; deletions?: number;
  categories: WorkContextCategoryCount[]; categoryCoverage: "complete" | "partial" | "unavailable";
  sources: WorkContextSource[]; headSha: string; fingerprint: string; generatedAt: string;
};
export type ObservationCategory = "cache_efficiency" | "cost_outlier" | "model_mix" | "attribution_quality";
export type ReceiptObservation = { category: ObservationCategory; title: string; explanation: string; evidence: string; impactUsd?: number; confidence: number; calculationVersion: string; generatedAt: string };
export type Receipt = {
  repositoryId: string; prNumber: number; title: string; headSha: string; totalCost: number; confidence: number; eventCount: number;
  models: ModelBreakdown[]; actors: ActorBreakdown[]; outcome?: PullRequestOutcome; outcomeAt?: string;
  explanation?: string; observation?: ReceiptObservation; workContext?: WorkContext; updatedAt: string;
};

export type OutcomeMetrics = {
  openCount: number; mergedCount: number; closedUnmergedCount: number;
  mergedCost: number; closedUnmergedCost: number; costPerMergedPr?: number;
};
export type Dashboard = {
  repo: Repository;
  metrics: {
    spend7d: number; spend30d: number; agentSpend7d: number; agentSpend30d: number; prCount: number; avgConfidence: number;
    outcomes: OutcomeMetrics;
  };
  receipts: Receipt[];
};
export type SpendPoint = { date: string; costUsd: number };
export type RepositoryOverview = Dashboard & {
  modelSpend: ModelBreakdown[]; actorSpend: ActorBreakdown[]; spendTrend: SpendPoint[]; recentEvents: UsageEvent[];
  lastActivityAt?: string; telemetryHealthy: boolean; agentTokenConfigured: boolean;
};
