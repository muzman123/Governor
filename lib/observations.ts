import type { Receipt, ReceiptObservation, UsageEvent } from "./types";

const ratio = (events: UsageEvent[]) => {
  const input=events.reduce((sum,event)=>sum+event.inputTokens,0);
  return input ? events.reduce((sum,event)=>sum+event.cachedInputTokens,0)/input : 0;
};
const median = (values: number[]) => { const sorted=[...values].sort((a,b)=>a-b); return sorted.length%2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2; };
const money = (value: number) => `$${value.toFixed(2)}`;
const percentage = (value: number) => `${Math.round(value*100)}%`;

/** Produces evidence-backed findings. GPT may explain these fields, but cannot alter them. */
export function observeReceipt(receipt: Receipt, receiptEvents: UsageEvent[], historicalEvents: UsageEvent[], historicalReceipts: Receipt[]): ReceiptObservation | undefined {
  const generatedAt=new Date().toISOString();
  const base={confidence:receipt.confidence,calculationVersion:"v1",generatedAt};
  if(receipt.confidence<.95) return { ...base,category:"attribution_quality",title:"Attribution needs a second look",explanation:`This receipt is ${percentage(receipt.confidence)} attributed rather than exact, so Governor is presenting it as an estimate with lower context certainty.`,evidence:`Attribution confidence: ${percentage(receipt.confidence)}.`,impactUsd:undefined };

  const currentCache=ratio(receiptEvents); const historicalCache=ratio(historicalEvents);
  if(historicalEvents.length>=20 && historicalCache>=.2 && currentCache<historicalCache*.55) {
    const impact=Math.max(0,receipt.totalCost*(historicalCache-currentCache));
    return { ...base,category:"cache_efficiency",title:"Lower cache reuse increased this estimate",explanation:`Cache utilization was ${percentage(currentCache)} versus this repository's ${percentage(historicalCache)} baseline, indicating more context was reprocessed than usual.`,evidence:`Cache utilization: ${percentage(currentCache)}; repository baseline: ${percentage(historicalCache)} across ${historicalEvents.length} historical events.`,impactUsd:Math.round(impact*1_000_000)/1_000_000 };
  }

  const comparable=historicalReceipts.filter((candidate)=>candidate.prNumber!==receipt.prNumber && candidate.eventCount>0).map((candidate)=>candidate.totalCost);
  if(comparable.length>=3) {
    const baseline=median(comparable);
    if(baseline>0 && receipt.totalCost>baseline*1.5) return { ...base,category:"cost_outlier",title:"This PR is above the repository's usual cost",explanation:`This receipt is ${Math.round(receipt.totalCost/baseline*100)}% of the typical comparable PR estimate for this repository.`,evidence:`This receipt: ${money(receipt.totalCost)}; median of ${comparable.length} comparable PRs: ${money(baseline)}.`,impactUsd:Math.round((receipt.totalCost-baseline)*1_000_000)/1_000_000 };
  }

  const largest=receipt.models[0];
  if(largest && receipt.totalCost>0 && largest.costUsd/receipt.totalCost>=.8 && receipt.models.length>1) return { ...base,category:"model_mix",title:"One model drove most of this receipt",explanation:`${largest.model} accounts for ${percentage(largest.costUsd/receipt.totalCost)} of this estimate, so it is the clearest place to inspect if this work needs cost tuning.`,evidence:`${largest.model}: ${money(largest.costUsd)} of ${money(receipt.totalCost)} estimated cost.` };
  return undefined;
}

export function observationFallback() { return { title:"Governor is gathering a baseline", body:"As more attributed work lands in this repository, Governor will surface evidence-backed observations about cache reuse, model mix, and unusual PR cost." }; }
