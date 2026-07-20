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

test("PR close stores a merged or closed-unmerged outcome on the receipt",async()=>{
  const store=new MemoryGovernorStore(); const payload={action:"closed",installation:{id:1},repository:{id:99,full_name:"acme/checkout",default_branch:"main"},number:412,pull_request:{head:{ref:"fix/cart-race",sha:"4b46ac"},title:"Prevent cart race conditions",state:"closed",merged:true,merged_at:"2026-07-20T10:00:00.000Z",closed_at:"2026-07-20T10:00:00.000Z"}};
  const result=await handleGitHubWebhook(store,"pull_request",payload); assert.equal(result.handled,true);
  const repo=await store.getRepositoryBySlug("acme/checkout"); assert.ok(repo); const pr=await store.getPullRequest(repo.id,412); const receipt=await store.getReceipt(repo.id,412); const dashboard=await store.getDashboard(repo.id);
  assert.equal(pr?.outcome,"merged"); assert.equal(receipt?.outcome,"merged"); assert.equal(receipt?.actors.find((actor)=>actor.actorType==="agent")?.label,"Autonomous agent"); assert.equal(dashboard.metrics.outcomes.mergedCount,1); assert.ok((dashboard.metrics.outcomes.costPerMergedPr ?? 0)>0);
  const unmergedStore=new MemoryGovernorStore(); const unmergedPayload={...payload,number:413,pull_request:{...payload.pull_request,title:"Experiment that did not merge",merged:false,merged_at:null}}; await handleGitHubWebhook(unmergedStore,"pull_request",unmergedPayload); const unmergedRepo=await unmergedStore.getRepositoryBySlug("acme/checkout"); assert.ok(unmergedRepo); const unmerged=await unmergedStore.getReceipt(unmergedRepo.id,413); assert.equal(unmerged?.outcome,"closed_unmerged");
});
