import { PageHeader } from "@/components/governor-ui";
import { LogoutButton } from "@/components/logout-button";
import { requireWorkspaceSession } from "@/lib/app-access";

export default async function SettingsPage() {
  const { developer, session } = await requireWorkspaceSession();
  const expires = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(session.expiresAt));

  return <>
    <PageHeader eyebrow="Settings" title="Settings" />
    <section className="settings-grid">
      <section className="panel"><div className="eyebrow">GitHub account</div><h2>@{developer.githubLogin}</h2><p>{developer.email ?? "Connected"}</p><small>Session expires {expires}.</small><LogoutButton /></section>
      <section className="panel"><div className="eyebrow">Connection</div><h2>Codex</h2><p>Manage the local connection from Setup.</p><a className="text-button" href="/app/setup">Open Setup →</a></section>
    </section>
  </>;
}
