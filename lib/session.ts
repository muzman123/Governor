import crypto from "node:crypto";
import { Pool } from "pg";
import { cookies } from "next/headers";

export type AppSession = { id:string; developerId:string; githubLogin:string; githubAccessToken:string; expiresAt:string; setupToken?:string };
const cookieName="governor_session"; const memory=new Map<string,AppSession>();
const key=()=>{ const secret=process.env.GOVERNOR_SESSION_SECRET ?? process.env.GITHUB_OAUTH_STATE_SECRET; if(!secret && process.env.NODE_ENV==="production") throw new Error("GOVERNOR_SESSION_SECRET is required in production"); return crypto.createHash("sha256").update(secret ?? "development-only").digest(); };
const hash=(value:string)=>crypto.createHash("sha256").update(value).digest("hex");
const seal=(value:string)=>{ const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv("aes-256-gcm",key(),iv); const body=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]); return Buffer.concat([iv,cipher.getAuthTag(),body]).toString("base64url"); };
const unseal=(value:string)=>{ const raw=Buffer.from(value,"base64url"); const decipher=crypto.createDecipheriv("aes-256-gcm",key(),raw.subarray(0,12)); decipher.setAuthTag(raw.subarray(12,28)); return Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString("utf8"); };
const pool=()=>process.env.DATABASE_URL ? new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes("localhost")?undefined:{rejectUnauthorized:false}}) : undefined;

export async function createAppSession(input: Omit<AppSession,"id"|"expiresAt"> & { setupToken?:string }) {
  const raw=crypto.randomBytes(32).toString("base64url"); const session:AppSession={...input,id:crypto.randomUUID(),expiresAt:new Date(Date.now()+7*86_400_000).toISOString()}; const database=pool();
  if(database) { await database.query("INSERT INTO web_sessions(id,token_hash,developer_id,github_login,github_token_ciphertext,setup_token_ciphertext,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)",[session.id,hash(raw),session.developerId,session.githubLogin,seal(session.githubAccessToken),session.setupToken?seal(session.setupToken):null,session.expiresAt]); await database.end(); } else memory.set(hash(raw),session);
  return {raw,session};
}

export async function readAppSession(raw:string|undefined):Promise<AppSession|undefined> { if(!raw) return; const database=pool(); if(!database) { const session=memory.get(hash(raw)); return session && Date.parse(session.expiresAt)>Date.now()?session:undefined; }
  try { const result=await database.query("SELECT id,developer_id AS \"developerId\",github_login AS \"githubLogin\",github_token_ciphertext AS \"githubToken\",setup_token_ciphertext AS \"setupToken\",expires_at AS \"expiresAt\" FROM web_sessions WHERE token_hash=$1 AND expires_at>NOW()",[hash(raw)]); const row=result.rows[0]; return row?{id:row.id,developerId:row.developerId,githubLogin:row.githubLogin,githubAccessToken:unseal(row.githubToken),setupToken:row.setupToken?unseal(row.setupToken):undefined,expiresAt:new Date(row.expiresAt).toISOString()}:undefined; } finally { await database.end(); }
}

export async function consumeSetupToken(sessionId:string) { const database=pool(); if(!database) { for(const session of memory.values()) if(session.id===sessionId) { const token=session.setupToken; session.setupToken=undefined; return token; } return; }
  try { const result=await database.query("UPDATE web_sessions SET setup_token_ciphertext=NULL WHERE id=$1 RETURNING setup_token_ciphertext AS \"setupToken\"",[sessionId]); return result.rows[0]?.setupToken?unseal(result.rows[0].setupToken):undefined; } finally { await database.end(); }
}

export async function destroyAppSession(raw:string|undefined) { if(!raw) return; const database=pool(); if(database) { try { await database.query("DELETE FROM web_sessions WHERE token_hash=$1",[hash(raw)]); } finally { await database.end(); } } else memory.delete(hash(raw)); }
export async function currentAppSession() { const jar=await cookies(); return readAppSession(jar.get(cookieName)?.value); }
export const appSessionCookie=(value:string)=>({name:cookieName,value,options:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:7*86_400}});
export const clearAppSessionCookie={name:cookieName,value:"",options:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:0}};
