import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/app-access";
import { consumeSetupToken } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function GET() { try { const {session}=await requireWorkspaceSession(); const oneTime=await consumeSetupToken(session.id); return NextResponse.json({token:oneTime ?? null}); } catch { return NextResponse.json({error:"Sign in required"},{status:401}); } }
export async function POST() { try { const {developer}=await requireWorkspaceSession(); const token=`gov_${crypto.randomBytes(24).toString("base64url")}`; await getStore().rotateDeveloperToken(developer.id,token); return NextResponse.json({token}); } catch { return NextResponse.json({error:"Sign in required"},{status:401}); } }
