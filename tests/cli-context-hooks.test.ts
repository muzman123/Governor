import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const runGovernor=(args:string[],env:NodeJS.ProcessEnv)=>new Promise<{code:number|null;output:string}>((resolve,reject)=>{
  const child=spawn(process.execPath,[path.join(process.cwd(),"packages","cli","bin","governor.mjs"),...args],{env});
  let output=""; child.stdout.on("data",(chunk)=>output+=String(chunk)); child.stderr.on("data",(chunk)=>output+=String(chunk)); child.once("error",reject); child.once("close",(code)=>resolve({code,output}));
});

test("Governor configures desktop telemetry without Codex lifecycle hooks and upgrades away obsolete hooks",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"governor-hooks-")); const codexHome=path.join(root,"codex"); const home=path.join(root,"home"); const env={...process.env,CODEX_HOME:codexHome,HOME:home,USERPROFILE:home};
  try {
    await fs.mkdir(codexHome,{recursive:true}); await fs.writeFile(path.join(codexHome,"config.toml"),"model = \"gpt-5.6\"\n");
    const joined=await runGovernor(["join","--url","https://governor.example","--token","test-token"],env);
    assert.equal(joined.code,0,joined.output);
    const config=await fs.readFile(path.join(codexHome,"config.toml"),"utf8"); assert.match(config,/model = "gpt-5\.6"/); assert.match(config,/\[otel\]/); assert.match(config,/notify = \[/);
    await assert.rejects(fs.access(path.join(codexHome,"hooks.json")));

    const hooksPath=path.join(codexHome,"hooks.json");
    await fs.writeFile(hooksPath,JSON.stringify({hooks:{UserPromptSubmit:[{hooks:[{type:"command",command:"node governor.mjs context turn_start"},{type:"command",command:"node keep-me.mjs"}]}]}}));
    const upgrade=await runGovernor(["upgrade"],env);
    assert.equal(upgrade.code,0,upgrade.output); assert.match(upgrade.output,/No Codex CLI or hook approval is required/i);
    const hooks=JSON.parse(await fs.readFile(hooksPath,"utf8")) as {hooks:{UserPromptSubmit?:Array<{hooks?:Array<{command?:string}>}>}};
    const handlers=hooks.hooks.UserPromptSubmit?.flatMap((group)=>group.hooks ?? []).map((handler)=>handler.command) ?? [];
    assert.deepEqual(handlers,["node keep-me.mjs"]);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
