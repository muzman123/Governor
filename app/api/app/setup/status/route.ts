import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/app-access";
import { getStore } from "@/lib/store";

export async function GET() {
  try {
    const {developer}=await requireWorkspaceSession();
    const after=new Date(Date.now()-7*24*60*60*1000).toISOString();
    const sessions=await getStore().getVerificationSessions(developer.id,after);
    const verified=sessions.find((session)=>session.eventCount>0);
    return NextResponse.json({verified:Boolean(verified),session:verified ?? null});
  } catch {
    return NextResponse.json({error:"Sign in required"},{status:401});
  }
}
