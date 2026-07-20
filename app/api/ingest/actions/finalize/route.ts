import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { AgentFinalizeSchema } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import { refreshPullRequestReceipt } from "@/lib/webhooks";

/** Rebuilds known PR receipts after a completed CI agent upload. */
export async function POST(request:Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const agent=token ? await store.getAgentTokenByToken(token) : undefined;
  if(!agent) return NextResponse.json({error:"Invalid or revoked Governor agent token"},{status:401});
  const parsed=AgentFinalizeSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  const repository=await store.getRepositoryBySlug(parsed.data.repositorySlug);
  if(!repository || repository.id!==agent.repositoryId) return NextResponse.json({error:"Agent token is not authorized for this repository"},{status:403});
  try {
    const prs=await store.getPullRequestsByBranch(repository.id,parsed.data.branch); const receipts=await Promise.all(prs.map((pr)=>refreshPullRequestReceipt(store,repository,pr)));
    return NextResponse.json({refreshed:receipts.length,receiptNumbers:receipts.map((receipt)=>receipt.prNumber)});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"Receipt refresh failed"},{status:500});
  }
}
