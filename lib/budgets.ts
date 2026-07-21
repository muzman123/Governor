import type { BudgetForecast, Receipt, UsageEvent, WorkTypeSpend } from "./types";

const round = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;

/** Uses UTC calendar months so the same repository result is deterministic for every client. */
export function calculateBudgetForecast(events: UsageEvent[], monthlyBudgetUsd: number | undefined, now = new Date()): BudgetForecast {
  const year = now.getUTCFullYear(); const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1)); const nextMonthStart = new Date(Date.UTC(year, month + 1, 1)); const monthEnd = new Date(nextMonthStart.getTime() - 1);
  const daysInMonth = monthEnd.getUTCDate(); const daysElapsed = now.getUTCDate();
  const spendMonthToDate = round(events.filter((event) => { const occurredAt = Date.parse(event.occurredAt); return occurredAt >= monthStart.getTime() && occurredAt <= now.getTime() && occurredAt < nextMonthStart.getTime(); }).reduce((sum, event) => sum + event.costUsd, 0));
  const rawDailyRunRate = spendMonthToDate / Math.max(daysElapsed, 1); const dailyRunRate = round(rawDailyRunRate); const projectedSpend = round(rawDailyRunRate * daysInMonth);
  const base = { monthStart: monthStart.toISOString().slice(0, 10), monthEnd: monthEnd.toISOString().slice(0, 10), timezone: "UTC" as const, spendMonthToDate, dailyRunRate, projectedSpend, daysElapsed, daysInMonth };
  if (monthlyBudgetUsd === undefined) return { ...base, status: "not_configured" };
  const burnPercent = round(spendMonthToDate / monthlyBudgetUsd * 100); const remainingBudgetUsd = round(monthlyBudgetUsd - spendMonthToDate);
  const status = spendMonthToDate >= monthlyBudgetUsd ? "over_budget" : daysElapsed <= 2 ? "early_estimate" : projectedSpend > monthlyBudgetUsd ? "projected_over" : projectedSpend >= monthlyBudgetUsd * .9 ? "watch" : "on_track";
  return { ...base, budgetUsd: monthlyBudgetUsd, remainingBudgetUsd, burnPercent, status };
}

export function aggregateWorkTypeSpend(receipts: Receipt[]): WorkTypeSpend[] {
  const rows = new Map<WorkTypeSpend["workType"], WorkTypeSpend>();
  for (const receipt of receipts) { const workType = receipt.workType ?? "unclassified"; const current = rows.get(workType) ?? { workType, totalCost: 0, prCount: 0, avgCostPerPr: 0, mergedCount: 0 }; current.totalCost += receipt.totalCost; current.prCount++; if (receipt.outcome === "merged") current.mergedCount++; rows.set(workType, current); }
  return [...rows.values()].map((row) => ({ ...row, totalCost: round(row.totalCost), avgCostPerPr: round(row.totalCost / row.prCount) })).sort((left, right) => right.totalCost - left.totalCost);
}
