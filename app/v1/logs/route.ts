import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { ingestUsage, normalizeOtlpLogs } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import { refreshPullRequestReceiptsForUsageEvents } from "@/lib/webhooks";

/** OTLP/HTTP JSON receiver for Codex OTel logs. Configure Codex with protocol = "json". */
export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  let payload:unknown; try { payload=await request.json(); } catch { return NextResponse.json({error:"Governor accepts OTLP JSON on this endpoint"},{status:415}); }
  const events=normalizeOtlpLogs(payload); const results=await Promise.all(events.map((event)=>ingestUsage(store,developer.id,event).catch((error)=>({error:error instanceof Error?error.message:"Invalid event",model:event.model,occurredAt:event.occurredAt,hasSessionId:Boolean(event.sessionId)}))));
  const rejected=results.filter((result)=>"error" in result);
  if(rejected.length) console.warn("Governor rejected OTLP usage events",{count:rejected.length,reasons:[...new Set(rejected.map((result)=>result.error))],events:rejected.map((result)=>({model:result.model,occurredAt:result.occurredAt,hasSessionId:result.hasSessionId}))});
  const insertedEvents=results.flatMap((result)=>"inserted" in result && result.inserted && result.event ? [result.event] : []);
  let receiptsRefreshed=0;
  try { receiptsRefreshed=(await refreshPullRequestReceiptsForUsageEvents(store,insertedEvents)).refreshed; } catch { console.warn("Governor could not refresh receipts after OTLP intake"); }
  return NextResponse.json({accepted:results.filter((result)=>"inserted" in result && result.inserted).length,pending:results.filter((result)=>"pending" in result && result.pending).length,rejected:rejected.length,ignored:events.length-results.length,receiptsRefreshed,results});
}
