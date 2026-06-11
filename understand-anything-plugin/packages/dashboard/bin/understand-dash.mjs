#!/usr/bin/env node
/**
 * understand-dash — Launch the Understand Anything knowledge-graph dashboard.
 *
 * Usage:
 *   understand-dash                          # uses current directory
 *   understand-dash /path/to/project          # specific project
 *   ACCESS_TOKEN=my-token understand-dash     # custom access token
 *
 * Environment:
 *   ACCESS_TOKEN  Override the dashboard access token (default: "dev")
 */

import { existsSync, realpathSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = resolve(__dirname, "..");
const DEFAULT_TOKEN = "dev";

function printUsage() {
  console.error("Usage: understand-dash [project-directory]");
  console.error("  If no directory is given, uses the current working directory.");
}

function printError(message) {
  console.error(`\n  Error: ${message}\n`);
}

// ── Resolve project directory ──────────────────────────────────────────────

const projectArg = process.argv[2];

if (projectArg === "--help" || projectArg === "-h") {
  printUsage();
  process.exit(0);
}

const rawProjectDir = projectArg || process.cwd();

let projectDir;
try {
  projectDir = realpathSync(rawProjectDir);
} catch {
  printError(`Cannot resolve path: ${rawProjectDir}`);
  printUsage();
  process.exit(1);
}

// ── Validate knowledge graph ────────────────────────────────────────────────

const graphFile = resolve(projectDir, ".understand-anything", "knowledge-graph.json");

if (!existsSync(graphFile)) {
  printError(`No knowledge graph found at ${graphFile}`);
  console.error("  Run 'understand' first to analyze this project.");
  console.error("");
  process.exit(1);
}

// ── Validate dashboard dependencies ─────────────────────────────────────────

const viteBin = resolve(DASHBOARD_DIR, "node_modules", ".bin", "vite");

if (!existsSync(viteBin)) {
  printError("Dashboard dependencies not installed.");
  console.error("  Run the following from the repo root:");
  console.error("");
  console.error("    pnpm install && pnpm --filter @understand-anything/core build");
  console.error("");
  process.exit(1);
}

// ── Start the dev server ────────────────────────────────────────────────────

const token = process.env.ACCESS_TOKEN || DEFAULT_TOKEN;

const url = `http://127.0.0.1:5173/?token=${token}`;

console.error(`\n  📊  Dashboard for: ${projectDir}`);
console.error(`     Token: ${token}`);
console.error(`     URL:   ${url}`);
console.error(`\n     Open the URL in your browser. Ctrl+C to stop.\n`);

const server = spawn(viteBin, ["--host", "127.0.0.1"], {
  cwd: DASHBOARD_DIR,
  stdio: "inherit",
  env: {
    ...process.env,
    ACCESS_TOKEN: token,
    GRAPH_DIR: projectDir,
  },
});

process.on("SIGINT", () => {
  server.kill("SIGINT");
});

process.on("SIGTERM", () => {
  server.kill("SIGTERM");
});

const exitCode = await new Promise((resolveExit) => {
  server.on("exit", resolveExit);
});

process.exit(exitCode);
