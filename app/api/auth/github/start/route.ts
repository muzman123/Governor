import { NextResponse } from "next/server";
import { signingState } from "@/lib/webhooks";

export async function GET(request: Request) { const clientId=process.env.GITHUB_OAUTH_CLIENT_ID; if(!clientId) return NextResponse.json({error:"GitHub OAuth is not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET."},{status:503}); const url=new URL("https://github.com/login/oauth/authorize"); url.searchParams.set("client_id",clientId); url.searchParams.set("redirect_uri",new URL("/api/auth/callback",process.env.GOVERNOR_URL ?? new URL(request.url).origin).toString()); url.searchParams.set("scope","read:user user:email repo"); url.searchParams.set("state",signingState("/app/setup")); return NextResponse.redirect(url); }
