import { repositoryOverview } from "./dashboard";
import { getStore } from "./store";
import { currentAppSession, type AppSession } from "./session";

type GitHubRepository = { full_name?: string; permissions?: { admin?: boolean } };

export async function requireWorkspaceSession() {
  const session=await currentAppSession(); if(!session) throw new Error("UNAUTHENTICATED");
  const developer=await getStore().getDeveloperById(session.developerId); if(!developer) throw new Error("UNAUTHENTICATED");
  return {session,developer};
}

async function githubRepositories(session: AppSession) {
  const response=await fetch("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100",{headers:{accept:"application/vnd.github+json",authorization:`Bearer ${session.githubAccessToken}`,"x-github-api-version":"2022-11-28"},cache:"no-store"});
  if(!response.ok) throw new Error("GITHUB_ACCESS_FAILED");
  return await response.json() as GitHubRepository[];
}

export async function accessibleRepositories(session: AppSession) {
  const [known,remote]=await Promise.all([getStore().listRepositories(),githubRepositories(session)]);
  const allowed=new Set(remote.flatMap((repository)=>repository.full_name?[repository.full_name]:[]));
  return known.filter((repository)=>allowed.has(repository.slug));
}

export async function requireRepositoryAccess(slug:string) {
  const {session,developer}=await requireWorkspaceSession(); const [known,remote]=await Promise.all([getStore().listRepositories(),githubRepositories(session)]); const remoteRepository=remote.find((candidate)=>candidate.full_name===slug); const repository=known.find((candidate)=>candidate.slug===slug && Boolean(remoteRepository));
  if(!repository) throw new Error("REPOSITORY_NOT_FOUND");
  return {session,developer,repository,canManageBudget:Boolean(remoteRepository?.permissions?.admin),overview:await repositoryOverview(getStore(),repository.id)};
}

export async function requireRepositoryBudgetAccess(slug:string) { const access=await requireRepositoryAccess(slug); if(!access.canManageBudget) throw new Error("REPOSITORY_ADMIN_REQUIRED"); return access; }
