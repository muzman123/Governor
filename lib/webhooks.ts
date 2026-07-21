import crypto from "node:crypto";
import { explainReceipt } from "./explainer";
import { fetchPullRequestWorkContext, publishCommitCheck, publishPullRequestReceipt } from "./github";
import { buildReceipt } from "./receipts";
import { observeReceipt } from "./observations";
import { createWorkContext, prepareWorkContextInput } from "./work-context";
import type { GovernorStore } from "./store";
import type { PullRequest, Repository, UsageEvent } from "./types";

type GitHubPayload = Record<string, any>;
const id = (prefix: string, value: string | number) => `${prefix}_${String(value)}`;

async function repositoryForPayload(store: GovernorStore, payload: GitHubPayload): Promise<Repository> {
  const raw=payload.repository; const slug=raw.full_name as string; const current=await store.getRepositoryBySlug(slug);
  return store.upsertRepository({ id:current?.id ?? id("repo",raw.id), slug, defaultBranch:raw.default_branch ?? "main", installationId:payload.installation?.id ?? current?.installationId });
}

export async function handleGitHubWebhook(store: GovernorStore, eventName: string, payload: GitHubPayload) {
  if (eventName === "push") return handlePush(store,payload);
  if (eventName === "pull_request" && ["opened","reopened","synchronize","edited","closed"].includes(payload.action)) return handlePullRequest(store,payload);
  return { handled:false };
}

async function handlePush(store: GovernorStore, payload: GitHubPayload) {
  if(payload.deleted) return {handled:true,skipped:"deleted ref"};
  const repo=await repositoryForPayload(store,payload); const branch=String(payload.ref ?? "").replace(/^refs\/heads\//,"");
  const sha=payload.after; if(!branch || !sha) return {handled:false};
  const events=await store.getEvents(repo.id,{branch}); const receipt=buildReceipt(events,{repositoryId:repo.id,prNumber:0,title:`Commit ${sha.slice(0,7)}`,headSha:sha});
  await publishCommitCheck(repo,sha,receipt); return {handled:true,kind:"push",receipt};
}

async function handlePullRequest(store: GovernorStore, payload: GitHubPayload) {
  const repo=await repositoryForPayload(store,payload); const raw=payload.pull_request; const number=Number(payload.number);
  const existing=await store.getPullRequest(repo.id,number); const closed=raw.state === "closed"; const outcome:PullRequest["outcome"]=closed ? raw.merged ? "merged" : "closed_unmerged" : "open";
  const pr: PullRequest={id:existing?.id ?? id("pr",`${repo.id}_${number}`),repositoryId:repo.id,number,branch:raw.head.ref,headSha:raw.head.sha,title:raw.title,state:closed ? "closed" : "open",outcome,commentId:existing?.commentId,mergedAt:outcome === "merged" ? raw.merged_at ?? new Date().toISOString() : undefined,closedAt:closed ? raw.closed_at ?? new Date().toISOString() : undefined,updatedAt:new Date().toISOString()};
  const receipt=await refreshPullRequestReceipt(store,repo,pr);
  return {handled:true,kind:"pull_request",receipt};
}

type ReceiptRefreshOptions = { publish?: boolean; openOnly?: boolean };

/** Recalculates one known PR. Telemetry refreshes persist facts; publication happens at settled boundaries. */
export async function refreshPullRequestReceipt(store: GovernorStore, repo: Repository, pr: PullRequest, options: ReceiptRefreshOptions = {}) {
  const events=await store.getEvents(repo.id,{branch:pr.branch}); const receipt=buildReceipt(events,{repositoryId:repo.id,prNumber:pr.number,title:pr.title,headSha:pr.headSha,outcome:pr.outcome,outcomeAt:pr.mergedAt ?? pr.closedAt});
  const allEvents=await store.getEvents(repo.id); const dashboard=await store.getDashboard(repo.id); receipt.observation=observeReceipt(receipt,events,allEvents.filter((event)=>event.branch!==pr.branch),dashboard.receipts);
  const previous=await store.getReceipt(repo.id,pr.number);
  if(options.publish===false) {
    // Do not make a GPT call or edit GitHub for every streaming OTel record.
    // A settled turn or PR lifecycle event publishes the current receipt once.
    receipt.workContext=previous?.workContext; await store.saveReceipt(receipt); return receipt;
  }
  const fallbackInput=prepareWorkContextInput({title:pr.title,headSha:pr.headSha});
  const workContextInput=await fetchPullRequestWorkContext(repo,pr) ?? fallbackInput;
  const described=await explainReceipt(receipt,workContextInput);
  receipt.explanation=described.explanation;
  receipt.workContext=previous?.workContext?.fingerprint===workContextInput.fingerprint ? previous.workContext : createWorkContext(workContextInput,described.workSummary);
  await store.saveReceipt(receipt);
  pr.commentId=await publishPullRequestReceipt(repo,pr,receipt); await store.upsertPullRequest(pr);
  return receipt;
}

/** Refreshes matching PR receipts for one attributed branch. */
export async function refreshPullRequestReceiptsForBranch(store: GovernorStore, repo: Repository, branch: string, options: ReceiptRefreshOptions = {}) {
  const prs=(await store.getPullRequestsByBranch(repo.id,branch)).filter((pr)=>!options.openOnly || pr.state === "open");
  return Promise.all(prs.map((pr)=>refreshPullRequestReceipt(store,repo,pr,options)));
}

/**
 * OTel records can arrive after a PR was opened. Refresh each affected branch
 * once per intake batch so the stored receipt/dashboard does not stay stale.
 */
export async function refreshPullRequestReceiptsForUsageEvents(store: GovernorStore, events: UsageEvent[]) {
  const repositories=new Map((await store.listRepositories()).map((repo)=>[repo.id,repo]));
  const targets=new Map<string,{repo:Repository;branch:string}>();
  for(const event of events) {
    if(!event.repositoryId || !event.branch) continue;
    const repo=repositories.get(event.repositoryId); if(repo) targets.set(`${repo.id}:${event.branch}`,{repo,branch:event.branch});
  }
  const settled=await Promise.allSettled([...targets.values()].map(({repo,branch})=>refreshPullRequestReceiptsForBranch(store,repo,branch,{publish:false,openOnly:true})));
  return {refreshed:settled.filter((result)=>result.status === "fulfilled").reduce((count,result)=>count+(result.status === "fulfilled" ? result.value.length : 0),0),failed:settled.filter((result)=>result.status === "rejected").length};
}

export function signingState(returnTo = "/"): string { const secret=process.env.GITHUB_OAUTH_STATE_SECRET ?? process.env.GITHUB_WEBHOOK_SECRET ?? "development-only"; const payload=Buffer.from(JSON.stringify({returnTo,nonce:crypto.randomUUID(),expires:Date.now()+10*60_000})).toString("base64url"); const signature=crypto.createHmac("sha256",secret).update(payload).digest("base64url"); return `${payload}.${signature}`; }
export function verifyState(state: string): { returnTo:string } | undefined { const [payload,signature]=state.split("."); if(!payload || !signature) return; const secret=process.env.GITHUB_OAUTH_STATE_SECRET ?? process.env.GITHUB_WEBHOOK_SECRET ?? "development-only"; const expected=crypto.createHmac("sha256",secret).update(payload).digest("base64url"); if(!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) return; const parsed=JSON.parse(Buffer.from(payload,"base64url").toString()) as {returnTo:string;expires:number}; return parsed.expires>Date.now()?{returnTo:parsed.returnTo}:undefined; }
