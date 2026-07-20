CREATE TABLE IF NOT EXISTS repositories (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, installation_id BIGINT, default_branch TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS developers (id TEXT PRIMARY KEY, github_login TEXT NOT NULL, email TEXT, token_hash TEXT UNIQUE NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS developers_github_login_unique ON developers(LOWER(github_login));
CREATE TABLE IF NOT EXISTS web_sessions (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, developer_id TEXT NOT NULL REFERENCES developers(id) ON DELETE CASCADE, github_login TEXT NOT NULL, github_token_ciphertext TEXT NOT NULL, setup_token_ciphertext TEXT, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS web_sessions_token_expiry ON web_sessions(token_hash, expires_at);
CREATE TABLE IF NOT EXISTS model_rates (model TEXT NOT NULL, effective_from DATE NOT NULL, input_per_mtok NUMERIC NOT NULL, output_per_mtok NUMERIC NOT NULL, cached_input_per_mtok NUMERIC NOT NULL, PRIMARY KEY(model, effective_from));
CREATE TABLE IF NOT EXISTS session_contexts (session_id TEXT PRIMARY KEY, repository_slug TEXT NOT NULL, branch TEXT NOT NULL, head_sha TEXT NOT NULL, developer_id TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL);
CREATE INDEX IF NOT EXISTS session_contexts_developer_observed ON session_contexts(developer_id, observed_at DESC);
CREATE TABLE IF NOT EXISTS agent_tokens (id TEXT PRIMARY KEY, repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE, label TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, created_by_developer_id TEXT NOT NULL REFERENCES developers(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), revoked_at TIMESTAMPTZ, last_used_at TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS agent_tokens_repository_active ON agent_tokens(repository_id, created_at DESC) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS usage_events (id TEXT PRIMARY KEY, event_key TEXT UNIQUE NOT NULL, source TEXT NOT NULL, session_id TEXT, repository_id TEXT REFERENCES repositories(id), developer_id TEXT REFERENCES developers(id), actor_type TEXT NOT NULL DEFAULT 'developer', actor_name TEXT, workflow_run_id TEXT, workflow_run_url TEXT, workflow_name TEXT, branch TEXT, head_sha TEXT, model TEXT NOT NULL, input_tokens BIGINT NOT NULL, output_tokens BIGINT NOT NULL, cached_input_tokens BIGINT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL, cost_usd NUMERIC NOT NULL, rate_effective_from DATE NOT NULL, attribution_method TEXT NOT NULL, attribution_confidence REAL NOT NULL);
CREATE INDEX IF NOT EXISTS usage_events_repo_branch_time ON usage_events(repository_id, branch, occurred_at);
CREATE TABLE IF NOT EXISTS pull_requests (repository_id TEXT REFERENCES repositories(id), number INTEGER NOT NULL, branch TEXT NOT NULL, head_sha TEXT NOT NULL, title TEXT NOT NULL, state TEXT NOT NULL, outcome TEXT NOT NULL DEFAULT 'open', comment_id BIGINT, merged_at TIMESTAMPTZ, closed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(repository_id, number));
CREATE TABLE IF NOT EXISTS receipts (repository_id TEXT REFERENCES repositories(id), pr_number INTEGER NOT NULL, receipt JSONB NOT NULL, PRIMARY KEY(repository_id, pr_number));

-- Safe for existing Supabase/Postgres deployments that initialized an earlier MVP schema.
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'developer';
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS workflow_run_id TEXT;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS workflow_run_url TEXT;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS workflow_name TEXT;
ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT 'open';
ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;
ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS usage_events_repo_actor_time ON usage_events(repository_id, actor_type, occurred_at);
