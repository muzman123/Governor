import assert from "node:assert/strict";
import test from "node:test";
import { estimateCost, resolveRate } from "../lib/pricing";

const rates=[
  {model:"gpt-5.6",effectiveFrom:"2026-01-01",inputPerMTok:2,outputPerMTok:10,cachedInputPerMTok:.2},
  {model:"gpt-5.6",effectiveFrom:"2026-06-01",inputPerMTok:3,outputPerMTok:12,cachedInputPerMTok:.3}
];

test("pricing selects the most recent effective rate and prices cache separately",()=>{
  const rate=resolveRate("gpt-5.6","2026-07-16T00:00:00.000Z",rates);
  assert.equal(rate.inputPerMTok,3);
  assert.equal(estimateCost({inputTokens:1_000_000,outputTokens:100_000,cachedInputTokens:400_000},rate),3.12);
});

test("pricing rejects a model without an explicit rate",()=>{
  assert.throws(()=>resolveRate("unknown","2026-07-16T00:00:00.000Z",rates),/No effective Governor rate/);
});
