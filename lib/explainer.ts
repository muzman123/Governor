import OpenAI from "openai";
import type { Receipt } from "./types";

export async function explainReceipt(receipt: Receipt): Promise<string> {
  const fallback = fallbackExplanation(receipt);
  if (!process.env.OPENAI_API_KEY) return fallback;
  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });
  try {
    const response = await client.responses.create({ model:process.env.OPENAI_EXPLAINER_MODEL ?? "gpt-5.6", input:[{role:"system",content:"You explain deterministic engineering cost receipts. Return exactly two short sentences. Never claim the estimate is invoice truth, never infer developer behavior, and never ask for code or prompts."},{role:"user",content:JSON.stringify({totalEstimatedCost:receipt.totalCost,eventCount:receipt.eventCount,confidence:receipt.confidence,models:receipt.models.map(({model,costUsd,inputTokens,outputTokens})=>({model,costUsd,inputTokens,outputTokens}))})}], text:{format:{type:"json_schema",name:"receipt_explanation",strict:true,schema:{type:"object",properties:{explanation:{type:"string"}},required:["explanation"],additionalProperties:false}}} });
    const parsed=JSON.parse(response.output_text) as { explanation:string };
    return parsed.explanation.trim();
  } catch { return fallback; }
}

function fallbackExplanation(receipt: Receipt) { const largest=receipt.models[0]; if(!largest) return "No attributable Codex usage has been recorded for this branch yet. The receipt will update when Governor receives signed usage metadata."; return `${largest.model} accounts for the largest share of this estimated ${receipt.totalCost.toFixed(2)} USD receipt. Attribution confidence is ${Math.round(receipt.confidence*100)}%, based on the available signed git context.`; }
