import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

test("Actions capture uploads only the Codex token-completion record and deterministic workflow context",async()=>{
  const received:unknown[]=[]; const server=createServer(async(request,response)=>{
    let body=""; for await(const chunk of request) body+=chunk;
    received.push({url:request.url,body:JSON.parse(body)}); response.writeHead(200,{"content-type":"application/json"}); response.end(JSON.stringify(request.url==="/api/ingest/actions/finalize"?{refreshed:1}:{inserted:true}));
  });
  await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve)); const address=server.address(); assert.ok(address && typeof address!=="string");
  try {
    const result=await new Promise<{code:number|null;output:string}>((resolve,reject)=>{
      const child=spawn(process.execPath,[path.join(process.cwd(),"packages","cli","bin","governor.mjs"),"capture","--file",path.join(process.cwd(),"tests","fixtures","codex-exec-turn.jsonl"),"--repository","acme/checkout","--branch","feature/agent","--sha","abc1234","--model","gpt-5.6","--workflow-run-id","42","--workflow-run-url","https://github.com/acme/checkout/actions/runs/42","--workflow-name","Codex review"],{env:{...process.env,GOVERNOR_URL:`http://127.0.0.1:${address.port}`,GOVERNOR_AGENT_TOKEN:"agent-test-token"}});
      let output=""; child.stdout.on("data",(chunk)=>output+=String(chunk)); child.stderr.on("data",(chunk)=>output+=String(chunk)); child.once("error",reject); child.once("close",(code)=>resolve({code,output}));
    });
    assert.equal(result.code,0,result.output); assert.match(result.output,/uploaded 1 GitHub Actions usage record/i); assert.match(result.output,/Refreshed 1 matching pull-request receipt/i); assert.equal(received.length,2);
    const request=received[0] as {url:string;body:Record<string,unknown>}; assert.equal(request.url,"/api/ingest/actions"); const {eventKey,occurredAt,...payload}=request.body; assert.equal(typeof eventKey,"string"); assert.equal(typeof occurredAt,"string"); assert.deepEqual(payload,{sessionId:"thread_agent_1",model:"gpt-5.6",inputTokens:1200,outputTokens:42,cachedInputTokens:900,repositorySlug:"acme/checkout",branch:"feature/agent",headSha:"abc1234",workflowRunId:"42",workflowRunUrl:"https://github.com/acme/checkout/actions/runs/42",workflowName:"Codex review"});
    assert.deepEqual(received[1],{url:"/api/ingest/actions/finalize",body:{repositorySlug:"acme/checkout",branch:"feature/agent"}});
  } finally { await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve())); }
});
