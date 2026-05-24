#!/usr/bin/env node
/**
 * compute-batches.mjs — Phase 1.5 of /understand
 *
 * Reads scan-result.json, runs Louvain community detection on the import
 * graph, and writes batches.json containing batches + neighborMap.
 *
 * Usage:
 *   node compute-batches.mjs <project-root> [--changed-files=<path>]
 *
 * Input:  <project-root>/.understand-anything/intermediate/scan-result.json
 * Output: <project-root>/.understand-anything/intermediate/batches.json
 */

import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

const TOO_LARGE_THRESHOLD = 35;  // becomes MAX_COMMUNITY_SIZE in Task 4
const TOO_SMALL_THRESHOLD = 5;   // informational only — small communities are kept (no merge), see Task 6/7 design

// ── Skeleton main: load → Louvain → print sizes ───────────────────────────
async function main() {
  const projectRoot = process.argv[2];
  if (!projectRoot) {
    process.stderr.write('Usage: node compute-batches.mjs <project-root> [--changed-files=<path>]\n');
    process.exit(1);
  }

  const scanPath = join(projectRoot, '.understand-anything', 'intermediate', 'scan-result.json');
  if (!existsSync(scanPath)) {
    process.stderr.write(`Error: scan-result.json not found at ${scanPath}\n`);
    process.exit(1);
  }

  const scan = JSON.parse(readFileSync(scanPath, 'utf-8'));
  const files = scan.files || [];
  const codeFiles = files.filter(f => f.fileCategory === 'code');
  const importMap = scan.importMap || {};

  process.stderr.write(`Loaded ${files.length} files (${codeFiles.length} code).\n`);

  // Build undirected import graph
  const g = new Graph({ type: 'undirected', allowSelfLoops: false });
  for (const f of codeFiles) g.addNode(f.path);
  for (const [src, targets] of Object.entries(importMap)) {
    if (!g.hasNode(src)) continue;
    for (const tgt of targets) {
      if (!g.hasNode(tgt) || src === tgt || g.hasEdge(src, tgt)) continue;
      g.addEdge(src, tgt);
    }
  }

  // Run Louvain
  const communities = louvain(g);  // { nodeId: communityId }

  // Print size distribution
  const sizeByCommunity = new Map();
  for (const [, cid] of Object.entries(communities)) {
    sizeByCommunity.set(cid, (sizeByCommunity.get(cid) || 0) + 1);
  }
  const sizes = [...sizeByCommunity.values()].sort((a, b) => b - a);
  process.stderr.write(
    `Louvain produced ${sizes.length} communities. Size distribution: [${sizes.join(', ')}]\n`,
  );
  process.stderr.write(
    `Max community size: ${sizes[0] ?? 0}, min: ${sizes.at(-1) ?? 0}, ` +
    `>${TOO_LARGE_THRESHOLD}: ${sizes.filter(s => s > TOO_LARGE_THRESHOLD).length}, <${TOO_SMALL_THRESHOLD}: ${sizes.filter(s => s < TOO_SMALL_THRESHOLD).length}\n`,
  );
}

// ---------------------------------------------------------------------------
// Run only when executed directly as a CLI; importing the module (e.g. from
// tests) must not trigger main().
//
// Canonicalize both sides through realpathSync. Node ESM resolves
// import.meta.url through symlinks but pathToFileURL(process.argv[1]) preserves
// them, so a raw equality check silently no-ops when the script is invoked via
// a symlinked plugin install path (the default in Claude Code / Copilot CLI
// caches). See GitHub issue #162.
// ---------------------------------------------------------------------------
function isCliEntry() {
  if (!process.argv[1]) return false;
  try {
    const modulePath = realpathSync(fileURLToPath(import.meta.url));
    const argvPath = realpathSync(process.argv[1]);
    return modulePath === argvPath;
  } catch {
    return false;
  }
}

if (isCliEntry()) {
  try {
    await main();
  } catch (err) {
    process.stderr.write(`compute-batches.mjs failed: ${err.message}\n${err.stack}\n`);
    process.exit(1);
  }
}
