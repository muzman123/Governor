import { PageHeader, PrivacyNotice } from "@/components/governor-ui";
import { LogoutButton } from "@/components/logout-button";
import { requireWorkspaceSession } from "@/lib/app-access";

export default async function SettingsPage() {
  const {developer,session}=await requireWorkspaceSession();
  return <>
    <PageHeader eyebrow="Workspace settings" title="Trust and access" description="Manage the account and telemetry connection Governor uses to create repository receipts."/>
    <section className="settings-grid">
      <section className="panel"><div className="eyebrow">GitHub identity</div><h2>@{developer.githubLogin}</h2><p>{developer.email ?? "GitHub account connected"}</p><small>Session expires {new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(session.expiresAt))}.</small><LogoutButton/></section>
      <section className="panel"><div className="eyebrow">Data boundary</div><h2>Prompt-safe telemetry</h2><p>Governor stores model/token metadata, Git context, and a generated Work context summary with aggregate file counts. It transiently reads PR metadata and human PR/review discussion, but never stores prompts, responses, generated code, raw comments, file paths, or repository file contents.</p></section>
      <section className="panel"><div className="eyebrow">Telemetry token</div><h2>Rotate from Setup</h2><p>Generate a new one-time join command whenever a local token needs to be replaced or revoked.</p><a className="text-button" href="/app/setup">Open setup →</a></section>
    </section>
    <PrivacyNotice/>
  </>;
}
