import { redirect } from "next/navigation";
import { AppShell } from "@/components/governor-ui";
import { accessibleRepositories, requireWorkspaceSession } from "@/lib/app-access";

export const dynamic="force-dynamic";
export default async function WorkspaceLayout({children}:{children:React.ReactNode}) { try { const {session}=await requireWorkspaceSession(); const repositories=await accessibleRepositories(session); return <AppShell login={session.githubLogin} repositories={repositories}>{children}</AppShell>; } catch { redirect("/api/auth/github/start"); } }
