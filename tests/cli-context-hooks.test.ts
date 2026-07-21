import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("Governor installs pre-turn and post-shell Git-context hooks without replacing existing config",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"governor-hooks-")); const codexHome=path.join(root,"codex"); const home=path.join(root,"home");
  try {
    await fs.mkdir(codexHome,{recursive:true}); await fs.writeFile(path.join(codexHome,"config.toml"),"model = \"gpt-5.6\"\n");
    const result=await new Promise<{code:number|null;output:string}>((resolve,reject)=>{
      const child=spawn(process.execPath,[path.join(process.cwd(),"packages","cli","bin","governor.mjs"),"join","--url","https://governor.example","--token","test-token"],{env:{...process.env,CODEX_HOME:codexHome,HOME:home,USERPROFILE:home}});
      let output=""; child.stdout.on("data",(chunk)=>output+=String(chunk)); child.stderr.on("data",(chunk)=>output+=String(chunk)); child.once("error",reject); child.once("close",(code)=>resolve({code,output}));
    });
    assert.equal(result.code,0,result.output);
    const config=await fs.readFile(path.join(codexHome,"config.toml"),"utf8"); assert.match(config,/model = "gpt-5\.6"/); assert.match(config,/\[otel\]/); assert.match(config,/notify = \[/);
    const hooks=JSON.parse(await fs.readFile(path.join(codexHome,"hooks.json"),"utf8")) as {hooks:Record<string,Array<{matcher?:string;hooks?:Array<{command?:string}>}>>};
    const command=(event:string)=>hooks.hooks[event]?.flatMap((group)=>group.hooks ?? []).map((handler)=>handler.command ?? "").find((value)=>/governor\.mjs["']?\s+context\b/.test(value));
    assert.match(command("UserPromptSubmit") ?? "",/context turn_start/,JSON.stringify(hooks)); assert.match(command("PostToolUse") ?? "",/context post_tool/,JSON.stringify(hooks)); assert.ok(hooks.hooks.PostToolUse?.some((group)=>group.matcher==="^Bash$"),JSON.stringify(hooks));
    const upgrade=await new Promise<{code:number|null;output:string}>((resolve,reject)=>{
      const child=spawn(process.execPath,[path.join(process.cwd(),"packages","cli","bin","governor.mjs"),"upgrade"],{env:{...process.env,CODEX_HOME:codexHome,HOME:home,USERPROFILE:home}});
      let output=""; child.stdout.on("data",(chunk)=>output+=String(chunk)); child.stderr.on("data",(chunk)=>output+=String(chunk)); child.once("error",reject); child.once("close",(code)=>resolve({code,output}));
    });
    assert.equal(upgrade.code,0,upgrade.output); assert.match(upgrade.output,/local runtime upgraded/i);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
