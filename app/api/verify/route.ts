import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  const store = getStore();
  const developer = token ? await store.getDeveloperByToken(token) : undefined;
  if (!developer) return NextResponse.json({ error: "Invalid developer telemetry token" }, { status: 401 });

  const after = new URL(request.url).searchParams.get("after");
  if (!after || Number.isNaN(Date.parse(after))) {
    return NextResponse.json({ error: "after must be an ISO-8601 timestamp" }, { status: 400 });
  }

  return NextResponse.json({ sessions: await store.getVerificationSessions(developer.id, after) });
}
