import crypto from "node:crypto";
import type { WorkContext, WorkContextCategory, WorkContextCategoryCount, WorkContextComment, WorkContextInput, WorkContextSource } from "./types";

export const MAX_WORK_CONTEXT_FILES = 300;
export const MAX_WORK_CONTEXT_COMMENTS = 20;
export const MAX_WORK_CONTEXT_COMMENT_CHARS = 6_000;

export type WorkContextFile = { path: string; status?: string; additions?: number; deletions?: number };
export type WorkContextCommentInput = WorkContextComment;
export type WorkContextFacts = {
  title: string; repositoryDescription?: string; headSha: string;
  filesChanged?: number; additions?: number; deletions?: number;
  files?: WorkContextFile[]; comments?: WorkContextCommentInput[];
};

const CATEGORY_ORDER: WorkContextCategory[] = ["application", "tests", "documentation", "configuration", "dependencies", "ci", "migrations", "other"];
const EVALUATIVE_LANGUAGE = /\b(should|must|recommend|recommended|recommendation|avoid|waste|wasted|inefficient|efficient|overspent|over[- ]?spend|wrong|poor|good|bad|valuable|worthwhile|unnecessary)\b/i;

export function prepareWorkContextInput(facts: WorkContextFacts): WorkContextInput {
  const files=facts.files ?? [];
  const exactFilesChanged=facts.filesChanged ?? files.length;
  const categoryCoverage: WorkContextInput["categoryCoverage"]=exactFilesChanged > files.length ? "partial" : files.length ? "complete" : "unavailable";
  const categories=categoryCoverage === "complete" ? categorizeFiles(files) : [];
  const comments=normalizeComments(facts.comments ?? []);
  const sources: WorkContextSource[]=["pr_metadata"];
  if(comments.some((comment)=>comment.kind === "discussion")) sources.push("pr_discussion");
  if(comments.some((comment)=>comment.kind === "review" || comment.kind === "inline_review")) sources.push("review_comments");
  const input={title:normalizeText(facts.title) || "Untitled pull request",repositoryDescription:normalizeText(facts.repositoryDescription ?? "") || undefined,headSha:facts.headSha,filesChanged:exactFilesChanged || undefined,additions:facts.additions, deletions:facts.deletions,categories,categoryCoverage,comments,sources,fingerprint:""};
  return {...input,fingerprint:fingerprint(input)};
}

export function categorizeFiles(files: WorkContextFile[]): WorkContextCategoryCount[] {
  const counts=new Map<WorkContextCategory,number>();
  for(const file of files.slice(0,MAX_WORK_CONTEXT_FILES)) {
    const category=classifyPath(file.path);
    counts.set(category,(counts.get(category) ?? 0)+1);
  }
  return CATEGORY_ORDER.filter((category)=>counts.has(category)).map((category)=>({category,fileCount:counts.get(category) ?? 0}));
}

export function classifyPath(path: string): WorkContextCategory {
  const value=path.replace(/\\/g,"/").toLowerCase();
  const base=value.split("/").at(-1) ?? value;
  if(/(^|\/)(test|tests|__tests__|spec)(\/|$)/.test(value) || /\.(test|spec)\.[^.]+$/.test(base)) return "tests";
  if(/(^|\/)(docs?|documentation)(\/|$)/.test(value) || /\.(md|mdx|rst|adoc)$/.test(base)) return "documentation";
  if(/(^|\/)(migrations?|db\/migrate)(\/|$)/.test(value)) return "migrations";
  if(value.startsWith(".github/workflows/") || /(^|\/)(ci|\.circleci)(\/|$)/.test(value)) return "ci";
  if(["package.json","package-lock.json","pnpm-lock.yaml","yarn.lock","bun.lockb","composer.lock","cargo.lock","go.sum","poetry.lock","requirements.txt","pipfile.lock"].includes(base)) return "dependencies";
  if(/(^|\/)(config|configs|configuration)(\/|$)/.test(value) || /(^|\/)(\.env(\.|$)|dockerfile$|docker-compose\.|[^/]+\.(ya?ml|toml|ini|cfg)$)/.test(value)) return "configuration";
  if(/(^|\/)(src|app|lib|server|client|api|packages)(\/|$)/.test(value) || /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|rb|php|cs|c|cc|cpp|h|hpp|swift|scala|vue|svelte)$/.test(base)) return "application";
  return "other";
}

export function normalizeComments(comments: WorkContextCommentInput[]): WorkContextComment[] {
  let remaining=MAX_WORK_CONTEXT_COMMENT_CHARS;
  return [...comments]
    .filter((comment)=>Boolean(normalizeCommentText(comment.body)))
    .sort((left,right)=>(right.createdAt ?? "").localeCompare(left.createdAt ?? ""))
    .slice(0,MAX_WORK_CONTEXT_COMMENTS)
    .flatMap((comment)=>{
      if(remaining<=0) return [];
      const body=normalizeCommentText(comment.body).slice(0,remaining);
      remaining-=body.length;
      return body?[{kind:comment.kind,body,createdAt:comment.createdAt}]:[];
    });
}

export function fallbackWorkContext(input: WorkContextInput, generatedAt=new Date().toISOString()): WorkContext {
  const title=`PR “${input.title}”`;
  const count=input.filesChanged ? `${input.filesChanged} file${input.filesChanged===1?"":"s"}` : "the recorded pull-request work";
  const additions=input.additions ?? 0;
  const lineDelta=typeof input.additions === "number" || typeof input.deletions === "number" ? ` (${additions >= 0 ? "+" : ""}${additions} / −${input.deletions ?? 0})` : "";
  const categoryText=input.categoryCoverage === "complete" && input.categories.length ? ` across ${input.categories.map((category)=>categoryLabel(category.category)).join(", ")}` : "";
  return {summary:`This receipt is attached to ${title}. It changes ${count}${categoryText}${lineDelta}.`,filesChanged:input.filesChanged,additions:input.additions,deletions:input.deletions,categories:input.categories,categoryCoverage:input.categoryCoverage,sources:input.sources,headSha:input.headSha,fingerprint:input.fingerprint,generatedAt};
}

export function createWorkContext(input: WorkContextInput, summary: string | undefined, generatedAt=new Date().toISOString()): WorkContext {
  const fallback=fallbackWorkContext(input,generatedAt);
  return isSafeWorkSummary(summary) ? {...fallback,summary:summary!.trim()} : fallback;
}

export function isSafeWorkSummary(summary: string | undefined): summary is string {
  if(!summary) return false;
  const trimmed=summary.trim();
  return trimmed.length>0 && trimmed.length<=360 && !/[\r\n]/.test(trimmed) && !/[`\/\\]|@[\w-]+/.test(trimmed) && !EVALUATIVE_LANGUAGE.test(trimmed);
}

export function workContextPromptFacts(input: WorkContextInput) {
  return {title:input.title,repositoryDescription:input.repositoryDescription,filesChanged:input.filesChanged,additions:input.additions,deletions:input.deletions,categories:input.categories.map((category)=>({category:categoryLabel(category.category),fileCount:category.fileCount})),categoryCoverage:input.categoryCoverage,discussion:input.comments.map((comment)=>({kind:comment.kind,body:comment.body}))};
}

export function categoryLabel(category: WorkContextCategory): string {
  return {application:"application code",tests:"tests",documentation:"documentation",configuration:"configuration",dependencies:"dependency manifests",ci:"CI workflows",migrations:"migrations",other:"other files"}[category];
}

function normalizeCommentText(value: string): string {
  return normalizeText(value.replace(/```[\s\S]*?```/g," ").replace(/<[^>]*>/g," ").replace(/(^|\s)(?:[\w.-]+\/)+[\w.-]+/g,"$1[path]").replace(/@[\w-]+/g,"[user]"));
}

function normalizeText(value: string): string { return value.replace(/\s+/g," ").trim(); }
function fingerprint(input: Omit<WorkContextInput,"fingerprint">): string { return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
