"use client";

import { useEffect, useState } from "react";

type SetupState = "loading" | "ready" | "connected" | "error";

export function SetupPanel({url,githubAppUrl}:{url:string;githubAppUrl?:string}) {
  const [token,setToken]=useState<string>();
  const [state,setState]=useState<SetupState>("loading");
  const [copied,setCopied]=useState<"join"|"verify"|undefined>();
  const [verified,setVerified]=useState(false);
  const [replacing,setReplacing]=useState(false);

  useEffect(()=>{
    fetch("/api/app/setup/token")
      .then(async(response)=>({ok:response.ok,data:await response.json()}))
      .then(({ok,data})=>{ if(!ok) throw new Error(data.error); setToken(data.token ?? undefined); setState(data.token?"ready":"connected"); })
      .catch(()=>setState("error"));
  },[]);

  useEffect(()=>{
    let live=true;
    const check=async()=>{ try { const response=await fetch("/api/app/setup/status",{cache:"no-store"}); const data=await response.json(); if(live && data.verified) setVerified(true); } catch { /* setup can continue while status polling retries */ } };
    void check(); const interval=window.setInterval(check,5_000); return ()=>{live=false;window.clearInterval(interval);};
  },[]);

  const replaceConnection=async()=>{
    setState("loading");
    try { const response=await fetch("/api/app/setup/token",{method:"POST"}); const data=await response.json(); if(!response.ok || !data.token) throw new Error(data.error); setToken(data.token); setReplacing(true); setState("ready"); }
    catch { setState("error"); }
  };
  const joinCommand=token?`npx --yes @muzman123/governor@latest connect${replacing?" --replace":""} --url ${url} --token ${token}`:"";
  const verifyCommand="npx --yes @muzman123/governor@latest verify --wait 180";
  const copy=async(kind:"join"|"verify",value:string)=>{ await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(()=>setCopied(undefined),1600); };

  return <section className="setup-command">
    <div className="command-heading"><div><div className="eyebrow">Local Codex connection</div><h2>{state==="connected"?"Connection already issued":"Connect Codex safely"}</h2></div>{githubAppUrl&&<a className="text-button" href={githubAppUrl} target="_blank">Manage GitHub App -&gt;</a>}</div>
    {state==="loading"&&<p>Checking your setup status...</p>}
    {state==="error"&&<div className="setup-status error"><strong>We could not load a setup command.</strong><span>Refresh the page, then sign in again if the problem continues.</span></div>}
    {state==="ready"&&<>
      <p>{replacing ? "This replaces the connection on this computer." : "Run this command in a terminal."}</p>
      <code>{joinCommand}</code>
      <div className="command-actions"><button className="button" onClick={()=>copy("join",joinCommand)}>{copied==="join"?"Copied":"Copy setup command"}</button></div>
      <p className="command-note">Shown once for this connection.</p>
    </>}
    {state==="connected"&&<>
      <div className="setup-status"><strong>Connection already issued.</strong><span>Use verification below, or create a replacement for another machine.</span></div>
      <button className="text-button replace-token" onClick={replaceConnection}>Create replacement command</button>
    </>}
    {verified?<section className="setup-status verified"><strong>Verified.</strong><span>Receipts will appear on the next push or pull request.</span></section>:state==="ready"&&<section className="verify-command"><div><div className="eyebrow">Finish verification</div><strong>Restart Codex, then complete one task in the connected repository.</strong></div><p>This page checks for a matching usage event.</p></section>}
    {state==="connected"&&<section className="verify-command"><div><div className="eyebrow">Verify connection</div><strong>Run this after restarting Codex:</strong></div><code>{verifyCommand}</code><button className="refresh-button" onClick={()=>copy("verify",verifyCommand)}>{copied==="verify"?"Copied":"Copy"}</button><p>Complete one Codex task while it waits.</p></section>}
  </section>;
}
