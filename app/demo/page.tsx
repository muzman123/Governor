import Link from "next/link";
import { DemoExperience } from "@/components/demo-experience";
import { getStore } from "@/lib/store";

export const dynamic="force-dynamic";
export default async function Demo() { const store=getStore(); const repo=await store.getRepositoryBySlug("acme/checkout"); if(!repo) throw new Error("Seed repository missing"); return <><div className="demo-banner">Public sandbox - anonymized sample data only <Link href="/">Return to Governor</Link></div><DemoExperience dashboard={await store.getDashboard(repo.id)}/></>; }
