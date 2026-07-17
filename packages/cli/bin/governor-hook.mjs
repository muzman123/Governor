#!/usr/bin/env node
// Kept as a tiny forwarding executable so Codex notify can invoke Governor without shell interpolation.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here=path.dirname(fileURLToPath(import.meta.url));
const child=spawn(process.execPath,[path.join(here,"governor.mjs"),"hook",process.argv[2] ?? ""],{stdio:"inherit"});
child.on("exit",(code)=>process.exit(code ?? 1));
