import { PageHeader } from "@/components/governor-ui";
import { SetupPanel } from "@/components/setup-panel";
import { accessibleRepositories, requireWorkspaceSession } from "@/lib/app-access";

export default async function SetupPage() {
  const repositories = await accessibleRepositories((await requireWorkspaceSession()).session);
  const appSlug = process.env.GITHUB_APP_SLUG;
  const url = process.env.GOVERNOR_URL ?? "http://localhost:3000";

  return <>
    <PageHeader eyebrow="Setup" title="Setup" description="Connect Codex and verify one real turn." />
    <section className="setup-grid">
      <article className="setup-steps">
        <SetupStep number="01" title="Install GitHub App" detail={repositories.length ? `${repositories.length} ${repositories.length === 1 ? "repository is" : "repositories are"} ready.` : "Install Governor on a repository, then return here."} complete={repositories.length > 0} />
        <SetupStep number="02" title="Connect Codex" detail="Run the command shown here in a terminal." />
        <SetupStep number="03" title="Verify" detail="Complete one Codex task while verification is running." />
      </article>
      <SetupPanel url={url} githubAppUrl={appSlug ? `https://github.com/apps/${appSlug}/installations/new` : undefined} />
    </section>
    <section className="panel troubleshooting">
      <div className="eyebrow">Status</div>
      <h2>What gets connected</h2>
      <div className="troubleshooting-grid">
        <p><strong>GitHub</strong> Repository and pull request events.</p>
        <p><strong>Codex</strong> Token metadata only.</p>
        <p><strong>Verification</strong> One attributed usage event.</p>
      </div>
    </section>
  </>;
}

function SetupStep({ number, title, detail, complete }: { number: string; title: string; detail: string; complete?: boolean }) {
  return <div className="setup-step"><span className={complete ? "step-number complete" : "step-number"}>{complete ? "✓" : number}</span><div><h2>{title}</h2><p>{detail}</p></div></div>;
}
