import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { receiptMarkdown } from "./receipts";
import type { PullRequest, Receipt, Repository } from "./types";

function client(installationId: number) {
  const appId=process.env.GITHUB_APP_ID; const privateKey=process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g,"\n");
  if(!appId || !privateKey) return undefined;
  return new Octokit({ authStrategy:createAppAuth, auth:{appId,privateKey,installationId} });
}

export async function publishCommitCheck(repo: Repository, sha: string, receipt: Receipt) {
  if(!repo.installationId) return;
  const octokit=client(repo.installationId); if(!octokit) return;
  const [owner,repoName]=repo.slug.split("/"); const url=`${process.env.GOVERNOR_URL ?? "http://localhost:3000"}/repos/${repo.slug}/receipts`;
  await octokit.checks.create({ owner,repo:repoName,name:"Governor — estimated Codex cost",head_sha:sha,status:"completed",conclusion:"neutral",details_url:url,output:{title:`Estimated Codex cost: $${receipt.totalCost.toFixed(2)}`,summary:`${receipt.eventCount} signed usage events · ${Math.round(receipt.confidence*100)}% attribution confidence\n\nThis is a transparent token-rate estimate, not an invoice total.`} });
}

export async function publishPullRequestReceipt(repo: Repository, pr: PullRequest, receipt: Receipt): Promise<number | undefined> {
  if(!repo.installationId) return pr.commentId;
  const octokit=client(repo.installationId); if(!octokit) return pr.commentId;
  const [owner,repoName]=repo.slug.split("/"); const body=receiptMarkdown(receipt,`${process.env.GOVERNOR_URL ?? "http://localhost:3000"}/app/repos/${repo.slug}/pulls/${pr.number}`);
  if(pr.commentId) { await octokit.issues.updateComment({owner,repo:repoName,comment_id:pr.commentId,body}); return pr.commentId; }
  const comments=await octokit.issues.listComments({owner,repo:repoName,issue_number:pr.number,per_page:100}); const existing=comments.data.find((comment)=>comment.user?.type==="Bot" && comment.body?.includes("governor-cost-receipt"));
  if(existing) { await octokit.issues.updateComment({owner,repo:repoName,comment_id:existing.id,body}); return existing.id; }
  const created=await octokit.issues.createComment({owner,repo:repoName,issue_number:pr.number,body}); return created.data.id;
}
