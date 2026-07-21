import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { SessionFinalizeSchema } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import { refreshPullRequestReceiptsForBranch } from "@/lib/webhooks";

/** Publishes one settled receipt after a Codex turn; telemetry intake itself never edits GitHub. */
export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  const parsed=SessionFinalizeSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  const context=await store.getContext(parsed.data.sessionId);
  if(!context || context.developerId!==developer.id) return NextResponse.json({error:"No active Governor context for this Codex session"},{status:404});
  if(context.branch!==parsed.data.branch || context.headSha!==parsed.data.headSha) return NextResponse.json({ok:true,skipped:"context advanced",refreshed:0});
  const repository=await store.getRepositoryBySlug(context.repositorySlug);
  if(!repository) return NextResponse.json({error:"Governor is not installed for this repository"},{status:404});
  try {
    const receipts=await refreshPullRequestReceiptsForBranch(store,repository,context.branch,{openOnly:true});
    return NextResponse.json({ok:true,refreshed:receipts.length,receiptNumbers:receipts.map((receipt)=>receipt.prNumber)});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Receipt publication failed"},{status:500}); }
}
