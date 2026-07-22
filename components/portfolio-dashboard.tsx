import Link from "next/link";
import type { ModelBreakdown, RepositoryOverview, SpendPoint } from "@/lib/types";
import { AutoRefresh } from "./live-refresh";
import { EmptyState, MetricCard, PageHeader, WorkContextInline } from "./governor-ui";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

export function PortfolioDashboard({ items }: { items: RepositoryOverview[] }) {
  const spend7 = items.reduce((sum, item) => sum + item.metrics.spend7d, 0);
  const spend30 = items.reduce((sum, item) => sum + item.metrics.spend30d, 0);
  const receipts = items
    .flatMap((item) => item.receipts.map((receipt) => ({ ...receipt, repo: item.repo })))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const trend = mergeSpendTrend(items);
  const models = mergeModelSpend(items);

  if (!items.length) {
    return <><PageHeader eyebrow="Overview" title="Overview" action={<Link className="button button-primary" href="/app/setup">Connect repository</Link>} /><EmptyState /></>;
  }

  return <>
    <PageHeader eyebrow="Workspace" title="Overview" description="Shared spend and receipts across connected repositories." action={<div className="header-actions"><AutoRefresh/><Link className="button button-primary" href="/app/setup">Connect repository</Link></div>} />

    <section className="metrics-grid portfolio-metrics">
      <MetricCard label="7-day estimate" value={money(spend7)} />
      <MetricCard label="30-day estimate" value={money(spend30)} />
      <MetricCard label="Active repositories" value={String(items.length)} />
      <MetricCard label="PR receipts" value={String(receipts.length)} tone="good" />
    </section>

    <section className="two-column dashboard-top portfolio-dashboard-top">
      <PortfolioSpendTrend points={trend} />
      <PortfolioModelMix models={models} />
    </section>

    <section className="panel workspace-receipts portfolio-receipts">
      <div className="panel-heading"><div><div className="eyebrow">Recent pull request receipts</div><h2>Receipts attached to repository work</h2></div><Link className="quiet-link" href={receipts[0] ? `/app/repos/${receipts[0].repo.slug}` : "/app"}>View repositories <span aria-hidden="true">→</span></Link></div>
      {receipts.length ? <div className="portfolio-list">
        {receipts.slice(0, 8).map((item) => <Link className="portfolio-row" key={`${item.repo.id}-${item.prNumber}`} href={`/app/repos/${item.repo.slug}/pulls/${item.prNumber}`}>
          <div><strong>{item.repo.slug} <span>#{item.prNumber}</span></strong><small>{item.title}</small><WorkContextInline context={item.workContext} /></div>
          <div><strong>{money(item.totalCost)}</strong><small>{item.eventCount} usage events</small><small className="receipt-calculation">Exact calculation</small></div>
          <span aria-hidden="true">→</span>
        </Link>)}
      </div> : <div className="chart-empty">No pull-request receipts yet. Work with Codex on a branch, then push and open a pull request.</div>}
      <p className="panel-note">Calculations are derived from recorded token usage and effective rates.</p>
    </section>

    <section className="portfolio-support-grid">
      <section className="panel repository-panel"><div className="panel-heading"><div><div className="eyebrow">Connected repositories</div><h2>Open a live repository view</h2></div></div><div className="repository-overview-list">{items.map((item) => <Link className="repository-overview-row" key={item.repo.id} href={`/app/repos/${item.repo.slug}`}><div><strong>{item.repo.slug}</strong><small>{item.telemetryHealthy ? "Recent telemetry is flowing" : "Waiting for the first attributed Codex turn"}</small></div><div><strong>{money(item.metrics.spend30d)}</strong><small>30-day estimate</small></div><span aria-hidden="true">→</span></Link>)}</div></section>
      <section className="panel attention"><div className="eyebrow">Integration health</div><h2>{items.every((item) => item.telemetryHealthy) ? "Telemetry is flowing" : "Finish your first verified turn"}</h2><p>{items.every((item) => item.telemetryHealthy) ? "Governor has recently joined Codex usage to signed Git context." : "Run verification from Setup, then complete one real Codex task in a connected repository."}</p><Link className="text-button" href="/app/setup">View setup status <span aria-hidden="true">→</span></Link></section>
    </section>
  </>;
}

function mergeSpendTrend(items: RepositoryOverview[]): SpendPoint[] {
  const byDate = new Map<string, number>();
  for (const item of items) for (const point of item.spendTrend) byDate.set(point.date, (byDate.get(point.date) ?? 0) + point.costUsd);
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, costUsd]) => ({ date, costUsd }));
}

function mergeModelSpend(items: RepositoryOverview[]): ModelBreakdown[] {
  const byModel = new Map<string, ModelBreakdown>();
  for (const item of items) for (const model of item.modelSpend) {
    const current = byModel.get(model.model) ?? { model: model.model, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, costUsd: 0 };
    current.inputTokens += model.inputTokens;
    current.outputTokens += model.outputTokens;
    current.cachedInputTokens += model.cachedInputTokens;
    current.costUsd += model.costUsd;
    byModel.set(model.model, current);
  }
  return [...byModel.values()].sort((a, b) => b.costUsd - a.costUsd);
}

function PortfolioSpendTrend({ points }: { points: SpendPoint[] }) {
  const max = Math.max(...points.map((point) => point.costUsd), 0.01);
  return <section className="panel portfolio-trend-panel"><div className="panel-heading"><div><div className="eyebrow">Spend trend / last 14 days</div><h2>Estimated Codex spend</h2></div><span className="muted">Recorded daily total</span></div>{points.length ? <div className="portfolio-chart">{points.map((point) => <div className="portfolio-chart-column" key={point.date}><strong>{money(point.costUsd)}</strong><div className="portfolio-bar" style={{ height: `${Math.max(10, point.costUsd / max * 155)}px` }} /><small>{point.date.slice(5)}</small></div>)}</div> : <div className="chart-empty">Spend will appear after the first attributed turn.</div>}</section>;
}

function PortfolioModelMix({ models }: { models: ModelBreakdown[] }) {
  const max = Math.max(...models.map((model) => model.costUsd), 0.01);
  return <section className="panel portfolio-model-panel"><div className="panel-heading"><div><div className="eyebrow">Model mix</div><h2>Where spend came from</h2></div></div>{models.length ? <div className="model-list">{models.map((model) => <div key={model.model} className="model-row"><div><strong>{model.model}</strong><small>{money(model.costUsd)}</small></div><div className="model-meter"><span><i style={{ width: `${Math.max(8, model.costUsd / max * 100)}%` }} /></span></div></div>)}</div> : <div className="chart-empty">Model mix will appear after telemetry arrives.</div>}</section>;
}
