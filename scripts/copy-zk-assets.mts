#!/usr/bin/env tsx
/*
 * Copies compiled ZK assets from build/contracts/<name>/{keys,zkir} into
 * public/contracts/<name>/{keys,zkir} so the browser FetchZkConfigProvider
 * can read them over HTTP.
 *
 * Run as part of `pnpm dev` / `pnpm build` (see package.json `predev` and
 * `prebuild` hooks). Also exposed as `pnpm zk:sync`.
 */

import { existsSync } from 'node:fs';
import { mkdir, cp, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BUILD_ROOT = path.join(ROOT, 'build', 'contracts');
const PUBLIC_ROOT = path.join(ROOT, 'public', 'contracts');

const CONTRACTS = ['issuer-registry', 'range-proof'] as const;

async function copyContract(name: string) {
  const from = path.join(BUILD_ROOT, name);
  if (!existsSync(from)) {
    console.warn(`[zk-sync] missing build output for ${name} — skipping`);
    return;
  }
  const to = path.join(PUBLIC_ROOT, name);
  await mkdir(to, { recursive: true });
  for (const sub of ['keys', 'zkir']) {
    const src = path.join(from, sub);
    if (!existsSync(src)) {
      console.warn(`[zk-sync] missing ${sub}/ for ${name} — skipping`);
      continue;
    }
    const dst = path.join(to, sub);
    await mkdir(dst, { recursive: true });
    await cp(src, dst, { recursive: true, force: true });
  }
  const files = await readdir(to, { recursive: true });
  console.log(`[zk-sync] ${name}: ${files.length} files synced`);
}

async function main() {
  await mkdir(PUBLIC_ROOT, { recursive: true });
  await Promise.all(CONTRACTS.map(copyContract));
  console.log(`[zk-sync] done at ${PUBLIC_ROOT}`);
}

main().catch((e) => {
  console.error('[zk-sync] failed:', e);
  process.exit(1);
});
