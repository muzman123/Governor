import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRepositoryAccess } from "@/lib/app-access";
import { getStore } from "@/lib/store";

const tokenRequest=z.object({label:z.string().trim().min(1).max(100).optional()});

export async function GET(_:Request,{params}:{params:Promise<{owner:string;repo:string}>}) {
  try {
    const {owner,repo}=await params; const access=await requireRepositoryAccess(`${owner}/${repo}`);
    return NextResponse.json({configured:await getStore().hasActiveAgentToken(access.repository.id)});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error && error.message==="UNAUTHENTICATED"?"Sign in required":"Repository not found"},{status:error instanceof Error && error.message==="UNAUTHENTICATED"?401:404});
  }
}

/** Replaces the active repository-scoped Actions credential and returns it once. */
export async function POST(request:Request,{params}:{params:Promise<{owner:string;repo:string}>}) {
  try {
    const {owner,repo}=await params; const access=await requireRepositoryAccess(`${owner}/${repo}`); const parsed=tokenRequest.safeParse(await request.json().catch(()=>({})));
    if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
    const token=`gov_agent_${crypto.randomBytes(24).toString("base64url")}`;
    const agent=await getStore().issueAgentToken({repositoryId:access.repository.id,createdByDeveloperId:access.developer.id,label:parsed.data.label ?? "GitHub Actions",token});
    return NextResponse.json({token,label:agent.label});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error && error.message==="UNAUTHENTICATED"?"Sign in required":"Repository not found"},{status:error instanceof Error && error.message==="UNAUTHENTICATED"?401:404});
  }
}
