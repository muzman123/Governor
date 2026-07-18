import { Portfolio } from "@/components/governor-ui";
import { accessibleRepositories, requireWorkspaceSession } from "@/lib/app-access";
import { repositoryOverview } from "@/lib/dashboard";
import { getStore } from "@/lib/store";

export default async function WorkspaceHome() { const {session}=await requireWorkspaceSession(); const repositories=await accessibleRepositories(session); return <Portfolio items={await Promise.all(repositories.map((repository)=>repositoryOverview(getStore(),repository.id)))}/>; }
