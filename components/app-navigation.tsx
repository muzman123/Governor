"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Repository } from "@/lib/types";

function NavItem({href,label,icon,active}:{href:string;label:string;icon:string;active:boolean}) {
  return <Link href={href} className={active?"nav-item active":"nav-item"}><span>{icon}</span>{label}</Link>;
}

export function AppNavigation({login,repositories}:{login:string;repositories:Repository[]}) {
  const pathname=usePathname();
  const overview=pathname==="/app";
  const setup=pathname.startsWith("/app/setup");
  const settings=pathname.startsWith("/app/settings");
  return <>
    <aside className="sidebar">
      <Link className="wordmark" href="/app">governor<span>.</span></Link>
      <div className="workspace-label">Workspace</div>
      <nav className="side-nav">
        <NavItem href="/app" label="Overview" icon="O" active={overview}/>
        <NavItem href="/app/setup" label="Setup" icon="S" active={setup}/>
        <NavItem href="/app/settings" label="Settings" icon="G" active={settings}/>
      </nav>
      <div className="repo-rail">
        <div className="workspace-label">Repositories</div>
        {repositories.length?repositories.map((repo)=>{
          const href=`/app/repos/${repo.slug}`;
          return <Link key={repo.id} className={pathname.startsWith(href)?"repo-link selected":"repo-link"} href={href}><span className="repo-mark">#</span>{repo.slug}</Link>;
        }):<Link className="repo-link" href="/app/setup">Connect a repository</Link>}
      </div>
      <div className="sidebar-footer"><span className="privacy-dot"/> Prompt-safe telemetry<br/><strong>@{login}</strong></div>
    </aside>
    <div className="mobile-bar">
      <Link className="wordmark" href="/app">governor<span>.</span></Link>
      <nav><Link className={overview?"active":""} href="/app">Overview</Link><Link className={setup?"active":""} href="/app/setup">Setup</Link></nav>
    </div>
  </>;
}
