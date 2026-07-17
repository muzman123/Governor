#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const governorHome = path.join(os.homedir(), ".governor");
const settingsPath = path.join(governorHome, "config.json");
const payload = process.argv[2] ?? "";
const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));
const logPath = path.join(governorHome, "logs", "notify.log");

async function log(message) {
  await fs.mkdir(path.dirname(logPath), { recursive: true, mode: 0o700 });
  await fs.appendFile(logPath, `${new Date().toISOString()} ${message}\n`, { mode: 0o600 });
}

let notification = {};
try { notification = JSON.parse(payload || "{}"); } catch { /* the hook will report malformed input */ }
await log(`received type=${String(notification.type ?? "unknown")} thread=${String(notification["thread-id"] ?? notification.thread_id ?? "unknown")} cwd=${String(notification.cwd ?? "unknown")}`);

const run = (command, args) => new Promise((resolve) => {
  const child = spawn(command, [...args, payload], { detached:false, stdio:"ignore", windowsHide:true });
  const timer = setTimeout(() => { child.kill(); resolve(); }, 5_000);
  child.once("error", async (error) => { clearTimeout(timer); await log(`child-error command=${path.basename(command)} message=${error.message}`); resolve(); });
  child.once("exit", async (code) => { clearTimeout(timer); await log(`child-exit command=${path.basename(command)} code=${code ?? "unknown"}`); resolve(); });
});

const tasks = [run(process.execPath, [path.join(governorHome, "bin", "governor-hook.mjs")])];
if (Array.isArray(settings.upstreamNotify) && settings.upstreamNotify.length > 0) {
  tasks.push(run(settings.upstreamNotify[0], settings.upstreamNotify.slice(1)));
}
await Promise.all(tasks);
