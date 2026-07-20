# Governor MVP — Product and Technical Design

**Version:** 1.0  
**Status:** Working end-to-end MVP  
**Last updated:** July 20, 2026

## 1. Executive summary

Governor is a developer-tool and engineering-management control surface for AI-assisted software work. It answers a question that is otherwise difficult to answer with evidence:

> What did this Codex-assisted engineering work cost, which Git work did it contribute to, and is there anything meaningful to understand about that cost?

Governor attaches transparent **estimated Codex cost receipts** to GitHub pushes and pull requests. It joins prompt-safe Codex token metadata to signed Git repository, branch, commit, and session context; applies an effective-dated rate table; and presents the resulting estimate in GitHub and a live dashboard.

The product deliberately does **not** claim invoice-level billing accuracy. It presents auditable token-rate estimates, shows attribution confidence, and never stores prompts, responses, or generated code.

The full production-shaped loop has now been validated with a separate GitHub account and repository:

```text
Install GitHub App
    -> Sign in to Governor
    -> Run one npx connection command
    -> Complete a real Codex task
    -> Push changes / open a PR
    -> Receive a GitHub receipt and dashboard update
```

## 2. Product problem

AI coding spend currently appears in a place that engineering teams cannot use to make decisions: a vendor invoice or a broad account-level usage page. It is difficult to answer:

- Which pull request created the spend?
- Which models were used and how many tokens did they consume?
- Is the cost attached to exact repository context or inferred context?
- Did a change use unusually little cache, an unusually expensive model mix, or more spend than comparable work?
- Can a lead understand the answer without collecting source code or prompts?

Governor makes the pull request and repository the unit of understanding. The product does not try to be a generic finance platform, a surveillance tool, or a policy engine. It begins with credible, contextual evidence.

## 3. Product positioning

### Core promise

**Every Codex dollar, attached to the work it produced.**

Governor is an engineering-lead control surface for AI development spend. It gives developers and leads a calm, GitHub-native view of estimated cost, model mix, attribution quality, and notable patterns.

### Product principles

1. **Evidence over inference.** Repository, branch, commit, model, token counts, rate date, and attribution confidence are visible.
2. **Privacy by architecture.** Prompts, responses, and generated code are outside the data model.
3. **Estimates are not invoices.** Every amount is labelled as an estimated Codex cost or token-rate estimate.
4. **Insights are observations, not incidents.** Governor flags evidence-backed patterns without framing developers as violations.
5. **Setup should be boring.** One app install, one local command, one real Codex task.
6. **GitHub is where the decision happens.** PR comments and Check Runs bring the estimate back to the engineering workflow.

## 4. Target users and jobs to be done

### Primary users

| User | Job Governor helps them do |
| --- | --- |
| Individual developer | Understand the estimated cost of Codex work attached to their branch and PR. |
| Engineering lead | See which repositories and PRs drive AI-development spend and where attention may be useful. |
| Platform / developer-experience owner | Give teams transparent cost visibility without storing code or prompts. |
| Hackathon judge / technical evaluator | Install the product, generate real work with Codex, and observe an auditable outcome quickly. |

### Explicitly not the initial user

- Finance teams requiring invoice reconciliation.
- Security teams seeking source-code inspection or surveillance.
- Organizations asking for budgets, enforcement, allocation, or approval workflows.

Those are possible future surfaces only after the core receipt and observation experience is trusted.

## 5. Scope

### In scope now

- Public landing page and anonymized public demo.
- GitHub OAuth sign-in and secure private workspace.
- Public GitHub App installation on selected repositories.
- One-command Codex connection through the public npm CLI.
- Real-turn verification.
- Usage ingestion, pricing, attribution, receipts, GitHub comments, and Check Runs.
- Portfolio and repository dashboards.
- Receipt detail with cost/model breakdown and a Governor observation block.
- Token replacement for a Governor-managed local connection.

### Intentionally out of scope for the MVP

- Invoice reconciliation or billing exports.
- Spend budgets, alerts, enforcement, or policy blocking.
- Slack, email, or ticketing integrations.
- Team cost allocation, chargeback, and organization roles.
- Non-Codex vendor support.
- Prompt/code storage, prompt analysis, or generated-code inspection.
- Multiple active Governor identities within one Codex configuration profile.

## 6. User experience

### 6.1 Public surfaces

| Route | Purpose |
| --- | --- |
| `/` | Landing page with product promise, privacy boundary, and GitHub sign-in CTA. |
| `/demo` | Public, anonymized product tour showing a sample receipt and observation. |
| `/app` | Authenticated portfolio workspace. |
| `/app/setup` | Guided GitHub App, CLI, and verification flow. |
| `/app/repos/:owner/:repo` | Live repository dashboard. |
| `/app/repos/:owner/:repo/pulls/:number` | Private PR receipt detail. |
| `/app/settings` | Identity, session, token rotation/replacement, and privacy explanation. |

### 6.2 New-user installation journey

#### Prerequisites

- A GitHub account and repository.
- Codex installed on the developer machine.
- Node.js 20 or newer.
- Git installed, a GitHub `origin` remote, and at least one commit in the repository.

#### Exact flow

1. The user visits Governor and clicks **Connect GitHub**.
2. The user authorizes the Governor OAuth app.
3. GitHub installs the public Governor GitHub App on selected repositories.
4. GitHub redirects to Governor Setup URL: `/app/setup`.
5. Governor shows a one-time telemetry token embedded in a copyable command:

   ```bash
   npx --yes @muzman123/governor@latest connect \
     --url https://governor-fawn.vercel.app \
     --token gov_<one-time-token>
   ```

6. The user runs the command from any terminal. No repository clone of Governor and no `npm install` is required.
7. The CLI backs up the Codex configuration, configures Governor, and begins verification.
8. The user fully restarts Codex and completes one real task from the connected repository.
9. Governor joins the signed Git context and matching usage event. The terminal and Setup page confirm verification.
10. The user works normally. On push or PR synchronization, Governor posts a receipt and updates the dashboard.

### 6.3 Adding another repository

For the same developer and machine, the user only installs the GitHub App on the additional repository. The existing Codex connection continues to attach its Git context to that repository. No new token or connection command is required.

### 6.4 Replacing a local connection

One Codex configuration profile has one active Governor telemetry identity. If a developer is moving to a new machine, repairing Codex, or intentionally replacing their Governor connection, Setup issues a replacement command:

```bash
npx --yes @muzman123/governor@latest connect --replace \
  --url https://governor-fawn.vercel.app \
  --token gov_<replacement-token>
```

The CLI only replaces a Governor-managed OTel block. It preserves other Codex settings, preserves Governor's notification dispatcher, creates a backup, and refuses to overwrite an unrelated OTel configuration.

## 7. Product surfaces and behavior

### 7.1 Landing page

The landing page establishes the product thesis before asking for access:

- AI engineering spend, in context.
- Transparent cost receipts on PRs.
- Token metadata plus Git context only.
- Explicit statement that Governor never stores prompts, responses, or generated code.
- CTAs for GitHub connection and the public sandbox.

### 7.2 Public demo

The public demo contains anonymized, seeded data only. It is designed to make the value legible in under a minute:

- 7-day and 30-day estimated spend.
- A sample PR cost receipt with model/token line items.
- A clearly labelled sample Governor observation.
- A short visual explanation of `Codex -> Governor -> GitHub`.

No live customer repository names, access tokens, prompts, code, or account data appear in the demo.

### 7.3 Authenticated portfolio overview

The private workspace provides:

- 7-day and 30-day estimated spend across connected repositories.
- Active repository count and receipt count.
- Connected repository list with per-repo 30-day estimate and telemetry health.
- Recent PR receipt list.
- Setup/telemetry health guidance.
- Manual refresh plus 30-second polling.

### 7.4 Repository dashboard

Each accessible repository has a dedicated dashboard with:

- 7-day and 30-day estimated spend.
- PR receipt count.
- Average attribution confidence.
- Last-14-day spend trend.
- Model mix and token breakdown.
- Receipt table.
- Recent attributed telemetry activity.
- Clear empty states for no telemetry or no PR receipts.

### 7.5 PR receipt detail

Receipt detail is the product's evidence page. It includes:

- Repository and PR metadata.
- Estimated Codex cost.
- Event count and attribution confidence.
- Per-model input, cached-input, output, and cost breakdown.
- Deterministic calculation explanation.
- Effective-rate methodology and privacy boundary.
- Direct GitHub PR link.
- Governor observation block or a quiet baseline-gathering state.

### 7.6 GitHub artifacts

#### Pull request comment

On PR open, reopen, synchronization, or edit, Governor creates or updates one idempotent comment. It contains:

- Estimated total cost.
- Usage-event count.
- Attribution confidence.
- Per-model cost and token quantities.
- Optional observation.
- Deterministic explanation.
- Link to the private receipt detail page.
- Statement that the result is a transparent estimate, not an invoice total.

#### Push Check Run

On push, Governor creates a neutral Check Run with a commit receipt. Governor does not block merges or enforce policy in this release.

## 8. System architecture

```text
                  ┌────────────────────────┐
                  │  GitHub OAuth + App    │
                  │ sign-in / installation │
                  └───────────┬────────────┘
                              │
                              v
┌──────────────┐      ┌───────────────────┐      ┌─────────────────────┐
│ Codex on the │      │ Governor Next.js  │      │ Supabase / Postgres │
│ developer    │----->│ app + API routes  │<---->│ events, receipts,   │
│ machine      │      │                   │      │ sessions, rates     │
└──────┬───────┘      └─────────┬─────────┘      └─────────────────────┘
       │                        │
       │ OTel token metadata    │ GitHub webhook / API calls
       │ signed Git context     │
       v                        v
┌──────────────┐      ┌───────────────────┐
│ Governor CLI │      │ GitHub pull       │
│ configures   │      │ request comment + │
│ Codex safely │      │ Check Run         │
└──────────────┘      └───────────────────┘
```

### Core components

| Component | Responsibility |
| --- | --- |
| Next.js application | Landing, demo, authenticated workspace, setup, API routes, GitHub webhooks, OTLP receiver. |
| GitHub App | Receives `push` and `pull_request` webhooks; writes PR comments and Check Runs. |
| GitHub OAuth App | Authenticates the user and lets Governor list repositories that user can access. |
| Governor CLI | Configures Codex telemetry and notify integration, verifies real attribution, supports safe replacement. |
| Codex notify hook | Emits session ID, working directory, branch, SHA, and repository context without prompt content. |
| OTel receiver | Normalizes Codex token metadata and ingests usage events. |
| PostgreSQL / Supabase | Stores repositories, developers, sessions, usage events, PRs, receipts, rates, and encrypted web-session data. |
| Receipt engine | Groups events by PR branch, calculates total/model costs and confidence. |
| Observation engine | Computes evidence-backed findings from deterministic baseline calculations. |
| GPT-5.6 explainer | Produces concise prose from already-calculated structured receipt/observation evidence. |

## 9. Data flow

### 9.1 Local Codex connection

`governor connect` writes only the configuration needed to establish Governor's local connection:

1. Creates a timestamped backup of `~/.codex/config.toml` when it exists.
2. Copies Governor hook/dispatcher executables into `~/.governor/bin`.
3. Stores the telemetry URL and developer token in a user-private local state file.
4. Adds an OTel exporter with `log_user_prompt = false`.
5. Adds a Governor dispatcher to preserve any existing Codex `notify` command.
6. Waits for a real verification event.

The CLI refuses to overwrite an existing unrelated `[otel]` configuration. It supports `--replace` only when it can positively identify a Governor-managed block.

### 9.2 Git context flow

When Codex completes a turn, the Governor notify dispatcher invokes the local hook. The hook obtains:

- Codex thread/session ID.
- GitHub repository slug derived from `origin`.
- Current Git branch.
- Current HEAD SHA.
- Timestamp.

It sends this signed context to Governor. If the current directory is not a GitHub repository with an `origin`, the hook skips the event rather than guessing.

### 9.3 Usage flow

Codex exports token metadata through OTel JSON traffic to Governor's `/v1/logs` receiver. Governor normalizes model ID, input tokens, cached input tokens, output tokens, session ID, and timestamp.

Usage that arrives before context is held and attached after the signed context arrives. Exact context attribution receives confidence `1.0`; fallback paths remain explicitly confidence-scored.

### 9.4 Receipt flow

1. GitHub sends a signed `push` or `pull_request` webhook.
2. Governor validates the webhook signature.
3. Governor identifies/upserts the repository and PR record.
4. Governor queries attributed usage events for the relevant branch.
5. Governor groups events by model and calculates a receipt.
6. Governor computes a deterministic observation when eligible.
7. GPT-5.6 optionally turns supplied structured evidence into concise explanatory prose.
8. Governor saves the receipt.
9. Governor posts/updates the GitHub PR comment or Check Run.
10. The authenticated dashboard renders the same stored receipt.

## 10. Cost calculation and attribution

### 10.1 Calculation model

For each usage event, Governor applies a model-specific rate selected by the event's timestamp:

```text
estimated cost =
  (input tokens        × input rate per token)
  + (cached input      × cached-input rate per token)
  + (output tokens     × output rate per token)
```

Receipts then aggregate events by model and branch/PR context.

### 10.2 Effective-dated rates

Rates are versioned by model and effective date. Governor stores the selected rate date with each event so later rate updates do not rewrite historical estimates.

### 10.3 Attribution confidence

| Method | Meaning |
| --- | --- |
| `hook_context` | Signed Git context matched to Codex usage; normally exact confidence. |
| `session_fallback` | Explicit local session-file fallback; confidence remains visible. |
| `branch_inferred` | Reserved for a lower-certainty path; never presented as exact. |

Confidence is visible in the GitHub receipt, dashboard table, and receipt detail.

## 11. Governor observations and the AI moment

The observation block is Governor's visible AI moment, but its numbers are not AI-generated.

### Deterministic layer

Governor calculates the category, baseline, threshold, evidence, confidence, and impact amount in code. Current categories are:

1. **Low cache utilization** — current cache ratio is materially below a sufficient repository baseline.
2. **PR cost outlier** — a receipt is materially above the median of comparable repository receipts.
3. **Expensive model mix** — one model dominates a multi-model receipt.
4. **Low attribution confidence** — context certainty is below the exact threshold.

The engine suppresses observations when history is insufficient. Instead it shows:

> Governor is gathering a baseline.

### GPT-5.6 layer

GPT-5.6 receives only structured aggregate evidence, such as total estimate, model line items, observation category, evidence, impact, and confidence. It generates concise explanatory prose but is explicitly prohibited from changing:

- the calculation;
- category;
- baseline;
- confidence;
- impact amount; or
- privacy boundary.

Example observation:

> Low cache reuse increased estimated cost. Cache utilization was 12% versus this repository's 64% baseline; approximately $3.10 of this receipt was reprocessed context.

Observations are calm insights, not alerts, policy violations, or developer-performance claims.

## 12. Privacy, security, and access model

### 12.1 Governor never stores

- Prompts.
- Model responses.
- Generated code.
- Repository file contents.

### 12.2 Governor stores

- Repository slug and GitHub App installation ID.
- Branch and commit SHA.
- Codex session ID.
- Model identifier.
- Input, cached-input, and output token counts.
- Timestamp.
- Effective rate date and estimated cost.
- Attribution method and confidence.
- PR metadata and receipt data.

### 12.3 Web access

- GitHub OAuth creates an opaque, HTTP-only, same-site session cookie.
- GitHub OAuth tokens are encrypted server-side in `web_sessions`; the browser does not receive them.
- Sessions expire and can be invalidated through logout.
- A repository appears in the private workspace only when both conditions are true:
  1. Governor has a connected repository record; and
  2. the signed-in GitHub user can access it through the GitHub API.
- Repository and receipt APIs enforce the same check.

### 12.4 Telemetry tokens

- A developer receives a one-time local telemetry token during setup.
- Governor stores a hash for verification rather than displaying the token again.
- Replacing a token revokes the old token.
- Tokens are credentials and must never be put in a repository, PR, issue, screenshot, or public log.

## 13. GitHub integration configuration

### GitHub App permissions

Governor needs:

- **Checks:** Read and write.
- **Pull requests:** Read and write.
- **Metadata:** Read-only.

Webhook subscriptions:

- `push`
- `pull_request`

Webhook URL:

```text
https://YOUR_GOVERNOR_HOST/api/github/webhook
```

The public GitHub App can be installed without Marketplace listing through:

```text
https://github.com/apps/YOUR-APP-SLUG/installations/new
```

GitHub App Setup URL:

```text
https://YOUR_GOVERNOR_HOST/app/setup
```

### OAuth callback URL

The OAuth App callback is separate from the GitHub App Setup URL:

```text
https://YOUR_GOVERNOR_HOST/api/auth/github/callback
```

## 14. CLI distribution

The public CLI package is:

```text
@muzman123/governor
```

It is intentionally scoped because the unscoped npm name `governor` is already occupied. The package exposes the executable name `governor` and requires Node.js 20 or newer.

### Commands

| Command | Purpose |
| --- | --- |
| `governor connect --url ... --token ...` | Configure a clean Codex profile and start verification. |
| `governor connect --replace --url ... --token ...` | Safely replace an existing Governor-managed connection. |
| `governor verify --wait 180` | Verify an existing connection with a real Codex turn. |
| `governor capture --file session.jsonl` | Explicit fallback import of token metadata from a session file. |
| `governor hook '{...}'` | Internal notify-hook entry point. |

## 15. Deployment and configuration

### Runtime services

- **Web/API:** Next.js deployed on Vercel.
- **Database:** Supabase/Postgres.
- **GitHub:** Public GitHub App plus OAuth App.
- **CLI:** npm package.

### Core environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase/Postgres connection string. |
| `GOVERNOR_URL` | Public base URL for links and callbacks. |
| `GOVERNOR_SESSION_SECRET` | Required production secret used to encrypt server-side GitHub session data. |
| `GITHUB_APP_ID` | GitHub App ID. |
| `GITHUB_PRIVATE_KEY` | GitHub App private key. |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook signature validation secret. |
| `GITHUB_APP_SLUG` | Used to show the GitHub App install/manage link in Setup. |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth client ID. |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth client secret. |
| `GITHUB_OAUTH_STATE_SECRET` | OAuth state signing secret. |
| `OPENAI_API_KEY` | Optional GPT-5.6 explanation generation. |
| `OPENAI_EXPLAINER_MODEL` | Optional explainer model override. |

### Database initialization

```powershell
$env:DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING"
npm run db:init
```

This applies the schema, seeds rate data, and creates anonymized demo data.

## 16. Validation completed

### Real end-to-end validation

Governor has been tested with:

- Real Codex tasks that edited files.
- Multiple Codex model IDs in one PR.
- Multiple usage events across sessions.
- Real commits, pushes, branches, and pull requests.
- GitHub App webhook deliveries.
- GitHub PR receipt comments.
- GitHub Check Runs.
- Receipt JSON/dashboard updates.
- New GitHub account installation on a new repository.
- Public npm CLI installation and execution.

The independently tested new-user path completed successfully: public GitHub App installation, npm CLI connection, Codex work, push/PR, GitHub comment, and dashboard update.

### Automated validation

The project currently covers:

- webhook signature validation;
- usage ingestion and idempotency;
- context-before-usage and usage-before-context joining;
- current Codex OTLP field normalization;
- timestamp normalization;
- rate selection and unsupported-model rejection;
- known Codex model aliases;
- verification semantics;
- PR and push receipt behavior;
- observation eligibility and suppression;
- database-driver Date timestamp regression;
- CLI syntax validation and npm package dry-run contents.

## 17. Known limitations and honest MVP boundaries

1. **One active Governor identity per Codex profile.** A Windows/macOS/Linux user profile with one `~/.codex/config.toml` cannot simultaneously export to two Governor developer identities. Use a separate OS profile/device for a true second-user test.
2. **Third-party OTel configuration is protected, not merged.** Governor safely refuses to alter an unrelated `[otel]` section. A future version can offer an intentional multi-exporter integration flow.
3. **Current npm scope is founder-owned.** `@muzman123/governor` is appropriate for the MVP; a company-owned npm organization should replace it before broad launch.
4. **No budgets or policy enforcement.** Governor reports; it does not block work.
5. **Observations require history.** Reliable cache and cost baselines should not be manufactured from one or two receipts.
6. **GitHub OAuth currently requests repository visibility needed to filter the workspace.** Permission copy and least-privilege refinements should continue before a large-scale launch.
7. **Estimates are transparent but not invoices.** Credits, enterprise plans, volume contracts, and vendor billing adjustments are outside the model.

## 18. Demo narrative

The strongest demo tells one continuous story:

1. **The problem:** AI coding spend appears far from the work it created.
2. **The connection:** install the GitHub App and run one `npx` command; Governor keeps prompts disabled.
3. **The proof:** ask Codex to make a real repository change; Governor verifies exact Git-context attribution.
4. **The artifact:** push and open a PR; show the GitHub receipt with total, model lines, token counts, and confidence.
5. **The control surface:** open the dashboard and receipt detail.
6. **The AI moment:** show a Governor observation—an evidence-backed explanation of cache reuse, an outlier, model mix, or low confidence.
7. **The trust close:** every number is a transparent estimate; Governor never stores prompts, responses, or generated code.

## 19. Roadmap after the MVP

### Milestone 1 — Make onboarding invisible

- Move CLI ownership from personal npm scope to product organization scope.
- Add a polished Setup completion state after verification.
- Add direct GitHub App install CTA and post-install redirect reliability checks.
- Improve recovery copy for expired/revoked tokens and unsupported OTel configurations.
- Add a first-receipt celebration and deep link.

### Milestone 2 — Make observations valuable

- Improve comparable-PR cohort selection.
- Add repository-level baseline explanation and trend views.
- Add observation history and acknowledgement state.
- Show effective-rate versions more explicitly in receipt detail.
- Evaluate a structured observation quality suite against seeded and real anonymized examples.

### Milestone 3 — Make it useful to teams

- Organization workspaces and roles.
- Team/repository grouping.
- Repository onboarding status at portfolio scale.
- Budget visibility and non-blocking spend targets.
- Slack/email summaries only after in-product value is proven.

### Milestone 4 — Governance workflows

- Configurable budget policies.
- High-cost PR review flows.
- Cost-allocation exports.
- Additional approved AI-provider telemetry sources.

## 20. Definition of success for this release

Governor succeeds as an MVP when a developer who has never used it can:

1. Install the GitHub App on a repository.
2. Sign in to Governor.
3. Run one generated `npx` command.
4. Complete one real Codex task.
5. Receive verified attribution.
6. Push a PR.
7. See a trustworthy, comprehensible cost receipt in GitHub and Governor.

That success condition has now been demonstrated end-to-end.
