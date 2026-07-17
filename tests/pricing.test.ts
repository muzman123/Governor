import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL_RATES, estimateCost, resolveRate } from "../lib/pricing";

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

test("includes the current Codex fallback model at its published token rates",()=>{
  const rate=resolveRate("gpt-5.4-mini","2026-07-17T00:00:00.000Z",DEFAULT_MODEL_RATES);
  assert.deepEqual(rate,{model:"gpt-5.4-mini",effectiveFrom:"2026-03-17",inputPerMTok:.75,outputPerMTok:4.5,cachedInputPerMTok:.075});
});

test("recognizes the current Codex picker model IDs",()=>{
  assert.equal(resolveRate("gpt-5.6-terra","2026-07-17T00:00:00.000Z",DEFAULT_MODEL_RATES).outputPerMTok,15);
  assert.equal(resolveRate("gpt-5.6-luna","2026-07-17T00:00:00.000Z",DEFAULT_MODEL_RATES).outputPerMTok,6);
  assert.equal(resolveRate("gpt-5.5","2026-07-17T00:00:00.000Z",DEFAULT_MODEL_RATES).outputPerMTok,30);
});

test("uses the documented Sol pricing for the gpt-5.6 alias after the current rate takes effect",()=>{
  const rate=resolveRate("gpt-5.6","2026-07-17T00:00:00.000Z",DEFAULT_MODEL_RATES);
  assert.deepEqual(rate,{model:"gpt-5.6",effectiveFrom:"2026-07-17",inputPerMTok:5,outputPerMTok:30,cachedInputPerMTok:.5});
});
