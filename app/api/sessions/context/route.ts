import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { ContextSchema } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import { refreshPullRequestReceiptsForBranch } from "@/lib/webhooks";

export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  const parsed=ContextSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  const {phase,...input}=parsed.data;
  // Governor's supported desktop integration supplies one context at the end of
  // a turn through Codex's existing notify mechanism. Ignore stale experimental
  // pre-turn/post-tool hook calls rather than recording an unsafe boundary.
  if(phase && phase!=="turn_end") return NextResponse.json({ok:true,skipped:"unsupported context phase"});
  const context={...input,developerId:developer.id,observedAt:input.observedAt ?? new Date().toISOString()};
  const previous=await store.getContext(context.sessionId);
  // Even when the Git position is unchanged, this is a distinct turn boundary.
  // It closes the next non-overlapping time window for this Codex session.
  await store.saveContext(context);
  const repository=await store.getRepositoryBySlug(context.repositorySlug); const attached=repository ? await store.attachPendingEvents(context,repository.id,previous?.observedAt) : 0;
  let receiptsRefreshed=0;
  if(repository && attached) {
    try { receiptsRefreshed=(await refreshPullRequestReceiptsForBranch(store,repository,context.branch,{publish:false,openOnly:true})).length; } catch { console.warn("Governor could not refresh receipt after context attachment"); }
  }
  return NextResponse.json({ok:true,context,attached,receiptsRefreshed});
}
