import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { ContextSchema } from "@/lib/ingest";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  const token=bearerToken(request.headers.get("authorization")); const store=getStore(); const developer=token ? await store.getDeveloperByToken(token) : undefined;
  if(!developer) return NextResponse.json({error:"Invalid developer telemetry token"},{status:401});
  const parsed=ContextSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.flatten()},{status:400});
  const context={...parsed.data,developerId:developer.id,observedAt:parsed.data.observedAt ?? new Date().toISOString()};
  await store.saveContext(context); return NextResponse.json({ok:true,context});
}
