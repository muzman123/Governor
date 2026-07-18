import { NextResponse } from "next/server";
import { accessibleRepositories, requireWorkspaceSession } from "@/lib/app-access";
import { repositoryOverview } from "@/lib/dashboard";
import { getStore } from "@/lib/store";

export async function GET() { try { const {session}=await requireWorkspaceSession(); const repositories=await accessibleRepositories(session); const data=await Promise.all(repositories.map((repository)=>repositoryOverview(getStore(),repository.id))); return NextResponse.json({repositories:data}); } catch (error) { return NextResponse.json({error:error instanceof Error && error.message==="GITHUB_ACCESS_FAILED"?"GitHub access expired. Sign in again to refresh repository access.":"Sign in required"},{status:401}); } }
