import { repositoryOverview } from "./dashboard";
import { getStore } from "./store";
import { currentAppSession, type AppSession } from "./session";

type GitHubRepository = { full_name?: string };

export async function requireWorkspaceSession() {
  const session=await currentAppSession(); if(!session) throw new Error("UNAUTHENTICATED");
  const developer=await getStore().getDeveloperById(session.developerId); if(!developer) throw new Error("UNAUTHENTICATED");
  return {session,developer};
}

async function githubRepositorySlugs(session: AppSession) {
  const response=await fetch("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100",{headers:{accept:"application/vnd.github+json",authorization:`Bearer ${session.githubAccessToken}`,"x-github-api-version":"2022-11-28"},cache:"no-store"});
  if(!response.ok) throw new Error("GITHUB_ACCESS_FAILED");
  const repositories=await response.json() as GitHubRepository[];
  return new Set(repositories.flatMap((repository)=>repository.full_name?[repository.full_name]:[]));
}

export async function accessibleRepositories(session: AppSession) {
  const [known,allowed]=await Promise.all([getStore().listRepositories(),githubRepositorySlugs(session)]);
  return known.filter((repository)=>allowed.has(repository.slug));
}

export async function requireRepositoryAccess(slug:string) {
  const {session,developer}=await requireWorkspaceSession(); const repositories=await accessibleRepositories(session); const repository=repositories.find((candidate)=>candidate.slug===slug);
  if(!repository) throw new Error("REPOSITORY_NOT_FOUND");
  return {session,developer,repository,overview:await repositoryOverview(getStore(),repository.id)};
}
