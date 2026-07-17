import assert from "node:assert/strict";
import test from "node:test";
import { MemoryGovernorStore } from "../lib/store";
import { handleGitHubWebhook } from "../lib/webhooks";

test("PR synchronize writes a calculated receipt without requiring GitHub credentials",async()=>{
  const store=new MemoryGovernorStore(); const result=await handleGitHubWebhook(store,"pull_request",{action:"synchronize",installation:{id:1},repository:{id:99,full_name:"acme/checkout",default_branch:"main"},number:412,pull_request:{head:{ref:"fix/cart-race",sha:"4b46ac"},title:"Prevent cart race conditions",state:"open"}});
  assert.equal(result.handled,true); const repo=await store.getRepositoryBySlug("acme/checkout"); assert.ok(repo); const receipt=await store.getReceipt(repo.id,412); assert.ok(receipt); assert.ok(receipt.totalCost>0); assert.equal(receipt.models[0]?.model,"gpt-5.6");
});

test("push produces a commit receipt even when no PR exists",async()=>{
  const store=new MemoryGovernorStore(); const result=await handleGitHubWebhook(store,"push",{installation:{id:1},repository:{id:99,full_name:"acme/checkout",default_branch:"main"},ref:"refs/heads/fix/cart-race",after:"4b46ac"});
  assert.equal(result.handled,true);
});
