import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { ContextSchema } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import { refreshPullRequestReceiptsForBranch } from "@/lib/webhooks";

export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  const parsed=ContextSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  const context={...parsed.data,developerId:developer.id,observedAt:parsed.data.observedAt ?? new Date().toISOString()};
  await store.saveContext(context); const repository=await store.getRepositoryBySlug(context.repositorySlug); const attached=repository ? await store.attachPendingEvents(context,repository.id) : 0;
  let receiptsRefreshed=0;
  if(repository && attached) {
    try { receiptsRefreshed=(await refreshPullRequestReceiptsForBranch(store,repository,context.branch)).length; } catch { console.warn("Governor could not refresh receipt after context attachment"); }
  }
  return NextResponse.json({ok:true,context,attached,receiptsRefreshed});
}
