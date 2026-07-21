import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { receiptMarkdown } from "./receipts";
import { MAX_WORK_CONTEXT_FILES, prepareWorkContextInput } from "./work-context";
import type { PullRequest, Receipt, Repository, WorkContextInput } from "./types";

function client(installationId: number) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!appId || !privateKey) return undefined;
  return new Octokit({ authStrategy: createAppAuth, auth: { appId, privateKey, installationId } });
}

/**
 * Loads only transient PR metadata. File patches and raw GitHub responses never
 * leave this function; the returned input has paths/categories and sanitized
 * discussion text only for the current receipt refresh.
 */
export async function fetchPullRequestWorkContext(repo: Repository, pr: PullRequest): Promise<WorkContextInput | undefined> {
  if (!repo.installationId) return;
  const octokit = client(repo.installationId);
  if (!octokit) return;
  const [owner, repoName] = repo.slug.split("/");
  try {
    const [pull, repository, discussion, reviews, inlineReviews, files] = await Promise.all([
      octokit.pulls.get({ owner, repo: repoName, pull_number: pr.number }),
      octokit.repos.get({ owner, repo: repoName }),
      octokit.paginate(octokit.issues.listComments, { owner, repo: repoName, issue_number: pr.number, per_page: 100 }),
      octokit.paginate(octokit.pulls.listReviews, { owner, repo: repoName, pull_number: pr.number, per_page: 100 }),
      octokit.paginate(octokit.pulls.listReviewComments, { owner, repo: repoName, pull_number: pr.number, per_page: 100 }),
      listPullRequestFiles(octokit, owner, repoName, pr.number)
    ]);
    const comments = [
      ...discussion.filter(isHumanComment).map((comment) => ({ kind: "discussion" as const, body: comment.body ?? "", createdAt: comment.created_at ?? comment.updated_at ?? undefined })),
      ...reviews.filter(isHumanComment).map((review) => ({ kind: "review" as const, body: review.body ?? "", createdAt: review.submitted_at ?? undefined })),
      ...inlineReviews.filter(isHumanComment).map((comment) => ({ kind: "inline_review" as const, body: comment.body ?? "", createdAt: comment.created_at ?? comment.updated_at ?? undefined }))
    ];
    return prepareWorkContextInput({ title: pr.title, repositoryDescription: repository.data.description ?? undefined, headSha: pr.headSha, filesChanged: pull.data.changed_files ?? files.files.length, additions: pull.data.additions, deletions: pull.data.deletions, files: files.files, comments });
  } catch {
    return;
  }
}

async function listPullRequestFiles(octokit: Octokit, owner: string, repo: string, pullNumber: number) {
  const files: Array<{ path: string; status?: string; additions?: number; deletions?: number }> = [];
  const pageSize = 100;
  for (let page = 1; files.length < MAX_WORK_CONTEXT_FILES; page++) {
    const response = await octokit.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: pageSize, page });
    files.push(...response.data.slice(0, MAX_WORK_CONTEXT_FILES - files.length).map((file) => ({ path: file.filename, status: file.status, additions: file.additions, deletions: file.deletions })));
    if (response.data.length < pageSize) break;
  }
  return { files };
}

function isHumanComment(entry: { user?: { type?: string | null } | null; body?: string | null }) {
  return Boolean(entry.user) && entry.user?.type !== "Bot" && typeof entry.body === "string" && entry.body.trim().length > 0;
}

export async function publishCommitCheck(repo: Repository, sha: string, receipt: Receipt) {
  if (!repo.installationId) return;
  const octokit = client(repo.installationId);
  if (!octokit) return;
  const [owner, repoName] = repo.slug.split("/");
  const url = `${process.env.GOVERNOR_URL ?? "http://localhost:3000"}/repos/${repo.slug}/receipts`;
  await octokit.checks.create({
    owner,
    repo: repoName,
    name: "Governor - estimated Codex cost",
    head_sha: sha,
    status: "completed",
    conclusion: "neutral",
    details_url: url,
    output: {
      title: `Estimated Codex cost: $${receipt.totalCost.toFixed(2)}`,
      summary: `${receipt.eventCount} recorded usage events\n\nThis is a transparent token-rate calculation from recorded usage and effective rates.`
    }
  });
}

export async function publishPullRequestReceipt(repo: Repository, pr: PullRequest, receipt: Receipt): Promise<number | undefined> {
  if (!repo.installationId) return pr.commentId;
  const octokit = client(repo.installationId);
  if (!octokit) return pr.commentId;
  const [owner, repoName] = repo.slug.split("/");
  const body = receiptMarkdown(receipt, `${process.env.GOVERNOR_URL ?? "http://localhost:3000"}/app/repos/${repo.slug}/pulls/${pr.number}`);
  if (pr.commentId) {
    await octokit.issues.updateComment({ owner, repo: repoName, comment_id: pr.commentId, body });
    return pr.commentId;
  }
  const comments = await octokit.issues.listComments({ owner, repo: repoName, issue_number: pr.number, per_page: 100 });
  const existing = comments.data.find((comment) => comment.user?.type === "Bot" && comment.body?.includes("governor-cost-receipt"));
  if (existing) {
    await octokit.issues.updateComment({ owner, repo: repoName, comment_id: existing.id, body });
    return existing.id;
  }
  const created = await octokit.issues.createComment({ owner, repo: repoName, issue_number: pr.number, body });
  return created.data.id;
}
