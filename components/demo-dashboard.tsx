import type { Dashboard } from "@/lib/types";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export function DemoDashboard({ dashboard }: { dashboard: Dashboard }) {
  const { repo, metrics, receipts } = dashboard;
  return <main>
    <div className="eyebrow">Governor · public sandbox</div>
    <h1>Every Codex dollar, attached to the work it produced.</h1>
    <p>Repository <code>{repo.slug}</code> · Aggregate demo data only · Dollar amounts are transparent estimates, not invoice totals.</p>
    <div className="notice">Governor stores token metadata and git context—never prompts, responses, or generated code. Individual developer identities require authenticated repository membership.</div>
    <section className="metrics">
      <Metric label="7-day estimated spend" value={money(metrics.spend7d)} />
      <Metric label="30-day estimated spend" value={money(metrics.spend30d)} />
      <Metric label="PRs with receipts" value={String(metrics.prCount)} />
      <Metric label="Avg. attribution confidence" value={`${Math.round(metrics.avgConfidence * 100)}%`} accent="green" />
    </section>
    <div className="grid">
      <section className="panel"><h2>Pull request receipts</h2><table><thead><tr><th>PR</th><th>Estimated Codex cost</th><th>Confidence</th><th>Models</th></tr></thead><tbody>{receipts.map((receipt) => <tr key={receipt.prNumber}><td>#{receipt.prNumber} · {receipt.title}</td><td>{money(receipt.totalCost)}</td><td><span className="badge">{Math.round(receipt.confidence * 100)}% {receipt.confidence === 1 ? "exact" : "inferred"}</span></td><td className="small muted">{receipt.models.map((m) => m.model).join(", ")}</td></tr>)}</tbody></table></section>
      <section className="panel"><h2>How a receipt works</h2><div className="receipt"><strong>1. Codex work is observed.</strong><p className="small">Token counts arrive through opt-in user-level telemetry, joined to repository, branch, and HEAD context.</p></div><div className="receipt"><strong>2. Governor calculates.</strong><p className="small">Rates are effective-dated. The calculation and confidence always travel with the estimate.</p></div><div className="receipt"><strong>3. GitHub gets the tag.</strong><p className="small">Pushes receive a Check Run; PRs receive one updated receipt comment.</p></div></section>
    </div>
  </main>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) { return <div className="card"><div className="metric">{label}</div><div className={`value ${accent ?? ""}`}>{value}</div></div>; }
