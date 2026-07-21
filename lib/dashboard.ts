import type { GovernorStore } from "./store";
import type { ActorBreakdown, ModelBreakdown, RepositoryOverview, UsageEvent } from "./types";
import { aggregateWorkTypeSpend, calculateBudgetForecast } from "./budgets";

const timestamp=(value:string|Date)=>value instanceof Date?value.toISOString():String(value);

export async function repositoryOverview(store: GovernorStore, repositoryId: string): Promise<RepositoryOverview> {
  const [dashboard,events,agentTokenConfigured,budget]=await Promise.all([store.getDashboard(repositoryId),store.getEvents(repositoryId),store.hasActiveAgentToken(repositoryId),store.getRepositoryBudget(repositoryId)]); const byModel=new Map<string,ModelBreakdown>(); const byActor=new Map<ActorBreakdown["actorType"],ActorBreakdown>(); const byDay=new Map<string,number>();
  for(const event of events) {
    const model=byModel.get(event.model) ?? {model:event.model,inputTokens:0,outputTokens:0,cachedInputTokens:0,costUsd:0};
    model.inputTokens+=event.inputTokens; model.outputTokens+=event.outputTokens; model.cachedInputTokens+=event.cachedInputTokens; model.costUsd+=event.costUsd; byModel.set(event.model,model);
    const actorType=event.actorType ?? "developer"; const actor=byActor.get(actorType) ?? {actorType,label:actorType === "agent" ? "Autonomous agent" : "Developer-assisted",eventCount:0,costUsd:0}; actor.eventCount++; actor.costUsd+=event.costUsd; byActor.set(actorType,actor);
    const date=timestamp(event.occurredAt).slice(0,10); byDay.set(date,(byDay.get(date) ?? 0)+event.costUsd);
  }
  const spendTrend=[...byDay.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(-14).map(([date,costUsd])=>({date,costUsd:Math.round(costUsd*1_000_000)/1_000_000}));
  const recentEvents=[...events].map((event)=>({...event,occurredAt:timestamp(event.occurredAt)})).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,12);
  return {...dashboard,modelSpend:[...byModel.values()].map((model)=>({...model,costUsd:Math.round(model.costUsd*1_000_000)/1_000_000})).sort((a,b)=>b.costUsd-a.costUsd),actorSpend:[...byActor.values()].map((actor)=>({...actor,costUsd:Math.round(actor.costUsd*1_000_000)/1_000_000})).sort((a,b)=>b.costUsd-a.costUsd),spendTrend,recentEvents,lastActivityAt:recentEvents[0]?.occurredAt,telemetryHealthy:Boolean(recentEvents.length),agentTokenConfigured,budget,budgetForecast:calculateBudgetForecast(events,budget?.monthlyBudgetUsd),workTypeSpend:aggregateWorkTypeSpend(dashboard.receipts)};
}

export const totalForPeriod=(events: UsageEvent[], days: number) => events.filter((event)=>Date.parse(event.occurredAt)>=Date.now()-days*86_400_000).reduce((sum,event)=>sum+event.costUsd,0);
