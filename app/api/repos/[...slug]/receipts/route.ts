import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(_: Request, {params}:{params:Promise<{slug:string[]}>}) { const slug=(await params).slug.join("/"); const repo=await getStore().getRepositoryBySlug(slug); if(!repo) return NextResponse.json({error:"Repository not found"},{status:404}); return NextResponse.json(await getStore().getDashboard(repo.id)); }
