"use client";

import { useEffect, useState } from "react";

type SetupState = "loading" | "ready" | "connected" | "error";

export function SetupPanel({url,githubAppUrl}:{url:string;githubAppUrl?:string}) {
  const [token,setToken]=useState<string>();
  const [state,setState]=useState<SetupState>("loading");
  const [copied,setCopied]=useState<"join"|"verify"|undefined>();
  const [verified,setVerified]=useState(false);

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
    try { const response=await fetch("/api/app/setup/token",{method:"POST"}); const data=await response.json(); if(!response.ok || !data.token) throw new Error(data.error); setToken(data.token); setState("ready"); }
    catch { setState("error"); }
  };
  const joinCommand=token?`npx --yes @muzman123/governor@latest connect --url ${url} --token ${token}`:"";
  const verifyCommand="npx --yes @muzman123/governor@latest verify --wait 180";
  const copy=async(kind:"join"|"verify",value:string)=>{ await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(()=>setCopied(undefined),1600); };

  return <section className="setup-command">
    <div className="command-heading"><div><div className="eyebrow">Local Codex connection</div><h2>{state==="connected"?"Connection already issued":"Connect Codex safely"}</h2></div>{githubAppUrl&&<a className="text-button" href={githubAppUrl} target="_blank">Manage GitHub App -&gt;</a>}</div>
    {state==="loading"&&<p>Checking your setup status...</p>}
    {state==="error"&&<div className="setup-status error"><strong>We could not load a setup command.</strong><span>Refresh the page, then sign in again if the problem continues.</span></div>}
    {state==="ready"&&<>
      <p>Run this one-time command from any terminal. It downloads Governor automatically, preserves existing Codex notifications, keeps prompt collection disabled, and waits for verification.</p>
      <code>{joinCommand}</code>
      <div className="command-actions"><button className="button" onClick={()=>copy("join",joinCommand)}>{copied==="join"?"Copied":"Copy setup command"}</button></div>
      <p className="command-note">Treat this token like a password. It is shown once for this connection.</p>
    </>}
    {state==="connected"&&<>
      <div className="setup-status"><strong>Governor has already issued a local connection for this account.</strong><span>Use verification below to confirm it is working. Only replace the command if you are connecting a new machine or repairing Codex.</span></div>
      <button className="text-button replace-token" onClick={replaceConnection}>Create a replacement command</button>
    </>}
    {verified?<section className="setup-status verified"><strong>Verified: Governor joined a real Codex usage event to signed Git context.</strong><span>Your next push or pull request can now receive a cost receipt.</span></section>:state==="ready"&&<section className="verify-command"><div><div className="eyebrow">Then finish verification</div><strong>Restart Codex while the command is waiting, then complete one real task from the connected repository.</strong></div><p>This page checks every few seconds and will confirm success as soon as Governor joins signed Git context to the matching usage event.</p></section>}
    {state==="connected"&&<section className="verify-command"><div><div className="eyebrow">Verify an existing connection</div><strong>Restart Codex if you recently changed its configuration, then run:</strong></div><code>{verifyCommand}</code><button className="refresh-button" onClick={()=>copy("verify",verifyCommand)}>{copied==="verify"?"Copied":"Copy"}</button><p>While it waits, complete one real Codex request from the connected repository.</p></section>}
  </section>;
}
