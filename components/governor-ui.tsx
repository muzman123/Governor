import Link from "next/link";
import type { OutcomeMetrics, Receipt, Repository, RepositoryOverview } from "@/lib/types";
import { categoryLabel } from "@/lib/work-context";
import { workTypeLabel } from "@/lib/work-types";
import { observationFallback } from "@/lib/observations";
import { AutoRefresh } from "./live-refresh";
import { AppNavigation } from "./app-navigation";
import { BudgetSettings } from "./budget-settings";

const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(value);
const compact=(value:number)=>new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(value);
const date=(value?:string)=>value?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value)):"No activity yet";
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

export function RepositoryDashboard({overview,canManageBudget}:{overview:RepositoryOverview;canManageBudget:boolean}) {
  return <>
    <PageHeader eyebrow="Repository overview" title={overview.repo.slug} description={`Default branch: ${overview.repo.defaultBranch} | Last activity: ${date(overview.lastActivityAt)}`} action={<AutoRefresh/>}/>
    <section className="metrics-grid">
      <MetricCard label="7-day estimate" value={money(overview.metrics.spend7d)}/>
      <MetricCard label="30-day estimate" value={money(overview.metrics.spend30d)}/>
      <MetricCard label="PR receipts" value={String(overview.metrics.prCount)}/>
      <MetricCard label="Merged pull requests" value={String(overview.metrics.outcomes.mergedCount)} detail="This repository" tone="good"/>
    </section>
    <section className="two-column dashboard-top"><BudgetForecastCard overview={overview} canManageBudget={canManageBudget}/><SpendTrend points={overview.spendTrend}/></section>
    <section className="two-column"><ModelMix models={overview.modelSpend}/><WorkTypeSpendCard rows={overview.workTypeSpend}/></section>
    <OutcomeSummary outcomes={overview.metrics.outcomes}/>
    <section className="two-column"><ReceiptTable receipts={overview.receipts} repository={overview.repo}/><div className="dashboard-side-stack"><RecentObservations receipts={overview.receipts} repository={overview.repo}/><ActivityFeed events={overview.recentEvents}/></div></section>
  </>;
}

function BudgetForecastCard({overview,canManageBudget}:{overview:RepositoryOverview;canManageBudget:boolean}) {
  const forecast=overview.budgetForecast; const status={not_configured:"Set a monthly limit to compare observed Codex spend with your plan.",early_estimate:"Forecast is early: it will stabilize as more calendar days pass.",on_track:"Projected spend is within this month’s budget.",watch:"Projected spend is close to this month’s budget.",projected_over:"At the current run rate, this repository is projected to exceed budget.",over_budget:"Recorded spend has already exceeded this month’s budget."}[forecast.status]; const progress=Math.min(forecast.burnPercent ?? 0,100);
  return <section className="panel budget-panel"><div className="panel-heading"><div><div className="eyebrow">Monthly budget</div><h2>Burn and forecast</h2></div><span className="muted">UTC month</span></div>{overview.budget ? <><div className="budget-stat-grid"><div><small>Month to date</small><strong>{money(forecast.spendMonthToDate)}</strong><span>{forecast.burnPercent?.toFixed(0)}% of {money(overview.budget.monthlyBudgetUsd)}</span></div><div><small>Forecast</small><strong>{money(forecast.projectedSpend)}</strong><span>{forecast.daysElapsed} of {forecast.daysInMonth} days</span></div></div><div className="budget-progress" aria-label={`${forecast.burnPercent?.toFixed(0) ?? 0}% of monthly budget used`}><i className={forecast.status} style={{width:`${progress}%`}}/></div><p className={`budget-status ${forecast.status}`}>{status}</p><small className="budget-note">Based on recorded token-rate estimates, not an invoice total.</small></> : <div className="budget-empty"><strong>No monthly budget set</strong><p>{status}</p></div>}<BudgetSettings repositorySlug={overview.repo.slug} monthlyBudgetUsd={overview.budget?.monthlyBudgetUsd} canManageBudget={canManageBudget}/></section>;
}

function SpendTrend({points}:{points:RepositoryOverview["spendTrend"]}) {
  const max=Math.max(...points.map((point)=>point.costUsd),.01);
  return <section className="panel"><div className="panel-heading"><div><div className="eyebrow">Last 14 days</div><h2>Estimated spend trend</h2></div><span className="muted">Token-rate estimate</span></div>{points.length?<div className="bar-chart">{points.map((point)=><div className="bar-item" key={point.date}><div className="bar-value">{money(point.costUsd)}</div><div className="bar" style={{height:`${Math.max(8,point.costUsd/max*150)}px`}}/><small>{point.date.slice(5)}</small></div>)}</div>:<ChartEmpty label="Spend will appear after the first attributed turn."/>}</section>;
}

function ModelMix({models}:{models:RepositoryOverview["modelSpend"]}) {
  const total=models.reduce((sum,model)=>sum+model.costUsd,0);
  return <section className="panel"><div className="panel-heading"><div><div className="eyebrow">Model mix</div><h2>Where spend is concentrated</h2></div></div>{models.length?<div className="model-list">{models.map((model)=><div key={model.model} className="model-row"><div><strong>{model.model}</strong><small>{compact(model.inputTokens)} input | {compact(model.outputTokens)} output</small></div><div><strong>{money(model.costUsd)}</strong><span className="model-track"><i style={{width:`${total?model.costUsd/total*100:0}%`}}/></span></div></div>)}</div>:<ChartEmpty label="Model mix will appear after telemetry arrives."/>}</section>;
}

function WorkTypeSpendCard({rows}:{rows:RepositoryOverview["workTypeSpend"]}) {
  const total=rows.reduce((sum,row)=>sum+row.totalCost,0);
  return <section className="panel work-type-panel"><div className="panel-heading"><div><div className="eyebrow">Spend by work type</div><h2>Cost by PR label</h2></div></div>{rows.length?<div className="work-type-list">{rows.map((row)=><div key={row.workType} className="work-type-row"><div><strong>{workTypeLabel(row.workType)}</strong><small>{row.prCount} PR{row.prCount===1?"":"s"} · {money(row.avgCostPerPr)} avg.</small></div><div><strong>{money(row.totalCost)}</strong><span className="model-track"><i style={{width:`${total?row.totalCost/total*100:0}%`}}/></span></div></div>)}</div>:<ChartEmpty label="Work-type spend appears after the first PR receipt."/>}<small className="panel-note">Derived from recognized GitHub PR labels. Unrecognized labels remain Unclassified.</small></section>;
}

function OutcomeSummary({outcomes}:{outcomes:OutcomeMetrics}) {
  const hasData=outcomes.openCount||outcomes.mergedCount||outcomes.closedUnmergedCount;
  return <section className="panel outcome-panel" style={{marginBottom:16}}><div className="panel-heading"><div><div className="eyebrow">PR outcomes</div><h2>Cost alongside what happened</h2></div></div>{hasData?<><div className="outcome-list"><OutcomeRow label="Merged" count={outcomes.mergedCount} value={outcomes.mergedCost} tone="merged"/><OutcomeRow label="Closed without merge" count={outcomes.closedUnmergedCount} value={outcomes.closedUnmergedCost} tone="closed"/><OutcomeRow label="Still open" count={outcomes.openCount} tone="open"/></div><div className="outcome-total"><span>Estimated cost per merged PR</span><strong>{outcomes.costPerMergedPr===undefined?"-":money(outcomes.costPerMergedPr)}</strong></div></>:<ChartEmpty label="PR outcome context appears after the first receipt."/>}<small className="outcome-note">Closed PRs are shown as an outcome, not automatically classified as wasted work.</small></section>;
}

function OutcomeRow({label,count,value,tone}:{label:string;count:number;value?:number;tone:string}) {
  return <div className="outcome-row"><span className={`outcome-dot ${tone}`}/><strong>{label}</strong><small>{count} PR{count===1?"":"s"}</small>{value!==undefined&&<span>{money(value)}</span>}</div>;
}

function ChartEmpty({label}:{label:string}) { return <div className="chart-empty">{label}</div>; }

function ActivityFeed({events}:{events:RepositoryOverview["recentEvents"]}) {
  return <section className="panel"><div className="panel-heading"><div><div className="eyebrow">Recent activity</div><h2>Telemetry joined to work</h2></div></div>{events.length?<div className="activity-list">{events.slice(0,7).map((event)=><div className="activity-row" key={event.id}><span className="activity-pulse"/><div><strong>Codex work | {event.model}</strong><small>{event.branch ?? "No branch"} | {date(event.occurredAt)}</small></div><strong>{money(event.costUsd)}</strong></div>)}</div>:<ChartEmpty label="Waiting for the first attributed event."/>}</section>;
}

function RecentObservations({receipts,repository}:{receipts:Receipt[];repository:Repository}) {
  const observed=receipts.filter((receipt)=>receipt.observation?.category !== "attribution_quality" && receipt.observation);
  return <section className="panel recent-observations"><div className="panel-heading"><div><div className="eyebrow">Cost signals</div><h2>Unusual spend and tuning opportunities</h2></div></div>{observed.length?<div className="observation-list">{observed.slice(0,5).map((receipt)=>{ const observation=receipt.observation!; return <Link href={`/app/repos/${repository.slug}/pulls/${receipt.prNumber}`} key={receipt.prNumber} className={`observation-row ${observation.severity ?? "info"}`}><span className="observation-row-mark"/><div><strong>{observation.title}</strong><small>#{receipt.prNumber} | {receipt.title}</small></div>{observation.impactUsd!==undefined&&<span>{money(observation.impactUsd)}</span>}</Link>; })}</div>:<ChartEmpty label="Governor is gathering a repository baseline."/>}</section>;
}

export function ReceiptTable({receipts,repository}:{receipts:Receipt[];repository:Repository}) {
  return <section className="panel receipts-panel"><div className="panel-heading"><div><div className="eyebrow">Pull request receipts</div><h2>Cost, with evidence</h2></div></div>{receipts.length?<div className="receipt-table">{receipts.map((receipt)=><Link key={receipt.prNumber} href={`/app/repos/${repository.slug}/pulls/${receipt.prNumber}`} className="receipt-row"><div><strong>#{receipt.prNumber} | {receipt.title}</strong><small>{outcomeLabel(receipt.outcome)} · {workTypeLabel(receipt.workType ?? "unclassified")}</small><WorkContextInline context={receipt.workContext}/></div><div><strong>{money(receipt.totalCost)}</strong><small>{receipt.eventCount} usage events</small></div><span>-&gt;</span></Link>)}</div>:<ChartEmpty label="No pull request receipts have been created yet."/>}</section>;
}

export function ReceiptDetail({receipt,repository}:{receipt:Receipt;repository:Repository}) {
  return <>
    <PageHeader eyebrow={`Pull request receipt | ${repository.slug}`} title={`#${receipt.prNumber} | ${receipt.title}`} description={`Updated ${date(receipt.updatedAt)} | Commit ${receipt.headSha.slice(0,7)}`} action={<a className="button small-button" href={`https://github.com/${repository.slug}/pull/${receipt.prNumber}`} target="_blank">Open GitHub -&gt;</a>}/>
    <section className="receipt-hero"><div><span className="metric-label">Estimated Codex cost</span><strong>{money(receipt.totalCost)}</strong><small>{receipt.eventCount} usage events | {outcomeLabel(receipt.outcome)} | {workTypeLabel(receipt.workType ?? "unclassified")}</small></div><small className="receipt-hero-note">Transparent token-rate estimate</small></section>
    <WorkContextCard context={receipt.workContext}/>
    <ObservationCard observation={receipt.observation}/>
    <div className="receipt-outcome" style={{marginBottom:16}}><ReceiptOutcome outcome={receipt.outcome} outcomeAt={receipt.outcomeAt}/></div>
    <section className="two-column"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">Cost breakdown</div><h2>Models and token counts</h2></div></div><div className="breakdown-list">{receipt.models.map((model)=><div className="breakdown-row" key={model.model}><div><strong>{model.model}</strong><small>{model.inputTokens.toLocaleString()} input | {model.cachedInputTokens.toLocaleString()} cached | {model.outputTokens.toLocaleString()} output</small></div><strong>{money(model.costUsd)}</strong></div>)}</div></section><section className="panel"><div className="eyebrow">Calculation</div><h2>Deterministic by design</h2><dl className="calculation-list"><div><dt>Usage records</dt><dd>{receipt.eventCount} attributed events</dd></div><div><dt>Attribution</dt><dd>{Math.round(receipt.confidence*100)}% {receipt.confidence>=.95?"exact":"confidence"}</dd></div><div><dt>Rate method</dt><dd>Effective-dated token rates</dd></div><div><dt>Privacy</dt><dd>No prompts or code stored</dd></div></dl></section></section>
    <PrivacyNotice/>
  </>;
}

function ReceiptOutcome({outcome,outcomeAt}:{outcome?:Receipt["outcome"];outcomeAt?:string}) {
  const detail=outcome === "merged" ? "This pull request merged after its recorded AI-assisted work." : outcome === "closed_unmerged" ? "This pull request closed without merge. Governor reports that outcome without judging the work as waste." : "This pull request is still open; its receipt will update when the PR lifecycle changes.";
  return <section className="panel"><div className="eyebrow">PR outcome</div><h2><span className={`outcome-badge ${outcome ?? "open"}`}>{outcomeLabel(outcome)}</span></h2><p>{detail}</p>{outcomeAt&&<small>Recorded {date(outcomeAt)}.</small>}</section>;
}

function ObservationCard({observation}:{observation?:Receipt["observation"]}) {
  if(observation?.category === "attribution_quality") return null;
  const fallback=observationFallback();
  const comparison=observation?.comparison;
  return <section className={`observation-card ${observation?.severity ?? "info"}`}><div className="observation-icon">i</div><div><div className="eyebrow">Governor observation</div><h2>{observation?.title ?? fallback.title}</h2>{comparison ? <div className="observation-facts"><div><span>This PR</span><strong>{money(comparison.currentCostUsd)}</strong></div><div><span>Typical PR</span><strong>{money(comparison.baselineCostUsd)}</strong></div><div><span>Difference</span><strong>+{money(comparison.deltaUsd)} · {comparison.multiplier.toFixed(1)}×</strong></div></div> : <p>{observation?.explanation ?? fallback.body}</p>}{observation&&<><div className="observation-evidence">{observation.evidence}</div><div className="observation-meta">{observation.impactUsd!==undefined&&<span>{observation.category === "cost_outlier" ? "Above baseline" : "Estimated impact"} | {money(observation.impactUsd)}</span>}<span>Deterministic calculation v{observation.calculationVersion.replace("v","")}</span></div></>}</div></section>;
}

export function WorkContextInline({context}:{context?:Receipt["workContext"]}) {
  return context?<small className="work-context-inline" title={context.summary}>{context.summary}</small>:null;
}

function WorkContextCard({context}:{context?:Receipt["workContext"]}) {
  if(!context) return null;
  const scope=[
    context.filesChanged!==undefined?`${context.filesChanged} files`:undefined,
    typeof context.additions==="number"?`+${context.additions}`:undefined,
    typeof context.deletions==="number"?`-${context.deletions}`:undefined,
    ...(context.categoryCoverage==="complete"?context.categories.map((category)=>`${category.fileCount} ${categoryLabel(category.category)}`):[])
  ].filter((item): item is string=>Boolean(item));
  return <section className="work-context-card"><div className="eyebrow">Work context</div><h2>What this receipt covers</h2><p>{context.summary}</p>{scope.length>0&&<div className="work-context-scope">{scope.map((item)=><span key={item}>{item}</span>)}</div>}<small>Derived from PR metadata and human discussion; raw comments and file contents are not stored.</small></section>;
}

export function PrivacyNotice() {
  return <div className="privacy-notice"><span className="privacy-dot"/><span><strong>Prompt-safe by design.</strong> Governor stores token metadata, Git context, and a generated Work context summary - never prompts, responses, generated code, raw PR comments, or repository file contents.</span></div>;
}

export function EmptyState() {
  return <section className="empty-state"><div className="empty-icon">+</div><div><div className="eyebrow">No repositories yet</div><h2>Connect your first repository</h2><p>Install the Governor GitHub App, run the one-time Codex command, and complete a real turn to begin receiving receipts.</p><Link className="button" href="/app/setup">Complete setup -&gt;</Link></div></section>;
}
