# Governor

Governor puts transparent **estimated Codex cost receipts** on GitHub pushes and pull requests. It tracks both developer Codex work and autonomous Codex work run in GitHub Actions, always against a repository, branch, commit, and PR. It does not inspect prompts or generated code, write repository contents, estimate other vendors' costs, or claim invoice-level billing accuracy.

## What works

- A developer connects a user-level Codex OTel exporter and notify hook with one `governor connect` command.
- The hook sends only session ID, GitHub repository, branch, HEAD SHA, and timestamp. The OTel receiver normalizes token metadata and uses that context to attribute work.
- Governor applies an effective-dated token price table, retaining inputs, model rate version, and attribution confidence for every estimate.
- GitHub `push` webhooks create a neutral **Governor — estimated Codex cost** Check Run. PR open/synchronize/close webhooks create or update one cost-receipt comment, including whether a PR merged or closed without merge.
- Repository-scoped agent tokens let a GitHub Actions runner submit `codex exec --json` usage with deterministic repository, branch, SHA, and workflow-run context. Receipts and dashboards split developer-assisted and autonomous-agent cost.
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

`connect` creates a timestamped backup before changing `~/.codex/config.toml`, keeps `log_user_prompt = false`, wraps an existing `notify` command, then waits up to ten minutes for one real Codex turn to verify the signed-context and usage join. It never changes an existing `[otel]` configuration. If live OTel/session correlation proves unavailable for a Codex version, use the explicit fallback `governor capture --file <session.jsonl>`; uncorrelated costs remain confidence-scored rather than guessed.

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

Deploy the Next.js app to Vercel, Railway, or Render, use Supabase/Postgres for `DATABASE_URL`, then run `npm run db:init` to apply [`db/schema.sql`](db/schema.sql), seed effective-dated rates, and create the public demo tenant. This release adds migration-safe columns/tables for agent tokens, actor attribution, and PR outcomes, so apply `db:init` once after deployment. Set `GOVERNOR_URL` to the public deployment URL and add a random `GOVERNOR_SESSION_SECRET` (at least 32 random bytes) to encrypt GitHub OAuth tokens held server-side. Configure the OTLP receiver at `/v1/logs` for JSON OTLP traffic, then point the GitHub App and OAuth callback to the same public host. Existing users must sign in again after deployment so Governor can request the repository-read OAuth scope required by the workspace.

## How Codex and GPT-5.6 were used

Codex accelerated the architecture, TypeScript implementation, test design, data schema, CLI workflow, GitHub App integration, agent-ingestion flow, and demo surface. Product decisions remained human-led: Governor prioritizes transparent, prompt-safe cost attribution over broad but weak vendor coverage, avoids prompt/code collection, and never writes to repository contents. GPT-5.6 is used in-product only for a bounded receipt explanation generated from already-calculated aggregate metrics; pricing, attribution, actor classification, and outcome metrics remain deterministic code.

## Judge test path

Use the hosted public sandbox to inspect aggregate receipts without an account. For a live developer test, install the App on a disposable repository, obtain a telemetry token through OAuth, run `governor connect`, work with Codex on a branch, then push/open a PR. For an autonomous-agent test, generate the repository-scoped agent token, add the sample workflow, and trigger it from a trusted pull request. The PR receipt, Check Run, and dashboard update without a rebuild.
