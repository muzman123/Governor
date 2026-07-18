import { NextResponse } from "next/server";
import { clearAppSessionCookie, destroyAppSession } from "@/lib/session";

export async function POST(request:Request) { const cookie=request.headers.get("cookie")?.match(/(?:^|; )governor_session=([^;]+)/)?.[1]; await destroyAppSession(cookie); const response=NextResponse.json({ok:true}); response.cookies.set(clearAppSessionCookie); return response; }
