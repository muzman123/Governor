import { RepositoryDashboard } from "@/components/governor-ui";
import { requireRepositoryAccess } from "@/lib/app-access";

export default async function RepositoryPage({params}:{params:Promise<{owner:string;repo:string}>}) { const {owner,repo}=await params; const access=await requireRepositoryAccess(`${owner}/${repo}`); return <RepositoryDashboard overview={access.overview}/>; }
