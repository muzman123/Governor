# Governor frontend audit

## Scope

Reviewed the public landing page plus the authenticated workspace source: Overview, repository dashboard, PR receipt detail, Setup, Settings, navigation, and shared UI components.

## Evidence

- `01-home.png`: accepted full-page capture of `http://localhost:3001/`.
- `02-app-entry.png`: not captured; `/app` redirected to GitHub authentication and the in-app browser blocked the external navigation.

## Findings

1. The landing page says “engineering teams” and “connected repository work,” but it does not explicitly explain that the repository is the shared unit of spend, receipts, and budgets.
2. `/app` is technically a portfolio aggregator across all accessible repositories, while `/app/repos/:owner/:repo` is the actual whole-repository FinOps surface. The navigation does not make that distinction clear.
3. The repository dashboard has strong FinOps evidence—monthly budget, burn/forecast, spend trend, model mix, spend by PR label, outcomes, receipts, observations, and activity—but the shared/team framing is mostly implicit.
4. Backend data already computes actor/source breakdowns, but the current frontend does not show contributors or developer-assisted versus autonomous-agent spend on the portfolio, repository, or receipt detail screens.
5. Setup describes installing the GitHub App and connecting one Codex profile, but does not say “install once per repository; each contributor connects their own Codex profile; all attributed work rolls into the shared repository dashboard.”
6. Settings is intentionally minimal, but offers no workspace/repository access explanation. That is fine for a personal settings page, but it reinforces the impression that Governor is account-centric rather than repository-centric.

## Verdict

Governor currently communicates “AI cost receipts for a developer” more strongly than “shared FinOps for a repository.” The underlying repository aggregation is present; the collaborative product story is not surfaced strongly enough in the frontend.
