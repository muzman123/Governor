"use client";

import { useEffect, useState } from "react";

type SetupState = "loading" | "ready" | "connected" | "error";

export function SetupPanel({url,githubAppUrl}:{url:string;githubAppUrl?:string}) {
  const [token,setToken]=useState<string>();
  const [state,setState]=useState<SetupState>("loading");
  const [copied,setCopied]=useState<"join"|"verify"|undefined>();

  useEffect(()=>{
    fetch("/api/app/setup/token")
      .then(async(response)=>({ok:response.ok,data:await response.json()}))
      .then(({ok,data})=>{ if(!ok) throw new Error(data.error); setToken(data.token ?? undefined); setState(data.token?"ready":"connected"); })
      .catch(()=>setState("error"));
  },[]);

  const replaceConnection=async()=>{
    setState("loading");
    try { const response=await fetch("/api/app/setup/token",{method:"POST"}); const data=await response.json(); if(!response.ok || !data.token) throw new Error(data.error); setToken(data.token); setState("ready"); }
    catch { setState("error"); }
  };
  const joinCommand=token?`npm run governor -- join --url ${url} --token ${token}`:"";
  const verifyCommand="node .\\packages\\cli\\bin\\governor.mjs verify 180";
  const copy=async(kind:"join"|"verify",value:string)=>{ await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(()=>setCopied(undefined),1600); };

  return <section className="setup-command">
    <div className="command-heading"><div><div className="eyebrow">Local Codex connection</div><h2>{state==="connected"?"Connection already issued":"Connect Codex safely"}</h2></div>{githubAppUrl&&<a className="text-button" href={githubAppUrl} target="_blank">Manage GitHub App -&gt;</a>}</div>
    {state==="loading"&&<p>Checking your setup status...</p>}
    {state==="error"&&<div className="setup-status error"><strong>We could not load a setup command.</strong><span>Refresh the page, then sign in again if the problem continues.</span></div>}
    {state==="ready"&&<>
      <p>From your local <strong>Governor project folder</strong>, run this one-time command. It preserves existing Codex notifications and keeps prompt collection disabled.</p>
      <code>{joinCommand}</code>
      <div className="command-actions"><button className="button" onClick={()=>copy("join",joinCommand)}>{copied==="join"?"Copied":"Copy setup command"}</button></div>
      <p className="command-note">Treat this token like a password. It is shown once for this connection.</p>
    </>}
    {state==="connected"&&<>
      <div className="setup-status"><strong>Governor has already issued a local connection for this account.</strong><span>Use verification below to confirm it is working. Only replace the command if you are connecting a new machine or repairing Codex.</span></div>
      <button className="text-button replace-token" onClick={replaceConnection}>Create a replacement command</button>
    </>}
    {(state==="ready" || state==="connected")&&<section className="verify-command"><div><div className="eyebrow">Next: verify it</div><strong>Restart Codex, then run this from the same Governor folder.</strong></div><code>{verifyCommand}</code><button className="refresh-button" onClick={()=>copy("verify",verifyCommand)}>{copied==="verify"?"Copied":"Copy"}</button><p>While it waits, complete one real Codex request from the connected repository. Governor will confirm the signed Git context and matching usage event.</p></section>}
  </section>;
}
