import Link from "next/link";

const previewRepositories = [
  { name: "acme/checkout", spend: "$284.70", state: "2 observations" },
  { name: "acme/mobile-api", spend: "$163.28", state: "Telemetry flowing" },
  { name: "acme/design-system", spend: "$78.94", state: "3 recent receipts" },
];

const previewModels = [
  { model: "gpt-5.5", share: "62%", cost: "$2.99" },
  { model: "gpt-5.4-mini", share: "28%", cost: "$1.35" },
  { model: "gpt-5.6-luna", share: "10%", cost: "$0.48" },
];

export default function Home() {
  return <main className="landing-shell">
    <nav className="landing-nav">
      <Link className="wordmark" href="/">governor<span>.</span></Link>
      <Link className="button small-button" href="/api/auth/github/start">Connect GitHub</Link>
    </nav>

    <section className="hero">
      <div className="eyebrow">AI engineering spend, in context</div>
      <h1>Every Codex dollar,<br/><em>attached to the work</em> it produced.</h1>
      <p className="hero-copy">Governor puts transparent estimated cost receipts on pull requests and gives engineering teams a calm, auditable view of AI development spend.</p>
      <div className="hero-actions">
        <Link className="button" href="/api/auth/github/start">Connect GitHub <span aria-hidden="true">&rarr;</span></Link>
        <a className="text-button" href="#product-preview">See it in context <span aria-hidden="true">&darr;</span></a>
      </div>
      <div className="hero-proof"><span className="signal-dot"/> Token metadata + Git context only <span>+</span> Never prompts, responses, or generated code</div>
    </section>

    <section className="landing-preview" id="product-preview" aria-labelledby="preview-heading">
      <header className="landing-preview-header">
        <div>
          <div className="eyebrow">The decision path, in one place</div>
          <h2 id="preview-heading">From portfolio signal to pull request evidence.</h2>
          <p>A quick illustrative view of the context Governor gives an engineering lead. Dollar amounts below are sample token-rate estimates.</p>
        </div>
        <span className="sample-label">Illustrative product view</span>
      </header>

      <div className="landing-preview-frame">
        <aside className="preview-portfolio">
          <div className="preview-section-heading">
            <span>Portfolio</span>
            <small>30-day estimate</small>
          </div>
          <strong className="preview-portfolio-total">$526.92</strong>
          <div className="preview-repositories">
            {previewRepositories.map((repository, index) => <div className={`preview-repository ${index === 0 ? "selected" : ""}`} key={repository.name}>
              <div><strong>{repository.name}</strong><small>{repository.state}</small></div>
              <span>{repository.spend}</span>
            </div>)}
          </div>
        </aside>

        <div className="preview-repository-view">
          <div className="preview-repository-header">
            <div><div className="eyebrow">Repository</div><h3>acme/checkout</h3><span>Default branch: main</span></div>
            <span className="preview-live"><i/> Recent telemetry</span>
          </div>

          <div className="preview-metrics">
            <div><span>7-day estimated spend</span><strong>$89.30</strong></div>
            <div><span>PR receipts</span><strong>14</strong></div>
            <div><span>Merged this month</span><strong>9</strong></div>
          </div>

          <div className="preview-detail-grid">
            <section className="preview-receipt">
              <div className="preview-section-heading"><span>Pull request receipt</span><small>Merged</small></div>
              <h3>#412 Reduce checkout retries</h3>
              <div className="preview-receipt-total"><div><span>Estimated Codex cost</span><strong>$4.82</strong></div><small>18 usage events</small></div>
              <p>Changes payment-retry behavior and protects the edge case with tests. Raw comments and file contents are not stored.</p>
              <div className="preview-models">
                {previewModels.map((model) => <div key={model.model}><span>{model.model}</span><i style={{ width: model.share }}/><strong>{model.cost}</strong></div>)}
              </div>
              <span className="preview-receipt-note">Transparent token-rate estimate, not an invoice total.</span>
            </section>

            <section className="preview-observation">
              <div className="observation-icon">i</div>
              <div>
                <div className="eyebrow">Governor observation</div>
                <h3>Low cache reuse increased estimated cost.</h3>
                <p>Cache utilization was 12% versus this repository&apos;s 64% baseline; about $3.10 of this receipt was reprocessed context.</p>
                <div className="preview-observation-evidence">Evidence: 38 comparable usage events + deterministic calculation</div>
                <strong>Estimated impact <span>$3.10</span></strong>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>

    <section className="landing-grid">
      <article><span>01</span><h2>Observe work</h2><p>Codex sends token metadata while Governor records only repository, branch, commit, and session context.</p></article>
      <article><span>02</span><h2>Calculate clearly</h2><p>Effective-dated token rates make every estimate traceable, not a black box.</p></article>
      <article><span>03</span><h2>Govern with context</h2><p>Pull requests receive receipts, while the dashboard surfaces patterns worth understanding.</p></article>
    </section>

    <section className="landing-close">
      <div><div className="eyebrow">Ready for a real receipt?</div><h2>Connect a repository and see the next Codex-assisted pull request in context.</h2></div>
      <Link className="button" href="/api/auth/github/start">Connect GitHub <span aria-hidden="true">&rarr;</span></Link>
    </section>
  </main>;
}
