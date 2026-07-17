import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(request: Request, {params}:{params:Promise<{number:string}>}) { const repoSlug=new URL(request.url).searchParams.get("repo"); if(!repoSlug) return NextResponse.json({error:"repo query parameter is required"},{status:400}); const repo=await getStore().getRepositoryBySlug(repoSlug); if(!repo) return NextResponse.json({error:"Repository not found"},{status:404}); const receipt=await getStore().getReceipt(repo.id,Number((await params).number)); return receipt?NextResponse.json(receipt):NextResponse.json({error:"Receipt not found"},{status:404}); }
