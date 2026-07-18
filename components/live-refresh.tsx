"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export function AutoRefresh() { const router=useRouter(); useEffect(()=>{const id=setInterval(()=>router.refresh(),30_000); return ()=>clearInterval(id);},[router]); return <button className="refresh-button" onClick={()=>router.refresh()}>↻ Refresh</button>; }
