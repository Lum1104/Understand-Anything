// Deterministic HDL analyzer CLI: walk a project's Verilog/SystemVerilog files,
// assemble a knowledge graph, validate it, and write the dashboard JSON.
//
// Usage: node scripts/analyze-hdl.mjs <projectDir>
//   -> writes <projectDir>/.understand-anything/knowledge-graph.json
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildHdlGraph, buildHdlGraphTreeSitter } from "../packages/core/dist/analyzer/hdl-graph.js";
import { validateGraph } from "../packages/core/dist/schema.js";

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/analyze-hdl.mjs <projectDir>");
  process.exit(1);
}

const files = readdirSync(target, { recursive: true })
  .map((p) => String(p).replace(/\\/g, "/"))
  .filter((p) => /\.(sv|svh|v|vh)$/.test(p))
  .map((p) => ({ path: p, content: readFileSync(join(target, p), "utf8") }));

// Prefer the accurate tree-sitter backend; fall back to the regex parser if the
// SystemVerilog WASM grammar can't be loaded in this environment.
let graph;
try {
  graph = await buildHdlGraphTreeSitter(files, "uvm_demo", "local");
  console.log("parser: tree-sitter-systemverilog");
} catch (err) {
  console.warn("tree-sitter unavailable, using regex fallback:", err?.message ?? err);
  graph = buildHdlGraph(files, "uvm_demo", "local");
}
const res = validateGraph(graph);
if (!res.success) {
  console.error("graph invalid:", JSON.stringify(res.issues), res.fatal ?? "");
  process.exit(2);
}

const outDir = join(target, ".understand-anything");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "knowledge-graph.json");
writeFileSync(outFile, JSON.stringify(graph, null, 2));

const counts = graph.nodes.reduce((acc, n) => ((acc[n.type] = (acc[n.type] ?? 0) + 1), acc), {});
console.log(`wrote ${graph.nodes.length} nodes / ${graph.edges.length} edges -> ${outFile}`);
console.log("node types:", JSON.stringify(counts));
console.log("edge types:", JSON.stringify(graph.edges.reduce((a, e) => ((a[e.type] = (a[e.type] ?? 0) + 1), a), {})));
