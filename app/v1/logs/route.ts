import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { ingestUsage, normalizeOtlpLogs } from "@/lib/ingest";
import { getStore } from "@/lib/store";

/** OTLP/HTTP JSON receiver for Codex OTel logs. Configure Codex with protocol = "json". */
export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  let payload:unknown; try { payload=await request.json(); } catch { return NextResponse.json({error:"Governor accepts OTLP JSON on this endpoint"},{status:415}); }
  const events=normalizeOtlpLogs(payload); const results=await Promise.all(events.map((event)=>ingestUsage(store,developer.id,event).catch((error)=>({error:error instanceof Error?error.message:"Invalid event"}))));
  return NextResponse.json({accepted:results.filter((result)=>"inserted" in result && result.inserted).length,ignored:events.length-results.length,results});
}
