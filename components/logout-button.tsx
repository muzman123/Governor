"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router=useRouter(); const [busy,setBusy]=useState(false);
  async function logout() { setBusy(true); await fetch("/api/auth/logout",{method:"POST"}); router.replace("/"); router.refresh(); }
  return <button className="text-button" type="button" disabled={busy} onClick={logout}>{busy?"Signing out…":"Sign out"}</button>;
}
