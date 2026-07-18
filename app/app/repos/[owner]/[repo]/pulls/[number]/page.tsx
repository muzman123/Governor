import { notFound } from "next/navigation";
import { ReceiptDetail } from "@/components/governor-ui";
import { requireRepositoryAccess } from "@/lib/app-access";
import { observeReceipt } from "@/lib/observations";
import { getStore } from "@/lib/store";

export default async function ReceiptPage({params}:{params:Promise<{owner:string;repo:string;number:string}>}) { const {owner,repo,number}=await params; const access=await requireRepositoryAccess(`${owner}/${repo}`); const store=getStore(); const receipt=await store.getReceipt(access.repository.id,Number(number)); if(!receipt) notFound(); if(!receipt.observation) { const pr=await store.getPullRequest(access.repository.id,receipt.prNumber); const events=await store.getEvents(access.repository.id); receipt.observation=observeReceipt(receipt,events.filter((event)=>event.branch===pr?.branch),events.filter((event)=>event.branch!==pr?.branch),access.overview.receipts); } return <ReceiptDetail receipt={receipt} repository={access.repository}/>; }
