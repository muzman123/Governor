import Link from "next/link";
import { DemoDashboard } from "@/components/governor-ui";
import { getStore } from "@/lib/store";

export const dynamic="force-dynamic";
export default async function Demo() { const store=getStore(); const repo=await store.getRepositoryBySlug("acme/checkout"); if(!repo) throw new Error("Seed repository missing"); return <><div className="demo-banner">Public sandbox · seeded aggregate data only <Link href="/">Return to Governor</Link></div><DemoDashboard dashboard={await store.getDashboard(repo.id)}/></>; }
