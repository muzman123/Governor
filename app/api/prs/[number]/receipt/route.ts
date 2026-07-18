import { NextResponse } from "next/server";
import { requireRepositoryAccess } from "@/lib/app-access";
import { getStore } from "@/lib/store";

export async function GET(request: Request, {params}:{params:Promise<{number:string}>}) { try { const repoSlug=new URL(request.url).searchParams.get("repo"); if(!repoSlug) return NextResponse.json({error:"repo query parameter is required"},{status:400}); const access=await requireRepositoryAccess(repoSlug); const receipt=await getStore().getReceipt(access.repository.id,Number((await params).number)); return receipt?NextResponse.json(receipt):NextResponse.json({error:"Receipt not found"},{status:404}); } catch (error) { const unauthenticated=error instanceof Error && error.message==="UNAUTHENTICATED"; return NextResponse.json({error:unauthenticated?"Sign in required":"Repository not found"},{status:unauthenticated?401:404}); } }
