import assert from "node:assert/strict";
import test from "node:test";
import { MemoryGovernorStore } from "../lib/store";
import { ingestUsage } from "../lib/ingest";

test("verification distinguishes received git context from a joined usage event", async () => {
  const store = new MemoryGovernorStore();
  const developer = await store.createDeveloper({ githubLogin:"maya", token:"verify-token" });
  const observedAt = "2026-07-17T09:00:00.000Z";
  await store.saveContext({ sessionId:"verify-session", repositorySlug:"acme/checkout", branch:"feature/verify", headSha:"abc1234", developerId:developer.id, observedAt });

  const beforeUsage = await store.getVerificationSessions(developer.id, "2026-07-17T08:59:00.000Z");
  assert.equal(beforeUsage[0]?.eventCount, 0);

  await ingestUsage(store, developer.id, { eventKey:"verify-event", source:"otel", sessionId:"verify-session", model:"gpt-5.6", inputTokens:10, outputTokens:2, cachedInputTokens:0, occurredAt:"2026-07-17T09:00:01.000Z" });
  const joined = await store.getVerificationSessions(developer.id, "2026-07-17T08:59:00.000Z");
  assert.equal(joined[0]?.eventCount, 1);
  assert.equal(joined[0]?.repositorySlug, "acme/checkout");
});
