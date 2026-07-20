import { RepositoryDashboard } from "@/components/governor-ui";
import { AgentSetupPanel } from "@/components/agent-setup-panel";
import { requireRepositoryAccess } from "@/lib/app-access";

export default async function RepositoryPage({params}:{params:Promise<{owner:string;repo:string}>}) { const {owner,repo}=await params; const access=await requireRepositoryAccess(`${owner}/${repo}`); return <><RepositoryDashboard overview={access.overview}/><AgentSetupPanel repositorySlug={access.repository.slug} governorUrl={process.env.GOVERNOR_URL ?? "http://localhost:3000"} configured={access.overview.agentTokenConfigured}/></>; }
