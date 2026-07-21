# Governor — Project History, Product Specification, and Hackathon Handoff

**Version:** 1.2  
**Status:** Working developer-first MVP; current frontend simplification is local source work pending deployment  
**Last updated:** July 20, 2026  
**Primary category:** Developer Tools  
**Hosted application:** [governor-fawn.vercel.app](https://governor-fawn.vercel.app)  
**Public CLI:** [`@muzman123/governor`](https://www.npmjs.com/package/@muzman123/governor), latest verified release `0.1.2`

---

## 1. Why this document exists

This is the single narrative and current-product reference for Governor. It records:

- the original hackathon prompt and constraints;
- the product idea that emerged from it;
- the technical and product decisions that narrowed the MVP;
- the work that has been implemented and validated end to end;
- the exact current user experience and visual design;
- the deliberate decision to make autonomous-agent support dormant in the frontend; and
- the remaining work required to turn the MVP into a strong, judge-ready product.

Earlier documents remain useful implementation references:

- [`governor-design-doc-v1.0.md`](governor-design-doc-v1.0.md) — first complete product and technical specification;
- [`governor-frontend-design-doc-v1.0.md`](governor-frontend-design-doc-v1.0.md) — detailed frontend system and route reference;
- [`governor-agent-outcomes-design-doc-v1.1.md`](governor-agent-outcomes-design-doc-v1.1.md) — implemented agent-ingestion and PR-outcome vertical slice.

Where those documents describe visible autonomous-agent UI, this document is newer: agent capability remains in the backend, but is intentionally not part of the current frontend product story.

---

## 2. The hackathon context

Governor began as an OpenAI hackathon project with two plausible tracks:

1. **Work and productivity** — software that makes teams faster or more effective.
2. **Developer tools** — software for developers, testing, DevOps, agentic workflows, and security.

Governor belongs most naturally in **Developer Tools**, while its eventual buyer/user value also supports the work-and-productivity framing.

The important hackathon requirements that shaped the work are:

| Requirement | Governor implication |
| --- | --- |
| Build a project with the required developer tools. | Governor must use Codex and GPT-5.6 in a real, visible way rather than only mention them. |
| Select the category that best fits. | Developer Tools is the primary category. |
| Provide a text description. | The core story must be understandable without a deep infrastructure explanation. |
| Publish a demonstration video under three minutes with audio. | The product needs a short, concrete, end-to-end “before → after” story. |
| Demonstrate how Codex and GPT-5.6 were used. | Codex is used to build and validate the product; GPT-5.6 has a bounded in-product explanation role. |
| Provide a repository URL that judges can access. | The repo needs clear installation, deployment, and test instructions. |
| Explain Codex collaboration in the README. | The project must distinguish human product choices from Codex implementation acceleration. |
| Provide the main `/feedback` Codex session ID. | This project thread is the evidence trail for much of the core work. |
| For developer tools, include install instructions, supported platforms, and a judge test path. | The npm CLI, GitHub App setup, Vercel instance, and disposable-repository test path must be documented. |

The time constraint was four days. That made an honest, narrow, working loop more valuable than a large governance platform with fake or simulated integrations.

---

## 3. The original problem and initial idea

The initial idea was simple:

> AI coding spend is detached from the engineering work that caused it. Put a transparent price tag on the commits and pull requests that used Codex.

The early vision included two kinds of AI-assisted work:

1. a developer using Codex locally and later pushing the resulting code; and
2. autonomous agents running inside a repository or CI system.

The initial MVP decision was to focus first on the first case:

> Build the parts of Governor that analyze the estimated price of developer AI usage on code pushes and pull requests. Defer broader governance until that loop is real.

That choice produced the product’s central unit of value: the **cost receipt**.

A cost receipt answers:

- What did the Codex-assisted work attached to this branch or PR cost?
- Which models and token categories created that estimate?
- How confidently can Governor attach the usage to the Git work?
- Is there a cost pattern worth understanding?

It does **not** answer:

- What is the organization’s invoice total?
- Was a developer productive enough?
- Was a closed PR “waste”?
- What did the user prompt Codex to do?

---

## 4. Product thesis

### 4.1 One-line promise

**Every Codex dollar, attached to the work it produced.**

### 4.2 What Governor is

Governor is an engineering cost-control surface for AI-assisted software work. It joins prompt-safe Codex token metadata to signed Git context, calculates a transparent estimate using effective-dated model rates, and shows the result where engineering decisions already happen: GitHub pull requests and a repository dashboard.

### 4.3 What makes the approach credible

The product is deliberately evidence-first:

```text
Codex token metadata
        +
signed repository / branch / SHA / session context
        ↓
deterministic token-rate estimate
        ↓
GitHub receipt + private dashboard + observation
```

Governor never needs to read the prompt, the response, generated code, or repository file contents to make this connection.

### 4.4 Product principles

1. **Evidence over inference.** Show the repository, branch, commit, models, token counts, rate method, and confidence.
2. **Prompt-safe by architecture.** Prompts, responses, and generated code are intentionally outside the data model.
3. **Estimates are not invoices.** Use “estimated Codex cost” and “token-rate estimate,” never “actual bill.”
4. **GitHub-native delivery.** The PR comment and Check Run are primary artifacts, not an afterthought.
5. **Calm governance.** Observations are evidence-backed insights, not alerts, blame, or policy violations.
6. **Boring setup.** A user should need one GitHub App installation, one generated terminal command, and one real Codex turn.
7. **Narrow before broad.** Prove accurate receipt attribution before budgets, alerts, chargebacks, or policy enforcement.

---

## 5. Users and jobs to be done

| User | Primary job | What Governor gives them now |
| --- | --- | --- |
| Individual developer | Understand the estimated Codex cost of work on a branch or PR. | GitHub receipt, model/token breakdown, and confidence. |
| Engineering lead | See where AI-assisted development spend is occurring and inspect meaningful receipts. | Portfolio, repository dashboard, PR outcomes, and observations. |
| Platform / DevEx owner | Add cost transparency without collecting sensitive source or prompt content. | GitHub App + CLI integration with a strict data boundary. |
| Hackathon judge | Install/test a real developer tool and observe a verifiable outcome quickly. | Public sandbox, npm CLI, guided setup, disposable-repository test path. |

### Explicit non-users for this MVP

- Finance teams needing invoice reconciliation.
- Security teams wanting source inspection or surveillance.
- Organizations needing approvals, budget enforcement, or role-based chargeback.
- Teams asking Governor to decide whether a PR was valuable or whether a developer spent “too much.”

---

## 6. How the product evolved

Governor moved through a series of deliberate stages rather than appearing fully formed.

### Stage 1 — Narrowing the design document into a demoable MVP

The original design described a larger governance vision. The MVP was narrowed to the shortest real loop:

```text
Use Codex in a repository
    → push or open a PR
    → see an estimated receipt in GitHub
    → inspect it in Governor
```

This made “cost visibility tied to engineering work” the non-negotiable feature.

### Stage 2 — Establishing the GitHub receipt loop

The foundation added:

- a Next.js application;
- a GitHub App for webhook intake and PR/Check Run output;
- a GitHub OAuth App for private workspace access;
- Supabase/Postgres storage;
- model-rate calculation;
- PR receipt creation; and
- an initial public/dashboard experience.

Early validation used manual/synthetic usage records so that webhook delivery, receipt calculations, comment creation, and dashboard data could be proven independently of the harder Codex telemetry join.

### Stage 3 — Deploying the real integration

The application was deployed to Vercel at `https://governor-fawn.vercel.app`. The following were configured:

- Vercel environment variables;
- Supabase database;
- GitHub OAuth App;
- GitHub App, including repository installation and webhook delivery;
- app routes for OAuth, webhooks, receipts, and telemetry;
- a test repository and PR workflow.

Important integration bugs were found and corrected during this stage, including:

- a Next.js catch-all routing issue that caused `/api/auth/github/start` to time out;
- a GitHub webhook URL/folder mismatch that initially returned a Vercel 404;
- GitHub App event configuration confusion around push versus PR-related events;
- repository lookup and delivery-path issues; and
- production route and deployment verification problems.

The outcome was a real test PR with a Governor comment, a Check Run, and a receipt API response.

### Stage 4 — Replacing manual events with real Codex usage

The main technical risk was proving that real Codex usage could be connected to the real Git work without storing prompts.

The local integration introduced:

- a Governor CLI;
- Codex lifecycle hooks that capture signed Git context before each turn and after local shell work;
- a Codex OpenTelemetry export path that sends token metadata;
- a server-side join between the two streams; and
- a `verify` command that waits for a real context/usage match.

Several useful failures were diagnosed on the way:

- The notify hook could work while OTel usage was absent.
- The verifier could receive signed Git context yet see no matching usage event.
- Current Codex model IDs appeared that were not yet in Governor’s effective rate table.

Governor was updated to normalize current OTel shapes, wait correctly, diagnose missing joins, and support the observed Codex model IDs. Context is retained as timestamped history and each OTel record uses the context active when it occurred, preventing a long-lived Codex session from moving prior work onto a later branch. Streaming events update stored receipts, while GitHub publication happens once at a settled turn boundary rather than on every individual OTel event.

### Stage 5 — Validating a real multi-model PR

The core loop was tested with real file changes, commits, a branch, push, and PR. One validated receipt included multiple real Codex model lines and 27 usage events, for example:

```text
Estimated Codex cost: $0.40
27 usage events
100% exact context

gpt-5.5:      $0.27
gpt-5.4-mini: $0.11
gpt-5.6-luna: $0.01
```

The exact receipt total, model breakdown, GitHub PR comment, and dashboard all agreed. This is the strongest proof that Governor’s original core claim is real.

### Stage 6 — Making the tool installable by a new user

The CLI was published publicly as:

```text
@muzman123/governor
```

The user path changed from “clone Governor and run its scripts” to:

```powershell
npx --yes @muzman123/governor@latest connect --url https://YOUR_GOVERNOR_HOST --token gov_...
```

This was tested from a second GitHub account and repository:

```text
Install public GitHub App
    → clone a repository
    → use public npm CLI
    → connect local Codex
    → make Codex changes
    → push and open PR
    → see GitHub receipt and dashboard update
```

That full new-user loop worked.

### Stage 7 — Building the product surface

The project moved from an API/PR-comment demo to a recognizable product:

- landing page;
- public anonymized sandbox;
- OAuth-protected portfolio;
- repository dashboard;
- guided setup;
- settings;
- receipt detail;
- deterministic observations rendered as the product’s visible “AI moment.”

Frontend issues such as timestamp serialization and route/page state were found and corrected. The design direction became a calm, dark, developer-control surface rather than a generic financial dashboard.

### Stage 8 — Exploring agent and PR-outcome capability

An additional vertical slice was implemented:

- GitHub Actions-based Codex usage ingestion;
- repository-scoped agent tokens;
- a reusable composite Action;
- action context stamped with repository, branch, SHA, and workflow run;
- actor attribution in the data model; and
- PR lifecycle outcomes: open, merged, or closed without merge.

The backend work is useful future infrastructure, but the product decision is now:

> Do not make autonomous agents part of the visible Governor story until they deliver enough clear, differentiated value to justify their setup cost.

The current source removes the agent setup/actor panels and agent language from the frontend while retaining the backend capability for a later release. PR outcomes remain visible because they strengthen the developer-first receipt story on their own.

---

## 7. Current product definition

### 7.1 The current core loop

```text
1. Developer installs Governor GitHub App on a repository.
2. Developer signs in to Governor with GitHub.
3. Governor issues a one-time local telemetry command.
4. CLI safely connects the developer’s Codex configuration.
5. Developer completes a real Codex task in the repository.
6. Governor joins token metadata to signed Git context.
7. Developer pushes or opens/synchronizes a PR.
8. GitHub receives a Governor receipt / Check Run.
9. Governor dashboard and receipt detail show the same evidence.
```

### 7.2 The result a user receives

For a supported PR, Governor provides:

- estimated total Codex cost;
- event count;
- model-by-model input, cached-input, and output token counts;
- per-model estimated costs;
- attribution confidence;
- deterministic explanation and effective-rate method;
- a PR outcome state when applicable; and
- a factual Work context summary of the associated PR scope; and
- a calm observation when sufficient evidence exists.

### 7.3 The product boundary

Governor is a **receipt and understanding layer**, not a billing system or enforcement engine.

| Governor does | Governor does not do |
| --- | --- |
| Estimates usage using stored token counts and effective rates. | Reconcile vendor invoices or contracts. |
| Connects usage to Git work. | Inspect prompts, responses, code, or repository contents. |
| Transiently summarizes PR metadata and human PR/review discussion. | Store raw comments, file paths, diffs, or file contents. |
| Shows model mix, confidence, outcomes, and observations. | Declare a developer inefficient or a PR worthless. |
| Publishes a neutral GitHub comment and Check Run. | Block a merge or enforce a budget. |
| Explains structured evidence with GPT-5.6. | Let a model alter arithmetic, confidence, or evidence. |

---

## 8. Current user experience and information architecture

### 8.1 Route map

| Route | Audience | Current purpose |
| --- | --- | --- |
| `/` | Public | Landing page and GitHub connection CTA. |
| `/demo` | Public | Anonymized, seeded product tour. |
| `/app` | Authenticated | Portfolio overview across accessible, connected repositories. |
| `/app/setup` | Authenticated | Guided local Codex connection and verification. |
| `/app/repos/[owner]/[repo]` | Authenticated and authorized | Repository spend, model mix, PR outcomes, receipts, and activity. |
| `/app/repos/[owner]/[repo]/pulls/[number]` | Authenticated and authorized | Evidence page for one PR receipt. |
| `/app/settings` | Authenticated | GitHub identity, privacy boundary, token replacement, and logout. |

### 8.2 Landing page (`/`)

The landing page establishes the entire product thesis before requesting GitHub access.

#### Key copy and structure

- Eyebrow: **AI engineering spend, in context**.
- Headline: **Every Codex dollar, attached to the work it produced.**
- Supporting promise: transparent cost receipts on PRs and a calm, auditable view of AI development spend.
- Primary CTA: **Open your workspace** / GitHub OAuth.
- Secondary CTA: **View the public sandbox**.
- Privacy proof: token metadata plus Git context only; never prompts, responses, or generated code.

The final three-column explanation follows this sequence:

1. **Observe work** — token metadata plus repository/branch/commit/session context.
2. **Calculate clearly** — effective-dated rates and attribution confidence.
3. **Govern with context** — PR receipts plus patterns worth understanding.

### 8.3 Public sandbox (`/demo`)

The demo is intentionally safe for judges and visitors. It contains seeded, anonymized data only and no customer names, tokens, prompts, code, or real account data.

It displays:

- 7-day spend;
- 30-day spend;
- receipt count;
- attribution confidence;
- an example PR receipt;
- model/token line items;
- a PR outcome badge;
- a sample Governor observation; and
- a three-step “how it works” explanation.

The current demo story is developer-first:

```text
Developer uses Codex in a repository
    → Governor joins prompt-safe metadata to signed Git context
    → GitHub receives a receipt with cost, model mix, and PR outcome
```

### 8.4 Authenticated app shell

The private workspace uses a dark left sidebar on desktop and a compact header on small screens.

Desktop navigation includes:

- Governor wordmark;
- Overview;
- Setup;
- Settings;
- connected repository links;
- a persistent prompt-safe telemetry indicator; and
- signed-in GitHub identity.

The shell protects data server-side. Navigation visibility is not the access-control mechanism; each repository route verifies that the signed-in GitHub user can access that connected repository.

### 8.5 Portfolio overview (`/app`)

This page answers “what is happening across my connected repositories?”

#### Metrics

- 7-day estimated spend;
- 30-day estimated spend;
- active repository count;
- receipt count.

#### Content panels

- **Connected repositories** — each repository’s current health and 30-day estimate.
- **Integration health** — whether recent telemetry is flowing, with a setup recovery path.
- **Recent pull requests** — recent receipts across repositories.

The overview auto-refreshes every 30 seconds and has a manual refresh control.

### 8.6 Repository dashboard (`/app/repos/[owner]/[repo]`)

This is the operational dashboard for one repository.

#### Header

- repository slug;
- default branch;
- last activity timestamp;
- refresh control.

#### Metric row

- 7-day estimated spend;
- 30-day estimated spend;
- PR receipt count;
- average attribution confidence.

#### Analysis panels

| Panel | User value |
| --- | --- |
| Last 14 days | A simple spend trend based on stored, attributed usage. |
| Model mix | Input/output tokens and cost by model. |
| PR outcomes | Merged, closed-without-merge, and open receipt counts/costs; cost per merged PR. |
| Pull request receipts | Deep links to individual evidence pages. |
| Recent activity | Recent Codex work, model, branch, time, and per-event estimated cost. |

Agent-specific setup, labels, cost splits, and workflow references are deliberately absent from the current visible dashboard. If backend agent events exist later, aggregate total spend remains truthful, but the UI does not market or configure agent automation.

### 8.7 PR receipt detail (`/app/repos/[owner]/[repo]/pulls/[number]`)

This is Governor’s most important evidence page.

#### Header and identity

- repository slug;
- PR number and title;
- update timestamp;
- short commit SHA;
- direct “Open GitHub” link.

#### Cost hero

The hero displays:

- **Estimated Codex cost**;
- number of usage events;
- attribution confidence;
- PR outcome; and
- a confidence card explaining signed Git context.

#### Work context block

Below the cost hero, Governor shows one or two neutral sentences explaining the PR scope. It uses the PR title, repository description, changed-file metadata, and current non-bot human discussion/review text. Raw paths/comments are processed transiently and never stored; the receipt retains only the summary, aggregate category counts, sources, and a refresh fingerprint.

The language describes what the receipt is attached to. It never allocates dollars to files or categories, recommends a change, judges the work, or evaluates developer behavior.

#### Governor observation block

The observation block is visually distinct: indigo/teal, calm, and insight-oriented rather than red or alert-like.

When eligible, it contains:

- a concise title;
- one evidence-based explanation;
- baseline/evidence;
- estimated dollar impact when deterministically available;
- observation confidence; and
- calculation version.

When there is not enough history, Governor shows a quiet **gathering a baseline** state rather than inventing an insight.

#### Remaining receipt evidence

- PR outcome panel;
- model/token breakdown;
- deterministic calculation explanation;
- rate-method statement;
- privacy statement; and
- reusable prompt-safe notice.

### 8.8 Guided setup (`/app/setup`)

Setup makes the three separate connections understandable:

```text
GitHub App
    +
local Codex telemetry
    +
real-turn verification
```

The page guides users through:

1. installing the GitHub App;
2. running one generated `npx` command;
3. restarting Codex and completing a real task; and
4. waiting until Governor observes a signed Git-context/usage join.

The page can issue one raw local telemetry token. It shows the token only in the generated setup command, then requires deliberate replacement if it must be regenerated. Setup status checks every five seconds.

### 8.9 Settings (`/app/settings`)

Settings is intentionally small in the MVP. It covers:

- signed-in GitHub identity;
- the data boundary / privacy explanation;
- telemetry token recovery or replacement path; and
- logout / session invalidation.

---

## 9. Visual and interaction design

### 9.1 Design character

Governor uses a dark, calm, developer-control style:

- GitHub-native rather than consumer-finance themed;
- precise rather than flashy;
- evidence-first rather than alarm-first;
- compact enough for operational use;
- readable enough for a judge to understand quickly.

The visual voice should make the user feel: “I can inspect this number and understand where it came from.”

### 9.2 Color and semantic rules

| Visual treatment | Meaning |
| --- | --- |
| Deep charcoal/navy surfaces | Stable control surface and information density. |
| Teal | Healthy, connected, prompt-safe, or exact-context signals. |
| Indigo/teal observation card | A meaningful insight worth understanding. |
| Muted blue accents | Navigation, charts, and neutral interaction. |
| Warm closed-PR treatment | Outcome state, not a failure or waste verdict. |
| Red | Reserved for actual errors, not cost observations. |

### 9.3 Typography and hierarchy

- Large, high-contrast headlines establish the value proposition.
- Monetary estimates are prominent but always paired with qualifying copy.
- Eyebrows categorize sections without overwhelming the content.
- Monospace styling is limited to tokens, commands, SHA fragments, and technical evidence.
- Small muted copy provides rate, context, and privacy detail without competing with the main decision.

### 9.4 Responsive behavior

| Viewport | Current behavior |
| --- | --- |
| Desktop, above 980px | Sidebar, four metric cards, and two-column analytical panels. |
| 701px–980px | Narrower sidebar; two-column panels and metrics progressively collapse. |
| 700px and below | Sidebar hides; compact header appears; cards and detailed panels stack. |

Known mobile gaps remain: repository switching/navigation is incomplete, some dense data lacks a dedicated mobile table pattern, and charts do not yet have a text/table alternative.

### 9.5 Refresh behavior

| Surface | Behavior |
| --- | --- |
| Portfolio overview | Manual refresh plus 30-second polling. |
| Repository dashboard | Manual refresh plus 30-second polling. |
| Setup verification | Five-second polling. |
| Receipt detail | Updated on navigation/reload; no dedicated live stream. |
| Public demo | Static seeded data. |

WebSockets are intentionally not used in this release. The user benefit does not justify the added complexity yet.

---

## 10. System architecture

### 10.1 High-level architecture

```text
                         GitHub OAuth App
                       (sign-in and repo access)
                                  │
                                  ▼
Developer machine ──► Governor Next.js / Vercel ◄── GitHub App
 Codex + CLI            API routes + dashboard       push / PR webhooks
      │                         │                         │
      │ OTel token metadata     │                         │ PR comment
      │ signed Git context      ▼                         │ Check Run
      └──────────────────► Supabase / Postgres ◄─────────┘
                            events, rates,
                            contexts, PRs, receipts
```

### 10.2 Core components

| Component | Responsibility |
| --- | --- |
| Next.js 15 / React 19 app | Landing, demo, authenticated workspace, dashboards, API routes, webhook handling, and telemetry intake. |
| Vercel | Hosted application/API runtime. |
| Supabase/Postgres | Persistent repositories, developers, sessions, contexts, usage events, rates, PR metadata, and receipts. |
| GitHub App | Receives `push` and `pull_request` webhooks; writes PR comments and Check Runs. |
| GitHub OAuth App | Authenticates the user and supports authorized-repository filtering. |
| Governor CLI | Safely configures local Codex telemetry, dispatches Git context, and verifies a real join. |
| Codex notify hook | Captures session ID and Git context after a turn, without prompt content. |
| OTel receiver | Normalizes Codex token metadata and stores usage events. |
| Pricing engine | Selects effective-dated model rates and calculates an event estimate. |
| Receipt engine | Groups events by PR branch and computes the stored receipt. |
| Work-context builder | Sanitizes transient PR metadata/discussion, computes deterministic scope aggregates, and creates a privacy-safe fallback. |
| Observation engine | Produces deterministic evidence, thresholds, and impact estimates. |
| GPT-5.6 explainer | Optionally turns structured cost and Work context evidence into concise prose without controlling calculations. |

### 10.3 Deployment components

| Service | Current role |
| --- | --- |
| Vercel | Deployed web/API application. |
| Supabase | Hosted Postgres database. |
| GitHub | OAuth, App installation, webhooks, PR comments, Check Runs. |
| npm registry | Public CLI distribution. |

---

## 11. Developer telemetry and receipt data flow

### 11.1 One-time local connection

The developer receives a generated command from the setup page:

```powershell
npx --yes @muzman123/governor@latest connect \
  --url https://governor-fawn.vercel.app \
  --token gov_<one-time-token>
```

The CLI:

1. creates a timestamped backup of the Codex configuration;
2. creates Governor-managed local hook/dispatcher support;
3. preserves compatible existing Codex notification behavior;
4. configures token metadata export with prompt collection disabled;
5. refuses to overwrite an unrelated existing `[otel]` configuration; and
6. waits for a real verification event.

`--replace` is allowed only for a known Governor-managed connection. It does not overwrite a third-party OTel setup.

### 11.2 Signed Git-context flow

When Codex completes a turn, the Governor notify dispatcher collects only:

- Codex session/thread ID;
- GitHub repository slug derived from `origin`;
- current branch;
- current HEAD SHA; and
- timestamp.

If the work is not in a GitHub repository with a usable `origin`, the hook skips it rather than guessing.

### 11.3 Token-usage flow

Codex sends token metadata through OTel JSON traffic to Governor’s `/v1/logs` route. Governor normalizes:

- model ID;
- input tokens;
- cached-input tokens;
- output tokens;
- session ID; and
- timestamp.

Governor handles either arrival order:

```text
Git context first → hold it until matching usage arrives
Usage first       → hold it until matching context arrives
```

### 11.4 Verification

The CLI’s verification mode watches for a true join, not merely a successful HTTP response:

```text
Signed Git context received
        +
matching Codex usage event received
        ↓
Verified real Codex attribution
```

This distinction was important during development. It made missing notify-hook context, missing OTel export, and unsupported pricing/model problems visible rather than silently claiming success.

### 11.5 PR and push receipt flow

1. GitHub sends a signed `push` or `pull_request` webhook.
2. Governor validates the webhook signature.
3. Governor creates/updates the repository and PR record.
4. Governor finds attributed usage for the relevant branch.
5. Governor calculates cost and confidence by model.
6. Governor computes an eligible observation.
7. Governor stores the receipt.
8. Governor updates the GitHub PR comment or Check Run.
9. The dashboard renders the same stored result.

This design prevents the web UI and the GitHub comment from presenting different math.

---

## 12. Cost calculation, pricing, and confidence

### 12.1 Deterministic calculation

For each usage event:

```text
estimated cost =
  input tokens × input rate
  + cached-input tokens × cached-input rate
  + output tokens × output rate
```

Receipts sum the event estimates and group line items by model.

### 12.2 Effective-dated rates

Rates are stored by model and effective date. The selected rate date is retained with each event.

This is important because a later price-table update must not rewrite historical receipt math or make a previous GitHub comment irreproducible.

### 12.3 Attribution confidence

| Attribution method | Meaning | Presentation |
| --- | --- | --- |
| `hook_context` | Signed Git context matched to local Codex usage. | Exact context / normally 100% confidence. |
| `session_fallback` | Explicit session-file fallback path. | Confidence remains visible; not presented as exact. |
| `branch_inferred` | Reserved lower-certainty path. | Never represented as exact context. |
| `github_actions` | Dormant agent/CI ingestion route with repo/branch/SHA/workflow context. | Stored as exact, but not surfaced as a separate frontend story currently. |

### 12.4 User-facing language rules

Use:

- **Estimated Codex cost**
- **Transparent token-rate estimate**
- **Exact context** or **Inferred context**
- **Effective-dated token rates**

Avoid:

- “Actual bill”
- “Invoice total”
- “You overspent”
- “Governor analyzed your prompt”

---

## 13. Governor observations: the bounded AI moment

Raw cost receipts are useful, but observations are the product’s differentiating explanatory layer.

### 13.1 Candidate categories

| Category | Deterministic evidence needed |
| --- | --- |
| Low cache utilization | Current cache ratio, sufficient repository baseline, threshold, and impact estimate. |
| PR cost outlier | Current receipt cost plus sufficient comparable historical receipts. |
| Expensive model mix | Model share relative to receipt/repository context. |
| Low attribution confidence | Stored attribution evidence and confidence rule. |

### 13.2 Strict analytical contract

1. Code determines the category, baseline, threshold, evidence, confidence, and impact.
2. Governor suppresses a finding if there is not enough relevant historical data.
3. GPT-5.6 receives only aggregate structured evidence.
4. GPT-5.6 may produce concise explanatory copy.
5. GPT-5.6 cannot alter the category, calculated impact, rate math, baseline, or confidence.
6. The structured result is stored with the receipt so GitHub and the product agree.

### 13.3 Example

> **Low cache reuse increased estimated cost.** Cache utilization was 12% versus this repository’s 64% baseline; approximately $3.10 of this receipt was reprocessed context.

The tone is intentionally observational. A low cache ratio is not an incident, a performance judgment, or a policy violation.

---

## 14. Privacy, security, and access model

### 14.1 Governor never stores

- prompts;
- model responses;
- generated code;
- repository file contents;
- raw PR discussion/review comments;
- raw file paths or diff patches;
- raw GitHub OAuth tokens in the browser; or
- raw telemetry tokens after issuance.

### 14.2 Governor stores

- repository slug and GitHub App installation ID;
- branch and commit SHA;
- Codex session ID;
- model identifier;
- input, cached-input, and output counts;
- timestamps;
- selected rate date and estimated cost;
- attribution method and confidence;
- PR title/number/state/outcome;
- receipt JSON, deterministic observation data, and privacy-safe Work context summaries/aggregate categories; and
- encrypted server-side GitHub OAuth session material.

### 14.3 Authentication and authorization

- GitHub OAuth creates opaque HTTP-only, same-site session cookies.
- GitHub OAuth material is encrypted server-side in `web_sessions`.
- Logout invalidates the session.
- A repository appears only when both conditions are true:
  1. Governor has a connected repository record; and
  2. the signed-in GitHub user can access it through GitHub.
- Repository and receipt routes enforce the same server-side access rule.

### 14.4 Tokens

The local telemetry token is a credential. It must never be committed, pasted into an issue, included in screenshots, or recorded in a public terminal log.

Replacing the token revokes the old credential. This avoids a misleading “many valid personal tokens” state.

### 14.5 GitHub App permissions

Governor’s minimal intended GitHub App permissions are:

- **Checks:** read and write;
- **Pull requests:** read and write;
- **Metadata:** read-only.

Required subscriptions:

- `push`;
- `pull_request`.

Governor intentionally does not request repository contents-write permission for its core developer receipt feature.

---

## 15. Data model and key APIs

### 15.1 Core tables

| Table | Purpose |
| --- | --- |
| `repositories` | Governed repository slug, GitHub installation, default branch. |
| `developers` | GitHub identity plus hash of the local telemetry token. |
| `web_sessions` | Hashed session token and encrypted GitHub OAuth data. |
| `model_rates` | Effective-dated input, output, and cached-input rates. |
| `session_contexts` | Current signed local session-to-Git context join used for verification. |
| `session_context_history` | Timestamped context history used to select the branch/SHA active at an OTel event. |
| `usage_events` | Normalized usage, context, cost, model, and confidence evidence. |
| `pull_requests` | PR branch, SHA, state, outcome, comment ID, and timestamps. |
| `receipts` | Stored receipt JSON keyed by repository and PR. |
| `agent_tokens` | Dormant repository-scoped agent credentials; not part of current visible setup. |

### 15.2 Key route groups

| Group | Representative routes | Purpose |
| --- | --- | --- |
| OAuth/session | `/api/auth/github/start`, `/api/auth/github/callback`, `/api/auth/logout` | Sign in, callback handling, logout. |
| Workspace | `/api/app/me`, `/api/app/repositories`, `/api/app/setup/*` | Current identity, authorized repos, setup token/status. |
| GitHub | `/api/github/webhook` | Signed `push`/`pull_request` event handling and artifact publication. |
| Local telemetry | `/api/sessions/context`, `/api/sessions/finalize`, `/v1/logs`, `/api/verify` | Context intake, settled receipt publication, OTel usage intake, verification polling. |
| Receipts | `/api/repos/[owner]/[repo]/receipts`, `/api/prs/[number]/receipt` | Receipt data used by APIs/public views. |
| Future/dormant agent capability | `/api/ingest/actions`, `/api/ingest/actions/finalize`, agent-token route | CI usage ingestion; deliberately absent from the current frontend path. |

---

## 16. CLI and installation contract

### 16.1 Public distribution

The public package is intentionally scoped because the unscoped `governor` name is unavailable:

```text
@muzman123/governor
```

The package exposes the `governor` executable and requires Node.js 20 or newer.

### 16.2 User-facing commands

| Command | Purpose |
| --- | --- |
| `governor connect --url ... --token ...` | Safely connect a clean local Codex profile and begin real-turn verification. |
| `governor connect --replace --url ... --token ...` | Replace a known Governor-managed configuration only. |
| `governor verify --wait 180` | Verify an existing local connection by waiting for real work. |
| `governor capture --file session.jsonl` | Explicit session-file fallback for token metadata. |
| `governor hook '{...}'` | Internal notify-hook entry point. |

### 16.3 New-user developer journey

```text
1. Visit Governor and sign in with GitHub.
2. Install the GitHub App on the desired repository.
3. Open Governor Setup.
4. Copy the one-time npx command.
5. Run it on the developer machine.
6. Fully restart Codex.
7. Complete one real Codex task from the repository.
8. Wait for verification.
9. Push/open a PR.
10. Inspect the receipt in GitHub and Governor.
```

No clone of the Governor repository and no local `npm install` in the customer project is required.

---

## 17. Autonomous-agent capability: implemented, intentionally dormant

The project contains a future-facing GitHub Actions ingestion path. It is valuable engineering work, but it is not the visible product focus right now.

### What exists in the backend

- repository-scoped `gov_agent_...` credentials stored only as hashes;
- server validation that prevents a token from submitting cost to another repository;
- `codex exec --json` completion token filtering;
- workflow-run, repository, branch, and SHA attribution;
- receipt finalization after workflow ingestion;
- actor metadata in usage events; and
- a composite GitHub Action at `.github/actions/governor-capture/action.yml`.

### What the current frontend intentionally omits

- agent token creation UI;
- agent onboarding instructions;
- agent versus developer cost split;
- agent labels in activity feeds;
- agent language in the public sandbox; and
- agent contribution panels on receipt detail.

### Why this decision was made

The local developer loop already delivers immediate, easy-to-understand value. The CI-agent path introduces more setup, security, secret-management, and product explanation than its current visible benefit justifies.

The correct near-term product position is:

> Governor is the best way to understand the cost of developer Codex work attached to GitHub engineering work.

The agent capability can return later when it supports a sharper differentiator, such as robust CI-agent cost visibility tied to PR outcomes, without making onboarding harder for the core customer.

---

## 18. What has been validated

### 18.1 Real end-to-end proof

The developer-first path has been validated with:

- real Codex tasks that edited files;
- multiple Codex model IDs in a single PR;
- multiple events across sessions;
- real branches, commits, pushes, and pull requests;
- GitHub App webhook deliveries;
- GitHub PR receipt comments;
- GitHub Check Runs;
- receipt API/dashboard updates;
- public npm CLI installation; and
- a separate GitHub account and new test repository.

### 18.2 Automated validation

The current test suite includes coverage for:

- webhook signature validation;
- idempotent ingestion;
- context-before-usage and usage-before-context joins;
- context-history attribution across a branch switch in one Codex session;
- open-PR-only telemetry receipt refreshes and settled GitHub publication;
- current Codex OTel token fields;
- timestamp normalization;
- effective rate selection and unsupported-model rejection;
- model aliases and rate coverage;
- verification semantics;
- PR/push receipt behavior;
- observation eligibility and baseline suppression;
- dashboard Date timestamp regression;
- PR merged and closed-without-merge outcomes;
- repository-scoped agent token isolation; and
- Actions JSONL completion-record privacy filtering.

Latest local verification after the frontend simplification:

```text
TypeScript:       passed
Automated tests:  21 passed
Production build: passed
Public demo QA:   checked locally in browser
```

---

## 19. Current deployment and release status

### Operational assets

| Asset | Status |
| --- | --- |
| Vercel deployment | Hosted at `https://governor-fawn.vercel.app`. |
| Supabase database | Configured for the operational MVP. |
| GitHub OAuth App | Configured for private workspace sign-in. |
| GitHub App | Publicly installable and validated in test repositories. |
| npm CLI | Published publicly as `@muzman123/governor@0.1.2`. |
| Developer E2E flow | Validated with real Codex work and a new GitHub account/repository. |

### Important source/deployment distinction

The latest local source includes a deliberate frontend simplification that hides autonomous-agent UI. That work is currently an uncommitted working-tree change and will not change the hosted Vercel site until it is reviewed, committed, pushed, and deployed.

The backend agent vertical slice may also require the additive `db:init` schema migration in any environment where its new columns/tables have not yet been applied. The core developer receipt flow remains the primary release path.

### Required environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase/Postgres connection string. |
| `GOVERNOR_URL` | Public Governor base URL. |
| `GOVERNOR_SESSION_SECRET` | Encrypts server-side GitHub session data; use at least 32 random bytes. |
| `GITHUB_APP_ID` | GitHub App identity. |
| `GITHUB_PRIVATE_KEY` | GitHub App private key. |
| `GITHUB_WEBHOOK_SECRET` | Webhook signature validation. |
| `GITHUB_APP_SLUG` | GitHub App installation/manage links. |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth client identity. |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth secret. |
| `GITHUB_OAUTH_STATE_SECRET` | OAuth state protection. |
| `OPENAI_API_KEY` | Optional GPT-5.6 receipt explanation generation. |
| `OPENAI_EXPLAINER_MODEL` | Optional explainer-model override. |

### Database initialization

```powershell
$env:DATABASE_URL = "YOUR_SUPABASE_CONNECTION_STRING"
npm run db:init
```

The schema initializer is migration-safe for the additive agent/outcome columns and tables, seeds rates, and creates public demo data.

---

## 20. Honest MVP limitations and current UX debt

### Product limitations

1. Estimates are transparent but are not invoice totals. Credits, enterprise pricing, contracts, and vendor adjustments are out of scope.
2. Governor supports Codex only in this MVP; it is not a general multi-provider cost platform.
3. Observations require history. Governor must not manufacture baselines from one or two receipts.
4. No budgets, alerts, enforcement, approvals, or chargeback exist.
5. No organization workspaces, roles, team allocation, or cost exports exist.
6. GitHub App installation works without Marketplace listing, but onboarding can be smoother and more self-explanatory.

### Local-connection constraints

1. One Codex configuration profile supports one active Governor identity at a time.
2. Governor refuses to overwrite an unrelated existing `[otel]` configuration instead of attempting unsafe automatic merging.
3. Node/npm, Git, Codex, a GitHub `origin`, and at least one commit are prerequisites.
4. A raw setup token can still be exposed through screen sharing or terminal history if the user mishandles it.

### Frontend debt

1. Error states still rely too much on generic Next.js error rendering rather than product-specific recovery pages.
2. Loading states are mostly text-level; there are no polished skeleton/loading shells.
3. Dashboard has no time-range selector, filtering, search, export, or drill-down.
4. Charts need accessible textual/table alternatives.
5. Mobile navigation does not yet make repository switching and settings fully complete.
6. Effective-rate detail is described but not displayed as a complete per-model historical rate table.
7. The README and older agent design document should be reconciled before a public product release, because agent capability is now intentionally absent from the frontend story.

### Release hygiene

- The current npm package works, but its `bin` field should be normalized to an explicit `{ "governor": "..." }` object before the next publish to remove npm’s auto-correction warning.
- The source documentation should use the privacy-safe JSONL redirection form for future agent examples rather than printing full JSONL through `tee` into GitHub Actions logs.
- The current frontend simplification should be committed and deployed once the product direction is confirmed.

---

## 21. What Codex and GPT-5.6 contributed

### Codex collaboration

Codex accelerated:

- project architecture;
- TypeScript implementation;
- Next.js route construction;
- database schema and store layer;
- GitHub App/OAuth/webhook integration;
- CLI design and safe configuration behavior;
- OpenTelemetry ingestion and normalization;
- pricing, receipt, and confidence test design;
- frontend components and visual QA;
- debugging live deployment, routing, webhook, and telemetry issues; and
- documentation and demo readiness.

### Human product and engineering decisions

The human product direction determined:

- the developer-first MVP scope;
- the privacy architecture;
- the insistence on real E2E validation instead of a mock receipt demo;
- the decision to call all amounts estimates rather than invoices;
- the observation-as-insight tone;
- the preference for GitHub artifacts over a dashboard-only product; and
- the decision to hide autonomous-agent UX until its value clearly outweighs its complexity.

### GPT-5.6 in the product

GPT-5.6 is not trusted with finance or governance decisions. It is optionally used to turn already-calculated structured receipt/observation evidence into short, readable explanatory copy.

It cannot change:

- rate math;
- the selected model rate;
- receipt total;
- observation category;
- baseline;
- impact estimate; or
- confidence.

This is the intended hackathon “AI moment”: useful language on top of auditable deterministic evidence.

---

## 22. Recommended three-minute demo narrative

### 0:00–0:20 — The problem

Show a normal PR and explain:

> Codex spend usually lives in an account-level usage page. It does not tell an engineering lead which pull request created the cost or how confident that attribution is.

### 0:20–0:45 — The promise and privacy boundary

Show the landing page or demo.

> Governor attaches transparent estimated Codex cost receipts to GitHub work. It only stores token metadata and Git context—never prompts, responses, or generated code.

### 0:45–1:20 — The setup

Show:

1. GitHub App installed on a disposable repository.
2. Governor Setup generating one `npx` command.
3. The command/verification state.

Keep the explanation simple:

> Governor connects Codex token metadata to a signed repository, branch, and commit context. The verification step proves that join with one real task.

### 1:20–1:55 — The proof

Show a branch where Codex made a real change, then the resulting GitHub PR comment.

Call out:

- estimated total;
- model lines;
- token counts;
- exact-context confidence; and
- no prompts/code stored.

### 1:55–2:30 — The dashboard and receipt evidence

Open the repository dashboard, then the receipt detail.

Show:

- spend trend;
- model mix;
- PR outcome;
- deterministic calculation panel; and
- the Governor observation block.

### 2:30–3:00 — The AI moment and close

Show a sample or real observation.

> GPT-5.6 explains structured evidence, but it cannot change the calculation. Governor’s job is not to judge developers—it is to make AI engineering spend understandable in the context of the work it produced.

End with the GitHub receipt and privacy boundary.

---

## 23. Submission checklist

### Product and repository

- [ ] Confirm public Vercel URL is healthy.
- [ ] Confirm GitHub App install link works from a separate account.
- [ ] Confirm GitHub OAuth callback points to production.
- [ ] Confirm Supabase schema and rates are initialized.
- [ ] Confirm the public npm CLI resolves with `npx --yes @muzman123/governor@latest`.
- [ ] Commit/deploy the frontend simplification if it is the final product decision.
- [ ] Ensure README instructions match the developer-first visible product.
- [ ] Include clear supported-platform notes: Node.js 20+, Git, Codex, GitHub repository, and a modern browser.

### Judge test path

- [ ] Public sandbox works without sign-in.
- [ ] Disposable repository path is documented.
- [ ] GitHub App permissions/subscriptions are listed.
- [ ] Setup command can be copied and run from a clean machine/profile.
- [ ] Real Codex verification is explained.
- [ ] PR comment and Check Run are demonstrated.

### Written submission

- [ ] Choose **Developer Tools**.
- [ ] Use the one-line promise and privacy boundary in the project description.
- [ ] Explain that cost is estimated from transparent token rates, not invoice reconciliation.
- [ ] Describe Codex collaboration and the human decisions in the README.
- [ ] Provide the major Codex `/feedback` session ID.
- [ ] Link the public repository and public YouTube demo.

### Video

- [ ] Keep under three minutes.
- [ ] Use clear audio.
- [ ] Show a real PR receipt, not only static mockups.
- [ ] Explain how Codex and GPT-5.6 contributed.
- [ ] Include the privacy boundary and estimate disclaimer.

---

## 24. Prioritized next steps

### Priority 1 — Finish and ship the developer-first story

1. Commit, push, and deploy the frontend removal of agent UX.
2. Update README and product docs to make the developer path the obvious default.
3. Polish setup failure/recovery states.
4. Add a clear post-verification “you are ready” state that links directly to the connected repository.
5. Record the three-minute demo while the E2E loop is working.

### Priority 2 — Make the evidence experience more useful

1. Improve comparable-PR cohort selection for observations.
2. Add a visible effective-rate/date detail to receipt calculations.
3. Add observation history or acknowledgement once users have enough receipts.
4. Add dashboard filters/date ranges and a small export story.
5. Improve error boundaries, empty states, and mobile navigation.

### Priority 3 — Re-evaluate autonomous-agent support only when justified

Before returning agent capability to the frontend, prove a strong answer to:

> Why would a developer or lead accept the additional Actions secret and workflow complexity?

Potential future answers include:

- a truly useful CI-agent cost receipt on review/fix workflows;
- clear cost split tied to PR outcomes;
- robust trusted-runner security model;
- GitHub OIDC or safer short-lived credentials;
- meaningful agent-specific observations; or
- team-level automation cost reporting.

Until then, keep this capability in the backend and keep the visible product simple.

### Priority 4 — Team governance only after receipt trust

- organization workspaces and roles;
- repository groups;
- budgets and non-blocking spend targets;
- Slack/email summaries;
- allocation/export flows; and
- approval/policy workflows.

---

## 25. Definition of success

Governor succeeds as this MVP when a technically competent new user can:

1. install the GitHub App on a repository;
2. sign in to Governor;
3. run one generated `npx` command;
4. complete one real Codex task;
5. see verified attribution;
6. push and open a PR; and
7. understand the resulting estimated cost receipt in GitHub and Governor without exposing prompts or code.

That core developer-first success condition has been demonstrated end to end.

The next job is not to add more platform surface area. It is to make this proof easy for a judge to see, easy for a developer to install, and memorable as a product: **AI engineering spend, attached to the work it produced.**
