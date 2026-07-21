import Link from "next/link";
import type { Dashboard, OutcomeMetrics, Receipt, Repository, RepositoryOverview } from "@/lib/types";
import { categoryLabel } from "@/lib/work-context";
import { observationFallback } from "@/lib/observations";
import { AutoRefresh } from "./live-refresh";
import { AppNavigation } from "./app-navigation";

const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(value);
const compact=(value:number)=>new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(value);
const date=(value?:string)=>value?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value)):"No activity yet";
const confidence=(value:number)=>value>=.95?"Exact context":"Inferred context";
const outcomeLabel=(outcome?:Receipt["outcome"])=>outcome === "merged" ? "Merged" : outcome === "closed_unmerged" ? "Closed without merge" : "Open";

export function AppShell({children,login,repositories}:{children:React.ReactNode;login:string;repositories:Repository[]}) {
  return <div className="app-shell"><AppNavigation login={login} repositories={repositories}/><main className="app-main">{children}</main></div>;
}

export function PageHeader({eyebrow,title,description,action}:{eyebrow:string;title:string;description?:string;action?:React.ReactNode}) {
  return <header className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</header>;
}

export function MetricCard({label,value,detail,tone}:{label:string;value:string;detail?:string;tone?:"good"|"accent"}) {
  return <article className={`metric-card ${tone??""}`}><div className="metric-label">{label}</div><strong>{value}</strong>{detail&&<small>{detail}</small>}</article>;
}

export function DemoDashboard({dashboard}:{dashboard:Dashboard}) {
  return <main className="demo-main">
    <PageHeader eyebrow="Governor public sandbox" title="AI spend, attached to engineering work." description={`Repository ${dashboard.repo.slug} · Aggregate demonstration data · Dollar amounts are transparent token-rate estimates.`}/>
    <PrivacyNotice/>
    <section className="metrics-grid">
      <MetricCard label="7-day estimated spend" value={money(dashboard.metrics.spend7d)}/>
      <MetricCard label="30-day estimated spend" value={money(dashboard.metrics.spend30d)}/>
      <MetricCard label="PRs with receipts" value={String(dashboard.metrics.prCount)}/>
      <MetricCard label="Average attribution" value={`${Math.round(dashboard.metrics.avgConfidence*100)}%`} tone="good"/>
    </section>
    <ReceiptTable receipts={dashboard.receipts} repository={dashboard.repo} publicView/>
  </main>;
}

export function RepositoryDashboard({overview}:{overview:RepositoryOverview}) {
  return <>
    <PageHeader eyebrow="Repository overview" title={overview.repo.slug} description={`Default branch: ${overview.repo.defaultBranch} · Last activity: ${date(overview.lastActivityAt)}`} action={<AutoRefresh/>}/>
    <section className="metrics-grid">
      <MetricCard label="7-day estimate" value={money(overview.metrics.spend7d)}/>
      <MetricCard label="30-day estimate" value={money(overview.metrics.spend30d)}/>
      <MetricCard label="PR receipts" value={String(overview.metrics.prCount)}/>
      <MetricCard label="Attribution confidence" value={`${Math.round(overview.metrics.avgConfidence*100)}%`} tone="good"/>
    </section>
    <section className="two-column dashboard-top"><SpendTrend points={overview.spendTrend}/><ModelMix models={overview.modelSpend}/></section>
    <OutcomeSummary outcomes={overview.metrics.outcomes}/>
    <section className="two-column"><ReceiptTable receipts={overview.receipts} repository={overview.repo}/><ActivityFeed events={overview.recentEvents}/></section>
  </>;
}

function SpendTrend({points}:{points:RepositoryOverview["spendTrend"]}) {
  const max=Math.max(...points.map((point)=>point.costUsd),.01);
  return <section className="panel"><div className="panel-heading"><div><div className="eyebrow">Last 14 days</div><h2>Estimated spend trend</h2></div><span className="muted">Token-rate estimate</span></div>{points.length?<div className="bar-chart">{points.map((point)=><div className="bar-item" key={point.date}><div className="bar-value">{money(point.costUsd)}</div><div className="bar" style={{height:`${Math.max(8,point.costUsd/max*150)}px`}}/><small>{point.date.slice(5)}</small></div>)}</div>:<ChartEmpty label="Spend will appear after the first attributed turn."/>}</section>;
}

function ModelMix({models}:{models:RepositoryOverview["modelSpend"]}) {
  const total=models.reduce((sum,model)=>sum+model.costUsd,0);
  return <section className="panel"><div className="panel-heading"><div><div className="eyebrow">Model mix</div><h2>Where spend is concentrated</h2></div></div>{models.length?<div className="model-list">{models.map((model)=><div key={model.model} className="model-row"><div><strong>{model.model}</strong><small>{compact(model.inputTokens)} input · {compact(model.outputTokens)} output</small></div><div><strong>{money(model.costUsd)}</strong><span className="model-track"><i style={{width:`${total?model.costUsd/total*100:0}%`}}/></span></div></div>)}</div>:<ChartEmpty label="Model mix will appear after telemetry arrives."/>}</section>;
}

function OutcomeSummary({outcomes}:{outcomes:OutcomeMetrics}) {
  const hasData=outcomes.openCount||outcomes.mergedCount||outcomes.closedUnmergedCount;
  return <section className="panel outcome-panel" style={{marginBottom:16}}><div className="panel-heading"><div><div className="eyebrow">PR outcomes</div><h2>Cost alongside what happened</h2></div></div>{hasData?<><div className="outcome-list"><OutcomeRow label="Merged" count={outcomes.mergedCount} value={outcomes.mergedCost} tone="merged"/><OutcomeRow label="Closed without merge" count={outcomes.closedUnmergedCount} value={outcomes.closedUnmergedCost} tone="closed"/><OutcomeRow label="Still open" count={outcomes.openCount} tone="open"/></div><div className="outcome-total"><span>Estimated cost per merged PR</span><strong>{outcomes.costPerMergedPr===undefined?"—":money(outcomes.costPerMergedPr)}</strong></div></>:<ChartEmpty label="PR outcome context appears after the first receipt."/>}<small className="outcome-note">Closed PRs are shown as an outcome, not automatically classified as wasted work.</small></section>;
}

function OutcomeRow({label,count,value,tone}:{label:string;count:number;value?:number;tone:string}) {
  return <div className="outcome-row"><span className={`outcome-dot ${tone}`}/><strong>{label}</strong><small>{count} PR{count===1?"":"s"}</small>{value!==undefined&&<span>{money(value)}</span>}</div>;
}

function ChartEmpty({label}:{label:string}) { return <div className="chart-empty">{label}</div>; }

function ActivityFeed({events}:{events:RepositoryOverview["recentEvents"]}) {
  return <section className="panel"><div className="panel-heading"><div><div className="eyebrow">Recent activity</div><h2>Telemetry joined to work</h2></div></div>{events.length?<div className="activity-list">{events.slice(0,7).map((event)=><div className="activity-row" key={event.id}><span className="activity-pulse"/><div><strong>Codex work · {event.model}</strong><small>{event.branch ?? "No branch"} · {date(event.occurredAt)}</small></div><strong>{money(event.costUsd)}</strong></div>)}</div>:<ChartEmpty label="Waiting for the first attributed event."/>}</section>;
}

export function ReceiptTable({receipts,repository,publicView}:{receipts:Receipt[];repository:Repository;publicView?:boolean}) {
  return <section className="panel receipts-panel"><div className="panel-heading"><div><div className="eyebrow">Pull request receipts</div><h2>Cost, with evidence</h2></div></div>{receipts.length?<div className="receipt-table">{receipts.map((receipt)=><Link key={receipt.prNumber} href={publicView?`/api/prs/${receipt.prNumber}/receipt?repo=${encodeURIComponent(repository.slug)}`:`/app/repos/${repository.slug}/pulls/${receipt.prNumber}`} className="receipt-row"><div><strong>#{receipt.prNumber} · {receipt.title}</strong><small>{outcomeLabel(receipt.outcome)}</small><WorkContextInline context={receipt.workContext}/></div><div><strong>{money(receipt.totalCost)}</strong><small>{receipt.eventCount} events · {confidence(receipt.confidence)}</small></div><span>→</span></Link>)}</div>:<ChartEmpty label="No pull request receipts have been created yet."/>}</section>;
}

export function ReceiptDetail({receipt,repository}:{receipt:Receipt;repository:Repository}) {
  return <>
    <PageHeader eyebrow={`Pull request receipt · ${repository.slug}`} title={`#${receipt.prNumber} · ${receipt.title}`} description={`Updated ${date(receipt.updatedAt)} · Commit ${receipt.headSha.slice(0,7)}`} action={<a className="button small-button" href={`https://github.com/${repository.slug}/pull/${receipt.prNumber}`} target="_blank">Open GitHub ↗</a>}/>
    <section className="receipt-hero"><div><span className="metric-label">Estimated Codex cost</span><strong>{money(receipt.totalCost)}</strong><small>{receipt.eventCount} usage events · {confidence(receipt.confidence)} · {outcomeLabel(receipt.outcome)}</small></div><div className="confidence-card"><span className="privacy-dot"/><strong>{Math.round(receipt.confidence*100)}% confidence</strong><small>Signed Git context attribution</small></div></section>
    <WorkContextCard context={receipt.workContext}/>
    <ObservationCard observation={receipt.observation}/>
    <div className="receipt-outcome" style={{marginBottom:16}}><ReceiptOutcome outcome={receipt.outcome} outcomeAt={receipt.outcomeAt}/></div>
    <section className="two-column"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">Cost breakdown</div><h2>Models and token counts</h2></div></div><div className="breakdown-list">{receipt.models.map((model)=><div className="breakdown-row" key={model.model}><div><strong>{model.model}</strong><small>{model.inputTokens.toLocaleString()} input · {model.cachedInputTokens.toLocaleString()} cached · {model.outputTokens.toLocaleString()} output</small></div><strong>{money(model.costUsd)}</strong></div>)}</div></section><section className="panel"><div className="eyebrow">Calculation</div><h2>Deterministic by design</h2><p>{receipt.explanation ?? "Governor calculated this token-rate estimate from recorded model token metadata and the effective rate at the time of use."}</p><dl className="calculation-list"><div><dt>Attribution</dt><dd>{confidence(receipt.confidence)}</dd></div><div><dt>Rate method</dt><dd>Effective-dated token rates</dd></div><div><dt>Privacy</dt><dd>No prompts or code stored</dd></div></dl></section></section>
    <PrivacyNotice/>
  </>;
}

function ReceiptOutcome({outcome,outcomeAt}:{outcome?:Receipt["outcome"];outcomeAt?:string}) {
  const detail=outcome === "merged" ? "This pull request merged after its recorded AI-assisted work." : outcome === "closed_unmerged" ? "This pull request closed without merge. Governor reports that outcome without judging the work as waste." : "This pull request is still open; its receipt will update when the PR lifecycle changes.";
  return <section className="panel"><div className="eyebrow">PR outcome</div><h2><span className={`outcome-badge ${outcome ?? "open"}`}>{outcomeLabel(outcome)}</span></h2><p>{detail}</p>{outcomeAt&&<small>Recorded {date(outcomeAt)}.</small>}</section>;
}

function ObservationCard({observation}:{observation?:Receipt["observation"]}) {
  const fallback=observationFallback();
  return <section className="observation-card"><div className="observation-icon">✦</div><div><div className="eyebrow">Governor observation</div><h2>{observation?.title ?? fallback.title}</h2><p>{observation?.explanation ?? fallback.body}</p>{observation&&<><div className="observation-evidence">{observation.evidence}</div><div className="observation-meta">{observation.impactUsd!==undefined&&<span>Estimated impact · {money(observation.impactUsd)}</span>}<span>Confidence · {Math.round(observation.confidence*100)}%</span><span>Deterministic calculation v{observation.calculationVersion.replace("v","")}</span></div></>}</div></section>;
}

export function WorkContextInline({context}:{context?:Receipt["workContext"]}) {
  return context?<small className="work-context-inline" title={context.summary}>{context.summary}</small>:null;
}

function WorkContextCard({context}:{context?:Receipt["workContext"]}) {
  if(!context) return null;
  const scope=[
    context.filesChanged!==undefined?`${context.filesChanged} files`:undefined,
    typeof context.additions==="number"?`+${context.additions}`:undefined,
    typeof context.deletions==="number"?`−${context.deletions}`:undefined,
    ...(context.categoryCoverage==="complete"?context.categories.map((category)=>`${category.fileCount} ${categoryLabel(category.category)}`):[])
  ].filter((item): item is string=>Boolean(item));
  return <section className="work-context-card"><div className="eyebrow">Work context</div><h2>What this receipt covers</h2><p>{context.summary}</p>{scope.length>0&&<div className="work-context-scope">{scope.map((item)=><span key={item}>{item}</span>)}</div>}<small>Derived from PR metadata and human discussion; raw comments and file contents are not stored.</small></section>;
}

export function PrivacyNotice() {
  return <div className="privacy-notice"><span className="privacy-dot"/><span><strong>Prompt-safe by design.</strong> Governor stores token metadata, Git context, and a generated Work context summary—never prompts, responses, generated code, raw PR comments, or repository file contents.</span></div>;
}

export function EmptyState() {
  return <section className="empty-state"><div className="empty-icon">⌘</div><div><div className="eyebrow">No repositories yet</div><h2>Connect your first repository</h2><p>Install the Governor GitHub App, run the one-time Codex command, and complete a real turn to begin receiving receipts.</p><Link className="button" href="/app/setup">Complete setup →</Link></div></section>;
}
