import { NextResponse } from "next/server";
import { requireRepositoryAccess } from "@/lib/app-access";

export async function GET(_:Request,{params}:{params:Promise<{owner:string;repo:string}>}) { try { const {owner,repo}=await params; const result=await requireRepositoryAccess(`${owner}/${repo}`); return NextResponse.json(result.overview); } catch (error) { return NextResponse.json({error:error instanceof Error && error.message==="UNAUTHENTICATED"?"Sign in required":"Repository not found"},{status:error instanceof Error && error.message==="UNAUTHENTICATED"?401:404}); } }
