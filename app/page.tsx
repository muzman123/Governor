import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const previewMetrics = [
  { label: "7-day estimate", value: "$89.30" },
  { label: "30-day estimate", value: "$526.92" },
  { label: "Active repositories", value: "3" },
  { label: "PR receipts", value: "14" },
];

const previewSpend = [
  { date: "Jun 10", cost: "$8.10", height: 34 },
  { date: "Jun 11", cost: "$14.40", height: 58 },
  { date: "Jun 12", cost: "$9.60", height: 41 },
  { date: "Jun 13", cost: "$18.40", height: 77 },
  { date: "Jun 14", cost: "$12.20", height: 51 },
  { date: "Jun 15", cost: "$15.90", height: 66 },
  { date: "Jun 16", cost: "$10.70", height: 45 },
];

const previewModels = [
  { model: "gpt-5.5", width: 74, cost: "$2.99" },
  { model: "gpt-5.4-mini", width: 45, cost: "$1.35" },
  { model: "gpt-5.6-luna", width: 23, cost: "$0.48" },
];

const previewReceipts = [
  { repo: "acme/checkout", number: "#412", title: "Reduce checkout retries", cost: "$4.82", events: "18 usage events" },
  { repo: "acme/mobile-api", number: "#188", title: "Add request tracing", cost: "$3.41", events: "11 usage events" },
  { repo: "acme/design-system", number: "#74", title: "Tighten button states", cost: "$1.96", events: "7 usage events" },
];

export default function Home() {
  return <main className="landing-shell">
    <nav className="landing-nav">
      <Link className="wordmark" href="/">governor<span>.</span></Link>
      <div><ThemeToggle/><Link className="button small-button" href="/api/auth/github/start">Connect GitHub</Link></div>
    </nav>

    <section className="hero">
      <div className="eyebrow">Shared repository spend</div>
      <h1>Every Codex dollar,<br/><em>attached to the work</em> it produced.</h1>
      <p className="hero-copy">One repository ledger for Codex spend, pull request receipts, and monthly budgets across the team.</p>
      <div className="hero-actions">
        <Link className="button" href="/api/auth/github/start">Connect GitHub <span aria-hidden="true">&rarr;</span></Link>
        <a className="text-button" href="#product-preview">See it in context <span aria-hidden="true">&darr;</span></a>
      </div>
      <div className="hero-proof"><span className="signal-dot"/> Token metadata + Git context only <span>+</span> Never prompts, responses, or generated code</div>
    </section>

    <section className="landing-preview" id="product-preview" aria-labelledby="preview-heading">
      <header className="landing-preview-header">
        <div>
          <div className="eyebrow">Portfolio overview</div>
          <h2 id="preview-heading">Spend, receipts, and model mix.</h2>
          <p>Shared spend and receipts across connected repositories.</p>
        </div>
        <span className="preview-label">Repository overview</span>
      </header>

      <div className="landing-preview-frame">
        <div className="preview-dashboard">
          <div className="preview-dashboard-header">
            <div><div className="eyebrow">Overview</div><h3>Overview</h3></div>
            <span className="preview-live"><i/> Telemetry flowing</span>
          </div>

          <div className="preview-metrics">
            {previewMetrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}
          </div>

          <div className="preview-overview-grid">
            <section className="preview-panel preview-trend-panel">
              <div className="preview-panel-heading"><div><div className="eyebrow">Spend trend / last 14 days</div><h3>Estimated Codex spend</h3></div><span>Daily total</span></div>
              <div className="preview-chart">
                {previewSpend.map((point) => <div className="preview-chart-column" key={point.date}><strong>{point.cost}</strong><i style={{ height: `${point.height}px` }}/><small>{point.date}</small></div>)}
              </div>
            </section>

            <section className="preview-panel preview-model-panel">
              <div className="preview-panel-heading"><div><div className="eyebrow">Model mix</div><h3>Where spend came from</h3></div></div>
              <div className="preview-models">
                {previewModels.map((model) => <div key={model.model}><div><span>{model.model}</span><strong>{model.cost}</strong></div><i style={{ width: `${model.width}%` }}/></div>)}
              </div>
            </section>
          </div>

          <section className="preview-panel preview-receipts-panel">
            <div className="preview-panel-heading"><div><div className="eyebrow">Recent pull request receipts</div><h3>Receipts attached to repository work</h3></div><span className="preview-link">View repositories <b aria-hidden="true">→</b></span></div>
            <div className="preview-receipts-list">
              {previewReceipts.map((receipt) => <div className="preview-receipt-row" key={`${receipt.repo}-${receipt.number}`}><div><strong>{receipt.repo} <span>{receipt.number}</span></strong><small>{receipt.title}</small></div><div><strong>{receipt.cost}</strong><small>{receipt.events}</small></div><b aria-hidden="true">→</b></div>)}
            </div>
            <small className="preview-note">Calculations are derived from recorded token usage and effective rates.</small>
          </section>
        </div>
      </div>
    </section>

    <section className="landing-grid">
      <article><span>01</span><h2>Observe work</h2><p>Codex sends token metadata while Governor records only repository, branch, commit, and session context.</p></article>
      <article><span>02</span><h2>Calculate clearly</h2><p>Effective-dated token rates make every estimate traceable, not a black box.</p></article>
      <article><span>03</span><h2>Share the ledger</h2><p>Every contributor rolls into the same repository receipts, budgets, and spend history.</p></article>
    </section>

    <section className="landing-close">
      <div><div className="eyebrow">Ready for a shared ledger?</div><h2>Connect a repository and give the team one receipt trail for Codex work.</h2></div>
      <Link className="button" href="/api/auth/github/start">Connect GitHub <span aria-hidden="true">&rarr;</span></Link>
    </section>
  </main>;
}
