#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const governorHome = path.join(os.homedir(), ".governor");
const settingsPath = path.join(governorHome, "config.json");
const payload = process.argv[2] ?? "";
const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));

const run = (command, args) => new Promise((resolve) => {
  const child = spawn(command, [...args, payload], { detached:false, stdio:"ignore", windowsHide:true });
  const timer = setTimeout(() => { child.kill(); resolve(); }, 5_000);
  child.once("error", () => { clearTimeout(timer); resolve(); });
  child.once("exit", () => { clearTimeout(timer); resolve(); });
});

const tasks = [run(process.execPath, [path.join(governorHome, "bin", "governor-hook.mjs")])];
if (Array.isArray(settings.upstreamNotify) && settings.upstreamNotify.length > 0) {
  tasks.push(run(settings.upstreamNotify[0], settings.upstreamNotify.slice(1)));
}
await Promise.all(tasks);
