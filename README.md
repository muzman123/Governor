# Governor

Governor puts transparent **estimated Codex cost receipts** on GitHub pushes and pull requests. It is deliberately narrow: this MVP tracks developer Codex work against a repository, branch, commit, and PR. It does not inspect prompts or generated code, write repository contents, estimate other vendors' costs, or claim invoice-level billing accuracy.

## What works

- A developer connects a user-level Codex OTel exporter and a notify hook with `governor join`.
- The hook sends only session ID, GitHub repository, branch, HEAD SHA, and timestamp. The OTel receiver normalizes token metadata and uses that context to attribute work.
- Governor applies an effective-dated token price table, retaining inputs, model rate version, and attribution confidence for every estimate.
- GitHub `push` webhooks create a neutral **Governor — estimated Codex cost** Check Run. PR open/synchronize webhooks create or update one cost-receipt comment.
- The public dashboard uses seeded aggregate data; names are never shown there. GPT-5.6 optionally turns the deterministic receipt into a two-sentence explanation and cannot change its calculation.

## Run locally

1. Copy `.env.example` to `.env.local`. `DATABASE_URL` is optional for the seeded demo; GitHub credentials are required only to publish live Check Runs/comments.
2. Install and start:

   ```bash
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000` for the public demo. Run `npm test` for deterministic pricing, attribution, and webhook coverage.

## GitHub App setup

Create a GitHub App with **Checks: Read & write**, **Pull requests: Read & write**, **Metadata: Read-only**, and webhook subscriptions for `push` and `pull_request`. Point its webhook URL at `https://YOUR_HOST/api/github/webhook`, copy the App ID/private key/webhook secret into the environment, and install it only on the repository being governed. Governor intentionally requests no contents-write permission.

## Developer setup

Configure GitHub OAuth (`GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`) and visit `/api/auth/github/start`. OAuth now signs the user into the private `/app` workspace and exposes only repositories that both the signed-in GitHub user can access and Governor has connected. The setup page displays a one-time telemetry token. From this repository on the developer machine:

```bash
npm run governor -- join --url https://YOUR_HOST --token YOUR_TELEMETRY_TOKEN
npm run governor -- verify 120
```

`join` creates a timestamped backup before changing `~/.codex/config.toml`, keeps `log_user_prompt = false`, and wraps an existing `notify` command so both it and Governor receive Codex completion payloads. It never changes an existing `[otel]` configuration. `verify` waits for one real Codex turn and reports whether Governor saw both signed git context and its matching usage event. If live OTel/session correlation proves unavailable for a Codex version, use the explicit fallback `governor capture --file <session.jsonl>`; uncorrelated costs remain confidence-scored rather than guessed.

## Production deployment

Deploy the Next.js app to Vercel, Railway, or Render, use Supabase/Postgres for `DATABASE_URL`, then run `npm run db:init` to apply [`db/schema.sql`](db/schema.sql), seed the effective-dated rates, and create the public demo tenant. Set `GOVERNOR_URL` to the public deployment URL and add a random `GOVERNOR_SESSION_SECRET` (at least 32 random bytes) to encrypt GitHub OAuth tokens held server-side. Configure the OTLP receiver at `/v1/logs` for JSON OTLP traffic, then point the GitHub App and OAuth callback to the same public host. Existing users must sign in again after deployment so Governor can request the repository-read OAuth scope required by the workspace.

## How Codex and GPT-5.6 were used

Codex accelerated the architecture, TypeScript implementation, test design, data schema, CLI workflow, GitHub App integration, and demo surface. Product decisions remained human-led: the MVP intentionally prioritizes transparent developer Codex cost attribution over broad but weak vendor coverage, avoids prompt/code collection, and never writes to repository contents. GPT-5.6 is used in-product only for a bounded receipt explanation generated from already-calculated aggregate metrics; pricing and attribution remain deterministic code.

## Judge test path

Use the hosted public sandbox to inspect aggregate receipts without an account. For a live test, install the App on a disposable repository, obtain a telemetry token through OAuth, run `governor join`, work with Codex on a branch, then push/open a PR. The PR receipt and Check Run update without a rebuild.
