import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { AgentUsageSchema, ingestAgentUsage } from "@/lib/ingest";
import { getStore } from "@/lib/store";

/**
 * GitHub Actions-only ingestion. A repository-scoped agent token can submit
 * token metadata for exactly one installed repository; prompts/transcripts are
 * neither accepted nor persisted.
 */
export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const agent=token ? await store.getAgentTokenByToken(token) : undefined;
  if(!agent) return NextResponse.json({error:"Invalid or revoked Governor agent token"},{status:401});
  const parsed=AgentUsageSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  try {
    const result=await ingestAgentUsage(store,agent,parsed.data);
    return NextResponse.json({inserted:result.inserted,event:result.event});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"Agent ingest failed"},{status:400});
  }
}
