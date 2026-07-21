import type { WorkType } from "./types";

const LABELS: Record<Exclude<WorkType, "unclassified">, readonly string[]> = {
  security: ["security", "vulnerability"],
  bug_fix: ["bug", "bug fix", "bugfix", "defect"],
  feature: ["feature", "enhancement"],
  maintenance: ["maintenance", "refactor", "tech debt", "technical debt", "chore"]
};

/** Maps documented GitHub labels without inferring work type from titles, code, or AI output. */
export function deriveWorkType(labels: readonly (string | null | undefined)[]): WorkType {
  const normalized = new Set(labels.map(normalizeLabel).filter(Boolean));
  for (const type of ["security", "bug_fix", "feature", "maintenance"] as const) if (LABELS[type].some((label) => normalized.has(label))) return type;
  return "unclassified";
}

export function workTypeLabel(workType: WorkType): string { return { feature: "Feature", bug_fix: "Bug fix", security: "Security", maintenance: "Maintenance", unclassified: "Unclassified" }[workType]; }

function normalizeLabel(value: string | null | undefined): string | undefined {
  if (!value) return;
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const withoutTypePrefix = normalized.replace(/^(?:governor\s*:\s*)?type\s*[:/]\s*/, "");
  return withoutTypePrefix || undefined;
}
