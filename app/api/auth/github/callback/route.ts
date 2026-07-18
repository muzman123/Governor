import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAppSession, appSessionCookie } from "@/lib/session";
import { getStore } from "@/lib/store";
import { verifyState } from "@/lib/webhooks";

export async function GET(request: Request) {
  const url=new URL(request.url); const code=url.searchParams.get("code"); const state=url.searchParams.get("state"); const statePayload=state?verifyState(state):undefined;
  if(!code || !statePayload) return new NextResponse("Invalid or expired GitHub authorization request.",{status:400});
  const clientId=process.env.GITHUB_OAUTH_CLIENT_ID; const clientSecret=process.env.GITHUB_OAUTH_CLIENT_SECRET; if(!clientId || !clientSecret) return new NextResponse("GitHub OAuth is not configured.",{status:503});
  const tokenResponse=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{accept:"application/json","content-type":"application/json"},body:JSON.stringify({client_id:clientId,client_secret:clientSecret,code})}); const tokenPayload=await tokenResponse.json() as {access_token?:string};
  if(!tokenPayload.access_token) return new NextResponse("GitHub did not return an access token.",{status:401});
  const userResponse=await fetch("https://api.github.com/user",{headers:{authorization:`Bearer ${tokenPayload.access_token}`,accept:"application/vnd.github+json"}}); const user=await userResponse.json() as {login?:string;email?:string}; if(!user.login) return new NextResponse("GitHub did not return a user identity.",{status:401});
  const store=getStore(); let developer=await store.getDeveloperByGithubLogin(user.login); let setupToken:string|undefined;
  if(!developer) { setupToken=`gov_${crypto.randomBytes(24).toString("base64url")}`; developer=await store.createDeveloper({githubLogin:user.login,email:user.email,token:setupToken}); }
  const session=await createAppSession({developerId:developer.id,githubLogin:developer.githubLogin,githubAccessToken:tokenPayload.access_token,setupToken});
  const response=NextResponse.redirect(new URL(statePayload.returnTo,process.env.GOVERNOR_URL ?? new URL(request.url).origin)); response.cookies.set(appSessionCookie(session.raw)); return response;
}
