import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

type RouteParams = { owner: string; repo: string };

export async function GET(_: Request, { params }: { params: Promise<RouteParams> }) {
  const { owner, repo: repositoryName } = await params;
  const slug = `${owner}/${repositoryName}`;
  const store = getStore();
  const repository = await store.getRepositoryBySlug(slug);

  if (!repository) {
    return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  }

  return NextResponse.json(await store.getDashboard(repository.id));
}
