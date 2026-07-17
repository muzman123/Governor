import { getStore } from "../lib/store";

async function main() { const repo=await getStore().getRepositoryBySlug("acme/checkout"); if(!repo) throw new Error("Demo repository missing"); console.log(`Governor demo tenant is ready: ${repo.slug}`); }
void main();
