# Governor

Governor puts transparent **Codex cost receipts** on GitHub pushes and pull requests. It tracks both developer Codex work and autonomous Codex work run in GitHub Actions, always against a repository, branch, commit, and PR. It does not inspect prompts or generated code, write repository contents, estimate other vendors' costs, or claim invoice-level billing accuracy.

## Quick start

**Requires:** Node 20+, Codex installed, and a git repo with an `origin` remote and at least one commit.

1. Install the public Governor GitHub App on a repo you own: https://github.com/apps/governor-app-mvp-demo
2. Sign in to Governor (https://governor-fawn.vercel.app), connect GitHub to Governor, and open Setup to get your one-time connect command. It should look something like:

   ```bash
   npx --yes @muzman123/governor@latest connect --url https://governor-fawn.vercel.app --token gov_<your-token>
   ```

3. Run it in your terminal.
4. Fully restart Codex so the config loads.
5. Run a real Codex task in that repo.
6. Watch Setup flip to verified.

**To test:**

- Use Codex normally to push commits to branches; leave comprehensive commit messages.
- PR the branch to main/master with a short or comprehensive PR message, and watch the automated receipt comment populate with the work and AI-usage summary.
- Visit the overview page for total AI usage through Codex, then visit the repository dashboard to see the breakdown of exact token spend within the repo.

## What works

- A developer connects a user-level Codex OTel exporter and Governor's existing end-of-turn notification bridge with one `governor connect` command.
- The notification bridge records only session ID, GitHub repository, branch, HEAD SHA, and a completed-turn timestamp. Governor joins usage to the completed-turn window containing its timestamp, so a continuing desktop-app session can safely cross branches.
- Governor applies an effective-dated token price table, retaining inputs, model rate version, and attribution confidence for every estimate.
- GitHub `push` webhooks create a neutral **Governor — estimated Codex cost** Check Run. PR lifecycle events and one settled Codex-turn boundary create or update the cost-receipt comment; streaming telemetry updates the stored receipt without repeatedly editing GitHub.
- Repository-scoped agent tokens let a GitHub Actions runner submit `codex exec --json` usage with deterministic repository, branch, SHA, and workflow-run context. Receipts and dashboards split developer-assisted and autonomous-agent cost.
- PR receipts include a factual **Work context** summary. Governor transiently groups changed-file metadata and human PR/review discussion, then stores only the resulting summary, aggregate scope counts, and provenance labels—never raw comments, file paths, diffs, or repository file contents.
- Repository dashboards can hold one admin-managed monthly USD budget. Governor compares recorded UTC-month token-rate spend with that limit and shows a transparent calendar-month run-rate forecast; it never blocks Codex or represents the estimate as an invoice.
- Governor groups PR receipts by a small documented set of GitHub labels (`feature`, `bug`, `security`, and maintenance/refactor variants). Unknown labels remain **Unclassified** rather than being guessed from code or prompt content.
- The public dashboard uses seeded aggregate data; names are never shown there. GPT-5.6 optionally turns deterministic receipt facts into a two-sentence explanation and cannot change its calculation.

## Run locally

1. Copy `.env.example` to `.env.local`. `DATABASE_URL` is optional for the seeded demo; GitHub credentials are required only to publish live Check Runs/comments. Set `GOVERNOR_USE_MEMORY=1` to force the seeded in-memory demo while a production `DATABASE_URL` is present locally.
2. Install and start:

   ```bash
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000` for the public demo. Run `npm test` for deterministic pricing, attribution, agent scoping, PR outcome, and webhook coverage.

## GitHub App setup

Create a GitHub App with **Checks: Read & write**, **Pull requests: Read & write**, **Metadata: Read-only**, and webhook subscriptions for `push` and `pull_request`. Point its webhook URL at `https://YOUR_HOST/api/github/webhook`, copy the App ID/private key/webhook secret into the environment, and install it only on the repository being governed. Governor intentionally requests no contents-write permission.

## Developer setup

Configure GitHub OAuth (`GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`) and visit `/api/auth/github/start`. OAuth signs the user into the private `/app` workspace and exposes only repositories that both the signed-in GitHub user can access and Governor has connected. The setup page displays a one-time telemetry token. From any terminal on the developer machine:

```bash
npx --yes @muzman123/governor@latest connect --url https://YOUR_HOST --token YOUR_TELEMETRY_TOKEN
```

`connect` creates a timestamped backup before changing `~/.codex/config.toml`, keeps `log_user_prompt = false`, and wraps an existing `notify` command. It works with the ChatGPT desktop app; it does not install Codex lifecycle hooks or require Codex CLI. Governor keeps timestamped completed-turn boundaries and joins each token record to the matching window. It never changes an existing `[otel]` configuration. If live OTel/session correlation proves unavailable for a Codex version, use the explicit fallback `governor capture --file <session.jsonl>`; uncorrelated costs remain confidence-scored rather than guessed.

Existing users can install a new local runtime without replacing their token:

```bash
npx --yes @muzman123/governor@latest upgrade
```

## Autonomous GitHub Actions agent setup

1. Open the governed repository in Governor and choose **Create agent token** in the **Autonomous agents** panel. This produces a one-time `gov_agent_...` token that is scoped to that repository alone; creating a replacement revokes the old one.
2. Save it in the governed repository as the `GOVERNOR_AGENT_TOKEN` Actions secret. Do not place it in a workflow file.
3. Run Codex with JSONL output and add the Governor composite Action immediately afterward. A complete example is in [`examples/governor-codex-agent.yml`](examples/governor-codex-agent.yml).

```yaml
- name: Run Codex and save usage JSONL
  run: |
    CODEX_API_KEY="${{ secrets.OPENAI_API_KEY }}" npx --yes @openai/codex exec --json --model gpt-5.6 "Review this pull request." | tee "$RUNNER_TEMP/codex.jsonl"

- uses: muzman123/Governor/.github/actions/governor-capture@main
  with:
    governor-url: https://YOUR_GOVERNOR_HOST
    token: ${{ secrets.GOVERNOR_AGENT_TOKEN }}
    session-file: ${{ runner.temp }}/codex.jsonl
    model: gpt-5.6
    branch: ${{ github.head_ref || github.ref_name }}
    sha: ${{ github.event.pull_request.head.sha || github.sha }}
```

The action reads only the `turn.completed` token-count record emitted by `codex exec --json`. It never uploads prompt text, agent messages, shell commands, tool output, or generated code. After upload it refreshes any known receipt for the same PR branch, so a review-only agent run appears without requiring a later push. GitHub Actions context makes the event exact for the configured repository, but workflows must remain trusted: never expose OpenAI or Governor secrets to untrusted code or fork pull requests.

## Production deployment

Deploy the Next.js app to Vercel, Railway, or Render, use Supabase/Postgres for `DATABASE_URL`, then run `npm run db:init` to apply [`db/schema.sql`](db/schema.sql), seed effective-dated rates, and create the public demo tenant. This release adds migration-safe columns/tables for agent tokens, actor attribution, PR outcomes, PR work type, and repository budgets, so apply `db:init` once after deployment. Set `GOVERNOR_URL` to the public deployment URL and add a random `GOVERNOR_SESSION_SECRET` (at least 32 random bytes) to encrypt GitHub OAuth tokens held server-side. Configure the OTLP receiver at `/v1/logs` for JSON OTLP traffic, then point the GitHub App and OAuth callback to the same public host. Existing users must sign in again after deployment so Governor can request the repository-read OAuth scope required by the workspace.
