import crypto from "node:crypto";
import { explainReceipt } from "./explainer";
import { publishCommitCheck, publishPullRequestReceipt } from "./github";
import { buildReceipt } from "./receipts";
import { observeReceipt } from "./observations";
import type { GovernorStore } from "./store";
import type { PullRequest, Repository } from "./types";

type GitHubPayload = Record<string, any>;
const id = (prefix: string, value: string | number) => `${prefix}_${String(value)}`;

async function repositoryForPayload(store: GovernorStore, payload: GitHubPayload): Promise<Repository> {
  const raw=payload.repository; const slug=raw.full_name as string; const current=await store.getRepositoryBySlug(slug);
  return store.upsertRepository({ id:current?.id ?? id("repo",raw.id), slug, defaultBranch:raw.default_branch ?? "main", installationId:payload.installation?.id ?? current?.installationId });
}

export async function handleGitHubWebhook(store: GovernorStore, eventName: string, payload: GitHubPayload) {
  if (eventName === "push") return handlePush(store,payload);
  if (eventName === "pull_request" && ["opened","reopened","synchronize","edited"].includes(payload.action)) return handlePullRequest(store,payload);
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
  const existing=await store.getPullRequest(repo.id,number); const pr: PullRequest={id:existing?.id ?? id("pr",`${repo.id}_${number}`),repositoryId:repo.id,number,branch:raw.head.ref,headSha:raw.head.sha,title:raw.title,state:raw.state === "closed" ? "closed" : "open",commentId:existing?.commentId,updatedAt:new Date().toISOString()};
  const events=await store.getEvents(repo.id,{branch:pr.branch}); const receipt=buildReceipt(events,{repositoryId:repo.id,prNumber:number,title:pr.title,headSha:pr.headSha});
  const allEvents=await store.getEvents(repo.id); const dashboard=await store.getDashboard(repo.id); receipt.observation=observeReceipt(receipt,events,allEvents.filter((event)=>event.branch!==pr.branch),dashboard.receipts);
  receipt.explanation=await explainReceipt(receipt); await store.saveReceipt(receipt);
  pr.commentId=await publishPullRequestReceipt(repo,pr,receipt); await store.upsertPullRequest(pr);
  return {handled:true,kind:"pull_request",receipt};
}

export function signingState(returnTo = "/"): string { const secret=process.env.GITHUB_OAUTH_STATE_SECRET ?? process.env.GITHUB_WEBHOOK_SECRET ?? "development-only"; const payload=Buffer.from(JSON.stringify({returnTo,nonce:crypto.randomUUID(),expires:Date.now()+10*60_000})).toString("base64url"); const signature=crypto.createHmac("sha256",secret).update(payload).digest("base64url"); return `${payload}.${signature}`; }
export function verifyState(state: string): { returnTo:string } | undefined { const [payload,signature]=state.split("."); if(!payload || !signature) return; const secret=process.env.GITHUB_OAUTH_STATE_SECRET ?? process.env.GITHUB_WEBHOOK_SECRET ?? "development-only"; const expected=crypto.createHmac("sha256",secret).update(payload).digest("base64url"); if(!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) return; const parsed=JSON.parse(Buffer.from(payload,"base64url").toString()) as {returnTo:string;expires:number}; return parsed.expires>Date.now()?{returnTo:parsed.returnTo}:undefined; }
