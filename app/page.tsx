import { DemoDashboard } from "@/components/demo-dashboard";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = getStore();
  const repo = await store.getRepositoryBySlug("acme/checkout");
  if (!repo) throw new Error("Seed repository missing");
  const dashboard = await store.getDashboard(repo.id);
  return <DemoDashboard dashboard={dashboard} />;
}
