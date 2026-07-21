import assert from "node:assert/strict";
import test from "node:test";
import { deriveWorkType } from "../lib/work-types";
test("maps documented GitHub labels without guessing from unrelated wording",()=>{ assert.equal(deriveWorkType(["enhancement"]),"feature"); assert.equal(deriveWorkType(["bug fix"]),"bug_fix"); assert.equal(deriveWorkType(["type: security"]),"security"); assert.equal(deriveWorkType(["governor:type/maintenance"]),"maintenance"); assert.equal(deriveWorkType(["customer request"]),"unclassified"); });
test("uses security, bug fix, feature, then maintenance as a stable precedence order",()=>{ assert.equal(deriveWorkType(["feature","bug"]),"bug_fix"); assert.equal(deriveWorkType(["feature","security","maintenance"]),"security"); });
