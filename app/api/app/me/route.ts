import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/app-access";

export async function GET() { try { const {developer,session}=await requireWorkspaceSession(); return NextResponse.json({developer:{id:developer.id,githubLogin:developer.githubLogin,email:developer.email},session:{expiresAt:session.expiresAt,hasSetupToken:Boolean(session.setupToken)}}); } catch { return NextResponse.json({error:"Sign in required"},{status:401}); } }
