import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { verifyState } from "@/lib/webhooks";

export async function GET(request: Request) {
  const url=new URL(request.url); const code=url.searchParams.get("code"); const state=url.searchParams.get("state"); if(!code || !state || !verifyState(state)) return new NextResponse("Invalid or expired GitHub authorization request.",{status:400});
  const clientId=process.env.GITHUB_OAUTH_CLIENT_ID; const clientSecret=process.env.GITHUB_OAUTH_CLIENT_SECRET; if(!clientId || !clientSecret) return new NextResponse("GitHub OAuth is not configured.",{status:503});
  const tokenResponse=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{accept:"application/json","content-type":"application/json"},body:JSON.stringify({client_id:clientId,client_secret:clientSecret,code})}); const tokenPayload=await tokenResponse.json() as {access_token?:string}; if(!tokenPayload.access_token) return new NextResponse("GitHub did not return an access token.",{status:401});
  const userResponse=await fetch("https://api.github.com/user",{headers:{authorization:`Bearer ${tokenPayload.access_token}`,accept:"application/vnd.github+json"}}); const user=await userResponse.json() as {login?:string;email?:string}; if(!user.login) return new NextResponse("GitHub did not return a user identity.",{status:401}); const token=`gov_${crypto.randomBytes(24).toString("base64url")}`; await getStore().createDeveloper({githubLogin:user.login,email:user.email,token});
  return new NextResponse(`<!doctype html><title>Governor connected</title><body style="font-family:system-ui;max-width:700px;margin:3rem auto"><h1>Governor connected</h1><p>Run this command on your development machine. Treat the token like a password.</p><pre>npx governor join --url ${process.env.GOVERNOR_URL ?? new URL(request.url).origin} --token ${token}</pre></body>`,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
}
