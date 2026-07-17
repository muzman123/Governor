import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { ingestUsage, UsageSchema } from "@/lib/ingest";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  const parsed=UsageSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  try { const result=await ingestUsage(store,developer.id,parsed.data); return NextResponse.json({inserted:result.inserted,event:result.event}); } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Ingest failed"},{status:400}); }
}
