import Link from "next/link";
import type { Dashboard } from "@/lib/types";
import { MetricCard, PrivacyNotice } from "./governor-ui";

const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(value);

export function DemoExperience({dashboard}:{dashboard:Dashboard}) {
  const receipt=dashboard.receipts[0];
  return <main className="demo-main">
    <section className="demo-hero panel">
      <div><div className="eyebrow">Public product tour</div><h1>See the cost behind a pull request.</h1><p>This sandbox uses anonymized, seeded data. It shows the exact evidence Governor gives an engineering lead: estimated spend, attribution confidence, model mix, and an observation worth reviewing.</p></div>
      <Link className="button" href="/api/auth/github/start">Connect your GitHub -&gt;</Link>
    </section>
    <section className="metrics-grid demo-metrics">
      <MetricCard label="7-day estimated spend" value={money(dashboard.metrics.spend7d)} detail="Anonymized sample repository"/>
      <MetricCard label="30-day estimated spend" value={money(dashboard.metrics.spend30d)} detail="Token-rate estimate"/>
      <MetricCard label="PR receipts" value={String(dashboard.metrics.prCount)} detail="Evidence attached to work"/>
      <MetricCard label="Attribution confidence" value={`${Math.round(dashboard.metrics.avgConfidence*100)}%`} detail="Signed Git context" tone="good"/>
    </section>
    <section className="two-column demo-story">
      <article className="panel demo-receipt-preview">
        <div className="panel-heading"><div><div className="eyebrow">Example pull request receipt</div><h2>{receipt?`#${receipt.prNumber} ${receipt.title}`:"Receipt preview"}</h2></div><span className="demo-pill">Sample</span></div>
        <div className="demo-receipt-total"><div><span>Estimated Codex cost</span><strong>{money(receipt?.totalCost ?? 1.71)}</strong></div><div><strong>{receipt?.eventCount ?? 3} events</strong><small>100% exact context</small></div></div>
        <div className="demo-models">{(receipt?.models ?? []).map((model)=><div key={model.model}><span>{model.model}</span><strong>{money(model.costUsd)}</strong><small>{model.inputTokens.toLocaleString()} input / {model.outputTokens.toLocaleString()} output</small></div>)}</div>
        <div className="demo-receipt-footer">This is an estimated token-rate calculation, not an invoice total.</div>
      </article>
      <article className="demo-observation">
        <div className="observation-icon">i</div><div><div className="eyebrow">Governor observation - sample</div><h2>Low cache reuse increased estimated cost.</h2><p>Cache utilization was 12% versus this repository's 64% baseline; approximately $3.10 of this sample receipt was reprocessed context.</p><div className="observation-evidence">Evidence: cache utilization 12%; repository baseline 64%; 38 historical usage events.</div><div className="observation-meta"><span>Estimated impact $3.10</span><span>Confidence 96%</span><span>Deterministic calculation</span></div></div>
      </article>
    </section>
    <section className="panel demo-flow"><div><div className="eyebrow">How it works</div><h2>Three links, one auditable answer.</h2></div><ol><li><span>01</span> Codex emits prompt-safe token metadata.</li><li><span>02</span> Governor joins it to signed Git repository and branch context.</li><li><span>03</span> GitHub receives a transparent PR receipt.</li></ol></section>
    <PrivacyNotice/>
  </main>;
}
