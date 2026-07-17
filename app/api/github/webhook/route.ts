import { NextResponse } from "next/server";
import { verifyGitHubSignature } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { handleGitHubWebhook } from "@/lib/webhooks";

export async function POST(request: Request) {
  const raw=await request.text(); if(!verifyGitHubSignature(raw,request.headers.get("x-hub-signature-256"))) return NextResponse.json({error:"Invalid GitHub signature"},{status:401});
  let payload:Record<string,unknown>; try { payload=JSON.parse(raw); } catch { return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  const result=await handleGitHubWebhook(getStore(),request.headers.get("x-github-event") ?? "",payload); return NextResponse.json(result,{status:202});
}
