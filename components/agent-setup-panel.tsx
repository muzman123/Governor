"use client";

import { useState } from "react";

type State = "idle" | "loading" | "ready" | "error";

export function AgentSetupPanel({repositorySlug,governorUrl,configured}:{repositorySlug:string;governorUrl:string;configured:boolean}) {
  const [state,setState]=useState<State>("idle"); const [token,setToken]=useState<string>(); const [copied,setCopied]=useState<"token"|"workflow"|undefined>(); const [isConfigured,setIsConfigured]=useState(configured);
  const endpoint=`/api/app/repositories/${repositorySlug}/agent-token`;
  const workflow=`# Save the returned token as the GOVERNOR_AGENT_TOKEN repository secret.
- name: Run Codex and save usage JSONL
  run: |
    CODEX_API_KEY="\${{ secrets.OPENAI_API_KEY }}" npx --yes @openai/codex exec --json --sandbox workspace-write --model gpt-5.6 "Review this pull request." | tee "$RUNNER_TEMP/codex.jsonl"

- name: Record autonomous-agent cost
  uses: muzman123/Governor/.github/actions/governor-capture@main
  with:
    governor-url: ${governorUrl}
    token: \${{ secrets.GOVERNOR_AGENT_TOKEN }}
    session-file: \${{ runner.temp }}/codex.jsonl
    model: gpt-5.6
    branch: \${{ github.head_ref || github.ref_name }}
    sha: \${{ github.event.pull_request.head.sha || github.sha }}`;
  const copy=async(kind:"token"|"workflow",value:string)=>{ await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(()=>setCopied(undefined),1600); };
  const issue=async()=>{
    setState("loading");
    try {
      const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({label:"GitHub Actions"})}); const data=await response.json();
      if(!response.ok || !data.token) throw new Error(data.error ?? "Token generation failed"); setToken(data.token); setIsConfigured(true); setState("ready");
    } catch { setState("error"); }
  };
  const secretsUrl=`https://github.com/${repositorySlug}/settings/secrets/actions`;

  return <section className="panel agent-setup">
    <div className="panel-heading"><div><div className="eyebrow">Autonomous agents</div><h2>Record Codex work done in GitHub Actions</h2></div><span className={`agent-configured ${isConfigured?"ready":""}`}>{isConfigured?"Agent token configured":"Not connected"}</span></div>
    <p>Governor can receive a prompt-safe token receipt from a Codex CI job. The token is scoped to <strong>{repositorySlug}</strong> only, and Actions supplies the repository, branch, commit, and workflow-run context.</p>
    {state==="error"&&<div className="setup-status error"><strong>Could not create an agent token.</strong><span>Refresh and try again. Your existing token remains unchanged when generation fails.</span></div>}
    {state==="ready"&&token?<div className="agent-token-result"><div className="setup-status"><strong>Save this once as the <code>GOVERNOR_AGENT_TOKEN</code> GitHub Actions secret.</strong><span>Creating another token replaces this one and stops the old runner credential.</span></div><code>{token}</code><div className="command-actions"><button className="button" onClick={()=>copy("token",token)}>{copied==="token"?"Copied":"Copy agent token"}</button><a className="text-button" href={secretsUrl} target="_blank">Open Actions Secrets →</a></div><div className="agent-workflow"><div className="eyebrow">Then add this workflow step</div><code>{workflow}</code><button className="refresh-button" onClick={()=>copy("workflow",workflow)}>{copied==="workflow"?"Copied":"Copy workflow"}</button></div></div>:
      <div className="command-actions"><button className="button" disabled={state==="loading"} onClick={issue}>{state==="loading"?"Creating secure token…":isConfigured?"Replace agent token":"Create agent token"}</button>{isConfigured&&<small>Replacement invalidates the existing GitHub Actions secret.</small>}</div>}
    <p className="command-note">Governor reads only the Codex JSONL <code>turn.completed</code> token-usage record. It never uploads prompts, agent messages, command output, or generated code.</p>
  </section>;
}
