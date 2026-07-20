# Governor Agent + PR Outcomes Design

**Version:** 1.1  
**Status:** Implemented vertical slice; deployment migration and npm publish still required  
**Date:** July 20, 2026

## Objective

Extend Governor from developer-only Codex receipts to an engineering-cost control surface that can answer two additional questions:

1. **Was the AI-assisted work performed by a developer or an autonomous CI agent?**
2. **What happened to the pull request that absorbed that estimated cost?**

The result is not an ROI claim and not an automatic “waste” classifier. It is an auditable causal chain:

```text
Developer or GitHub Actions Codex run
        -> prompt-safe token metadata
        -> repository / branch / SHA / PR attribution
        -> estimated receipt with actor split
        -> PR merged, closed without merge, or still open
```

## Product decisions

| Decision | Rationale |
| --- | --- |
| Agents use repository-scoped credentials, not developer laptop tokens. | A runner must never gain authority to submit cost for another repository or break a developer’s local Codex connection. |
| GitHub Actions events have confidence `1.0`. | The Action requires repository, branch, SHA, workflow run ID/URL, workflow name, and a credential scoped to the repository. |
| `closed_unmerged` is an outcome, not “waste.” | A closed PR can contain valuable learning, review, or experimentation. Governor reports evidence without a false value judgment. |
| Actor splits are deterministic. | Cost is summed from stored event `actorType`; no model inference decides whether a human or agent performed work. |
| The Action consumes JSONL after Codex, rather than executing Codex itself. | Governor stays a transparent receipt tool and does not own the customer’s AI credential, task prompt, sandbox, or code-modification policy. |

## Non-goals for this release

- No budgets, spend caps, Slack messages, or policy enforcement.
- No automatic PR merge/revert action.
- No claim that merged PR cost is a measure of business value.
- No support for arbitrary non-GitHub CI metadata sources.
- No persistent ingestion of Codex transcripts, prompts, output text, tool calls, or source code.
- No GitHub OIDC exchange yet. The agent credential is a repository secret stored in GitHub Actions.

## Data model

### Usage events

Existing human events remain valid. New columns are additive and default existing records to `developer`.

| Field | Human developer event | GitHub Actions agent event |
| --- | --- | --- |
| `source` | `otel`, `session_file`, or `manual` | `github_actions` |
| `developer_id` | Present | Empty |
| `actor_type` | `developer` | `agent` |
| `actor_name` | GitHub login when available | Workflow label |
| `workflow_run_id` | Empty | Required |
| `workflow_run_url` | Empty | Required HTTPS URL |
| `workflow_name` | Empty | Required |
| `repository_id` | Joined from signed hook context or fallback | Directly scoped by agent token |
| `branch`, `head_sha` | Signed hook/fallback context | Required Actions context |
| `attribution_method` | `hook_context`, `session_fallback`, or `branch_inferred` | `github_actions` |
| `attribution_confidence` | Existing confidence rules | `1.0` |

### Agent tokens

`agent_tokens` is a new table with:

- token ID;
- repository ID;
- display label;
- SHA-256 token hash only;
- issuing developer;
- created, revoked, and last-used times.

Issuing a new token for a repository revokes any previous active token for that repository. Governor returns the raw `gov_agent_...` token once, and the user saves it as the `GOVERNOR_AGENT_TOKEN` GitHub Actions secret.

### Pull requests and receipts

`pull_requests` gains:

- `outcome`: `open`, `merged`, or `closed_unmerged`;
- `merged_at`;
- `closed_at`.

Each stored receipt gains a snapshot of:

- actor breakdown (`Developer-assisted` and/or `Autonomous agent`);
- PR outcome;
- outcome timestamp.

Embedding these facts in the receipt ensures the GitHub comment, receipt API, receipt detail page, and dashboard all show one consistent result.

## GitHub Actions ingestion contract

### Required Action inputs

| Input | Why it is required |
| --- | --- |
| `governor-url` | Target Governor deployment. |
| `token` | Repository-scoped secret; passed as an environment variable, never as a CLI argument. |
| `session-file` | JSONL emitted by `codex exec --json`. |
| `model` | The model used by the run. Codex’s documented `turn.completed.usage` object does not always carry model identity. |
| `branch` | PR source branch or current ref. |
| `sha` | PR head SHA or current GitHub SHA. |

The composite Action adds runtime-derived metadata itself:

- `GITHUB_REPOSITORY`;
- `GITHUB_RUN_ID`;
- `GITHUB_SERVER_URL/.../actions/runs/...`;
- `GITHUB_WORKFLOW`;
- `GITHUB_ACTOR`.

### JSONL privacy filter

The CLI reads every line only to locate records containing usable `usage`/`token_usage` counts. It uploads an object containing only:

- stable event key;
- session/thread ID when present;
- model;
- input, cached-input, and output token counts;
- occurrence time;
- repository, branch, SHA;
- workflow metadata.

All other JSONL records—including agent messages—and all fields not listed above are excluded from the request payload.

### Server validation

`POST /api/ingest/actions`:

1. Reads Bearer token.
2. Resolves active hashed agent token.
3. Validates strict required context with Zod.
4. Resolves the supplied repository slug.
5. Rejects a slug that does not match the token’s repository ID.
6. Resolves effective token rate.
7. Stores a `github_actions` event with `actorType: agent`, `attributionMethod: github_actions`, and confidence `1`.
8. Marks the agent token as used only when a new event is inserted.

The endpoint does not accept a developer token as an agent credential.

## CLI contract

Existing human commands remain unchanged:

```text
governor connect
governor join
governor verify
governor hook
governor capture --file <session.jsonl>
```

Actions mode is selected by providing `--repository`:

```text
governor capture \
  --file <codex-exec.jsonl> \
  --repository <owner/repo> \
  --branch <branch> \
  --sha <head-sha> \
  --model <model> \
  --workflow-run-id <id> \
  --workflow-run-url <https-url> \
  --workflow-name <name>
```

For Actions mode, `GOVERNOR_URL` and `GOVERNOR_AGENT_TOKEN` may supply the endpoint/credential. This avoids exposing the agent credential in a shell command’s argument list or logs.

The CLI exits nonzero when:

- no usable token-usage record exists;
- JSONL is malformed;
- required Actions metadata is missing;
- an upload is rejected.

Idempotency uses a hash of the eligible record plus repository/workflow context, so workflow retries do not duplicate spend.

After a successful Actions capture, the CLI calls the authenticated receipt-finalization endpoint once. Governor rebuilds and republishes any known PR receipt on that branch. This avoids a timing gap where a review-only agent run finishes after the initial `pull_request` webhook and does not create a later push.

## Reusable Action

The composite Action lives at:

```text
.github/actions/governor-capture/action.yml
```

Customer workflow usage after this repository is pushed:

```yaml
- uses: muzman123/Governor/.github/actions/governor-capture@main
  with:
    governor-url: https://YOUR_GOVERNOR_HOST
    token: ${{ secrets.GOVERNOR_AGENT_TOKEN }}
    session-file: ${{ runner.temp }}/codex.jsonl
    model: gpt-5.6
    branch: ${{ github.head_ref || github.ref_name }}
    sha: ${{ github.event.pull_request.head.sha || github.sha }}
```

`examples/governor-codex-agent.yml` provides the full trusted-runner example using `codex exec --json` followed by the capture Action.

## PR outcome lifecycle

Governor already receives `pull_request` webhooks. The handler now processes `closed` in addition to open/reopen/synchronize/edit.

| GitHub payload | Stored outcome | Receipt behavior |
| --- | --- | --- |
| PR is open | `open` | Receipt remains live and can update on synchronization. |
| `state: closed`, `merged: true` | `merged` | Receipt snapshot and existing Governor PR comment update. |
| `state: closed`, `merged: false` | `closed_unmerged` | Receipt snapshot and existing Governor PR comment update. |
| Reopened | `open` | Outcome is reset to open on the new PR lifecycle. |

Repository metrics aggregate:

- merged PR count and estimated cost;
- closed-without-merge PR count and estimated cost;
- still-open count;
- estimated cost per merged PR.

The denominator is number of recorded merged PR receipts, not amount of business value, lines changed, or developer performance.

## User experience

### Repository dashboard

New panels make the differentiation visible without hiding the established spend/model evidence:

- **Who did the work:** developer-assisted vs autonomous-agent estimated cost and event count.
- **PR outcomes:** merged, closed-without-merge, open, and cost per merged PR.
- **Recent activity:** labels agent activity and workflow context distinctly.
- **Autonomous agents:** create/replaces a repository token, shows the one-time secret, links to GitHub Actions Secrets, and gives a copyable Action snippet.

### Receipt detail and GitHub comment

Receipts show:

- actor-level cost/event split;
- PR outcome badge and neutral explanation;
- existing model token line items, confidence, deterministic calculation, privacy boundary, and Governor observation.

The PR comment includes actor split and outcome along with its existing total, event count, model lines, observation, and disclaimer.

### Public demo

The seeded sandbox now visibly shows one developer-assisted event, one autonomous-agent event, and a merged PR outcome. This makes the full product thesis demonstrable without revealing a real customer repository.

## Deployment runbook

1. Deploy the application code.
2. Apply migration once against the production Supabase database:

   ```powershell
   $env:DATABASE_URL = "YOUR_SUPABASE_CONNECTION_STRING"
   npm run db:init
   ```

3. Publish the updated public CLI package from `packages/cli`:

   ```powershell
   npm publish --access public
   ```

   The source package version for this release is `@muzman123/governor@0.1.2`.

4. Push the repository so GitHub can resolve the composite Action path.
5. In a governed repository, create the agent token from its Governor dashboard and save it as `GOVERNOR_AGENT_TOKEN`.
6. Add the sample workflow, use a disposable trusted PR, and verify:
   - one agent event appears;
   - the receipt splits developer/agent cost;
   - merged or closed webhook updates outcome;
   - dashboard metrics agree with receipt and GitHub comment.

## Tests implemented

- Existing human hook-context, session fallback, late-context, pricing, observation, dashboard, and webhook tests remain green.
- Repository-scoped agent token test confirms exact Actions attribution and rejects cross-repository use.
- Webhook test confirms merged and closed-unmerged receipt outcomes and cost-per-merged aggregation.
- CLI integration test launches a local fake Governor endpoint, feeds a Codex `exec --json`-shaped fixture, and verifies that only the completion token usage and deterministic workflow context are uploaded.
- Type check, production build, CLI syntax test, and npm package dry-run succeed.
