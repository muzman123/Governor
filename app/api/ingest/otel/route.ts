import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { ingestUsage, UsageSchema } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import { refreshPullRequestReceiptsForUsageEvents } from "@/lib/webhooks";

export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  const parsed=UsageSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  try {
    const result=await ingestUsage(store,developer.id,parsed.data); let receiptsRefreshed=0;
    if(result.inserted && result.event) {
      try { receiptsRefreshed=(await refreshPullRequestReceiptsForUsageEvents(store,[result.event])).refreshed; } catch { console.warn("Governor could not refresh receipt after OTLP intake"); }
    }
    return NextResponse.json({inserted:result.inserted,event:result.event,receiptsRefreshed});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Ingest failed"},{status:400}); }
}
