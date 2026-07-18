import { NextResponse } from "next/server";
import { requireRepositoryAccess } from "@/lib/app-access";

type RouteParams = { owner: string; repo: string };

export async function GET(_: Request, { params }: { params: Promise<RouteParams> }) {
  try {
    const { owner, repo: repositoryName } = await params;
    const access=await requireRepositoryAccess(`${owner}/${repositoryName}`);
    return NextResponse.json(access.overview);
  } catch (error) {
    const unauthenticated=error instanceof Error && error.message==="UNAUTHENTICATED";
    return NextResponse.json({error:unauthenticated?"Sign in required":"Repository not found"},{status:unauthenticated?401:404});
  }
}
