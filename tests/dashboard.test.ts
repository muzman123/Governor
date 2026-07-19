import assert from "node:assert/strict";
import test from "node:test";
import { repositoryOverview } from "../lib/dashboard";
import { MemoryGovernorStore } from "../lib/store";

test("repository overview tolerates a Date timestamp returned by a database driver",async()=>{
  const store=new MemoryGovernorStore();
  const source=store.getEvents.bind(store);
  store.getEvents=async(repositoryId,options)=>{
    const events=await source(repositoryId,options);
    return events.map((event,index)=>index===0?{...event,occurredAt:new Date(event.occurredAt) as unknown as string}:event);
  };
  const overview=await repositoryOverview(store,"repo_demo");
  assert.ok(overview.spendTrend.length>0);
  assert.equal(typeof overview.recentEvents[0]?.occurredAt,"string");
});
