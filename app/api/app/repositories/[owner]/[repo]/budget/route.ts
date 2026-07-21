import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRepositoryAccess, requireRepositoryBudgetAccess } from "@/lib/app-access";
import { getStore } from "@/lib/store";

const budgetRequest = z.object({ monthlyBudgetUsd: z.coerce.number().finite().positive().max(1_000_000) });

export async function GET(_: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) { try { const { owner, repo } = await params; const access = await requireRepositoryAccess(`${owner}/${repo}`); return NextResponse.json({ budget: await getStore().getRepositoryBudget(access.repository.id), canManageBudget: access.canManageBudget }); } catch (error) { return responseFor(error); } }
export async function PUT(request: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) { try { const parsed = budgetRequest.safeParse(await request.json().catch(() => ({}))); if (!parsed.success) return NextResponse.json({ error: "Enter a monthly budget between $0.01 and $1,000,000." }, { status: 400 }); const { owner, repo } = await params; const access = await requireRepositoryBudgetAccess(`${owner}/${repo}`); const budget = await getStore().upsertRepositoryBudget({ repositoryId: access.repository.id, monthlyBudgetUsd: parsed.data.monthlyBudgetUsd, updatedByDeveloperId: access.developer.id, updatedAt: new Date().toISOString() }); return NextResponse.json({ budget }); } catch (error) { return responseFor(error); } }
export async function DELETE(_: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) { try { const { owner, repo } = await params; const access = await requireRepositoryBudgetAccess(`${owner}/${repo}`); await getStore().clearRepositoryBudget(access.repository.id); return NextResponse.json({ cleared: true }); } catch (error) { return responseFor(error); } }

function responseFor(error: unknown) { if (error instanceof Error && error.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Sign in required" }, { status: 401 }); if (error instanceof Error && error.message === "REPOSITORY_ADMIN_REQUIRED") return NextResponse.json({ error: "Repository admin permission is required to change the budget." }, { status: 403 }); return NextResponse.json({ error: "Repository not found" }, { status: 404 }); }
