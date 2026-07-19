import Link from "next/link";
import type { RepositoryOverview } from "@/lib/types";
import { AutoRefresh } from "./live-refresh";
import { EmptyState, MetricCard, PageHeader } from "./governor-ui";

const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(value);
const confidence=(value:number)=>value>=.95?"Exact context":"Inferred context";

export function PortfolioDashboard({items}:{items:RepositoryOverview[]}) {
  const spend7=items.reduce((sum,item)=>sum+item.metrics.spend7d,0);
  const spend30=items.reduce((sum,item)=>sum+item.metrics.spend30d,0);
  const receipts=items.flatMap((item)=>item.receipts.map((receipt)=>({...receipt,repo:item.repo}))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  if(!items.length) return <><PageHeader eyebrow="Engineering spend control" title="Your AI engineering workspace" description="Connect a repository to see Codex spend in the context of pull requests."/><EmptyState/></>;
  return <>
    <PageHeader eyebrow="Engineering spend control" title="Your AI engineering workspace" description="Live, repository-level token-rate estimates with signed Git context." action={<AutoRefresh/>}/>
    <section className="metrics-grid"><MetricCard label="7-day estimated spend" value={money(spend7)} detail="Across connected repositories"/><MetricCard label="30-day estimated spend" value={money(spend30)} detail="Transparent token-rate estimate"/><MetricCard label="Active repositories" value={String(items.length)} detail="GitHub-authorized access"/><MetricCard label="Receipts posted" value={String(receipts.length)} detail="Attached to pull-request work" tone="good"/></section>
    <section className="two-column">
      <section className="panel"><div className="panel-heading"><div><div className="eyebrow">Connected repositories</div><h2>Open a live repository dashboard</h2></div></div><div className="repository-overview-list">{items.map((item)=><Link className="repository-overview-row" key={item.repo.id} href={`/app/repos/${item.repo.slug}`}><div><strong>{item.repo.slug}</strong><small>{item.telemetryHealthy?"Recent telemetry is flowing":"Waiting for the first attributed Codex turn"}</small></div><div><strong>{money(item.metrics.spend30d)}</strong><small>30-day estimate</small></div><span>-&gt;</span></Link>)}</div></section>
      <section className="panel attention"><div className="eyebrow">Integration health</div><h2>{items.every((item)=>item.telemetryHealthy)?"Telemetry is flowing":"Finish your first verified turn"}</h2><p>{items.every((item)=>item.telemetryHealthy)?"Governor has recently joined Codex usage to signed Git context.":"Run verification from Setup, then complete one real Codex task in a connected repository."}</p><Link className="text-button" href="/app/setup">View setup status -&gt;</Link></section>
    </section>
    <section className="panel workspace-receipts"><div className="panel-heading"><div><div className="eyebrow">Recent pull requests</div><h2>Receipts that changed the work</h2></div></div>{receipts.length?<div className="portfolio-list">{receipts.slice(0,8).map((item)=><Link className="portfolio-row" key={`${item.repo.id}-${item.prNumber}`} href={`/app/repos/${item.repo.slug}/pulls/${item.prNumber}`}><div><strong>{item.repo.slug} <span>#{item.prNumber}</span></strong><small>{item.title}</small></div><div><strong>{money(item.totalCost)}</strong><small>{item.eventCount} events - {confidence(item.confidence)}</small></div><span>-&gt;</span></Link>)}</div>:<div className="chart-empty">No pull-request receipts yet. Work with Codex on a branch, then push and open a pull request.</div>}</section>
  </>;
}
