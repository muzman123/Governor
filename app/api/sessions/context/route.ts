import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { ContextSchema } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import { refreshPullRequestReceiptsForBranch } from "@/lib/webhooks";

export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  const parsed=ContextSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  const {phase,...input}=parsed.data; const context={...input,developerId:developer.id,observedAt:input.observedAt ?? new Date().toISOString()};
  const previous=await store.getContext(context.sessionId);
  const effective=previous && previous.developerId===context.developerId && previous.repositorySlug===context.repositorySlug && previous.branch===context.branch && previous.headSha===context.headSha ? previous : context;
  if(effective===context) await store.saveContext(context);
  const repository=await store.getRepositoryBySlug(effective.repositorySlug); const attached=repository ? await store.attachPendingEvents(effective,repository.id,phase===undefined) : 0;
  let receiptsRefreshed=0;
  if(repository && attached) {
    try { receiptsRefreshed=(await refreshPullRequestReceiptsForBranch(store,repository,effective.branch,{publish:false,openOnly:true})).length; } catch { console.warn("Governor could not refresh receipt after context attachment"); }
  }
  return NextResponse.json({ok:true,context:effective,unchanged:effective!==context,attached,receiptsRefreshed});
}
