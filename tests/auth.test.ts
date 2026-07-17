import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { verifyGitHubSignature } from "../lib/auth";

test("GitHub signatures reject tampering",()=>{
  const previous=process.env.GITHUB_WEBHOOK_SECRET; process.env.GITHUB_WEBHOOK_SECRET="test-secret";
  const body='{"action":"push"}'; const signature=`sha256=${crypto.createHmac("sha256","test-secret").update(body).digest("hex")}`;
  assert.equal(verifyGitHubSignature(body,signature),true); assert.equal(verifyGitHubSignature(body+" ",signature),false);
  if(previous===undefined) delete process.env.GITHUB_WEBHOOK_SECRET; else process.env.GITHUB_WEBHOOK_SECRET=previous;
});
