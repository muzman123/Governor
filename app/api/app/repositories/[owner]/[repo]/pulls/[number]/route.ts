import { NextResponse } from "next/server";
import { requireRepositoryAccess } from "@/lib/app-access";
import { observeReceipt } from "@/lib/observations";
import { getStore } from "@/lib/store";

export async function GET(_:Request,{params}:{params:Promise<{owner:string;repo:string;number:string}>}) { try { const {owner,repo,number}=await params; const access=await requireRepositoryAccess(`${owner}/${repo}`); const store=getStore(); const receipt=await store.getReceipt(access.repository.id,Number(number)); if(!receipt) return NextResponse.json({error:"Receipt not found"},{status:404}); const pr=await store.getPullRequest(access.repository.id,receipt.prNumber); const events=await store.getEvents(access.repository.id); if(!receipt.observation) receipt.observation=observeReceipt(receipt,events.filter((event)=>event.branch===pr?.branch),events.filter((event)=>event.branch!==pr?.branch),access.overview.receipts); return NextResponse.json(receipt); } catch (error) { return NextResponse.json({error:error instanceof Error && error.message==="UNAUTHENTICATED"?"Sign in required":"Repository not found"},{status:error instanceof Error && error.message==="UNAUTHENTICATED"?401:404}); } }
