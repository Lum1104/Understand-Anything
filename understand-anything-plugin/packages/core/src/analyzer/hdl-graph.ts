// Deterministic HDL graph assembler.
//
// UA's deterministic GraphBuilder only emits file/function/class + contains edges;
// the rich design edges (instantiation, inheritance, UVM composition, TLM) normally
// come from the LLM agent pipeline. This assembler produces those edges WITHOUT an
// LLM run, so an SV/UVM project can be rendered + asserted deterministically:
//   - module/class/function/file nodes
//   - contains   (file   -> symbol)
//   - depends_on (module -> instantiated module; class -> factory-created component)
//   - inherits   (class  -> base class; external uvm_* bases get lightweight nodes)
//   - publishes  (TLM connect() data path between resolved components)
//
// Parsing is separated from assembly: `assembleHdlGraph` is parser-agnostic and
// produces identical output whether the facts came from the regex backend
// (`buildHdlGraph`) or the tree-sitter backend (`buildHdlGraphTreeSitter`).

import type { KnowledgeGraph, GraphNode, GraphEdge } from "../types.js";
import { analyzeHdl, type HdlAnalysis } from "../plugins/parsers/systemverilog-parser.js";

export interface HdlFile { path: string; content: string; }
export interface ParsedHdlFile { path: string; h: HdlAnalysis; }

const moduleId = (name: string): string => `module:${name}`;
const classId = (name: string): string => `class:${name}`;
const fileId = (p: string): string => `file:${p}`;

/** Parse SV/Verilog with the regex backend, then assemble the graph. */
export function buildHdlGraph(files: HdlFile[], projectName: string, gitHash: string): KnowledgeGraph {
  return assembleHdlGraph(files.map((f) => ({ path: f.path, h: analyzeHdl(f.content) })), projectName, gitHash);
}

/** Parse with the tree-sitter backend (accurate AST), then assemble the same graph.
 *  Async because web-tree-sitter loads its WASM grammar lazily. */
export async function buildHdlGraphTreeSitter(files: HdlFile[], projectName: string, gitHash: string): Promise<KnowledgeGraph> {
  const { analyzeHdlTreeSitter } = await import("../plugins/parsers/systemverilog-treesitter.js");
  const parsed: ParsedHdlFile[] = [];
  for (const f of files) parsed.push({ path: f.path, h: await analyzeHdlTreeSitter(f.content) });
  return assembleHdlGraph(parsed, projectName, gitHash);
}

/** Assemble the knowledge graph from already-parsed HDL facts (parser-agnostic). */
export function assembleHdlGraph(parsed: ParsedHdlFile[], projectName: string, gitHash: string): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();
  const add = (n: GraphNode): void => {
    if (!nodeIds.has(n.id)) { nodeIds.add(n.id); nodes.push(n); }
  };
  const edge = (source: string, target: string, type: GraphEdge["type"], weight = 1): void => {
    if (nodeIds.has(source) && nodeIds.has(target)) {
      edges.push({ source, target, type, direction: "forward", weight });
    }
  };

  const moduleNames = new Set(parsed.flatMap((p) => p.h.modules.map((m) => m.name)));
  const classNames = new Set(parsed.flatMap((p) => p.h.classes.map((c) => c.name)));

  // Member handle -> component type, harvested from each class's factory creates
  // (`agt = dut_agent::type_id::create(...)`). Used to resolve TLM connect() chains.
  const memberType = new Map<string, Map<string, string>>();
  for (const { h } of parsed) {
    for (const c of h.classes) {
      let mm = memberType.get(c.name);
      if (!mm) { mm = new Map<string, string>(); memberType.set(c.name, mm); }
      for (const cr of c.creates) if (cr.handle) mm.set(cr.handle, cr.type);
    }
  }
  // Walk a dotted handle chain (`agt.mon.ap`) from its owning class to the deepest
  // component it resolves to (dut_monitor); non-component tokens (ports) end the walk.
  const resolveChain = (ownerClass: string, chain: string): string | null => {
    let current = ownerClass;
    let resolved: string | null = null;
    for (const tok of chain.split(".")) {
      const t = memberType.get(current)?.get(tok);
      if (t && classNames.has(t)) { resolved = t; current = t; }
      else break;
    }
    return resolved;
  };

  // Pass 1: file + module + class + function nodes (with contains edges)
  for (const { path, h } of parsed) {
    add({ id: fileId(path), type: "file", name: path.split("/").pop() ?? path, filePath: path, summary: `HDL source file ${path}`, tags: ["hdl"], complexity: "simple" });
    for (const m of h.modules) {
      add({ id: moduleId(m.name), type: "module", name: m.name, filePath: path, lineRange: m.lineRange,
        summary: `${m.kind} ${m.name} (${m.ports.length} ports, ${m.params.length} params)`, tags: [m.kind], complexity: "moderate" });
      edge(fileId(path), moduleId(m.name), "contains");
    }
    for (const c of h.classes) {
      add({ id: classId(c.name), type: "class", name: c.name, filePath: path, lineRange: c.lineRange,
        summary: c.base ? `class ${c.name} extends ${c.base}` : `class ${c.name}`, tags: ["uvm"], complexity: "moderate" });
      edge(fileId(path), classId(c.name), "contains");
    }
    for (const fn of h.functions) {
      const id = `function:${path}:${fn.name}`;
      add({ id, type: "function", name: fn.name, filePath: path, lineRange: fn.lineRange, summary: `${fn.kind} ${fn.name}`, tags: [fn.kind], complexity: "simple" });
      edge(fileId(path), id, "contains");
    }
  }

  // Pass 2: instantiation (depends_on) + inheritance (inherits) edges
  for (const { h } of parsed) {
    for (const m of h.modules) {
      for (const inst of m.instantiations) {
        if (moduleNames.has(inst.type)) edge(moduleId(m.name), moduleId(inst.type), "depends_on", 0.9);
      }
    }
    for (const c of h.classes) {
      if (!c.base) continue;
      if (!classNames.has(c.base)) {
        add({ id: classId(c.base), type: "class", name: c.base, summary: `external base class ${c.base}`,
          tags: ["external", c.base.startsWith("uvm_") ? "uvm" : "lib"], complexity: "simple" });
      }
      edge(classId(c.name), classId(c.base), "inherits", 0.9);
    }
    // Composition ("has-a"): the convergent UVM component tree, rooted at the test.
    // `handle = Created::type_id::create(...)` -> depends_on edge to the created class.
    for (const c of h.classes) {
      const composed = new Set<string>();
      for (const cr of c.creates) {
        if (classNames.has(cr.type) && !composed.has(cr.type)) {
          composed.add(cr.type);
          edge(classId(c.name), classId(cr.type), "depends_on", 0.9);
        }
      }
      // TLM data path: `a.b.connect(c.d)` -> publishes edge between resolved components.
      for (const cn of c.connects) {
        const from = resolveChain(c.name, cn.from);
        const to = resolveChain(c.name, cn.to);
        if (from && to && from !== to) edge(classId(from), classId(to), "publishes", 0.6);
      }
    }
  }

  // Group nodes into layers so the dashboard's layer-driven structural view renders them.
  // (UA's GraphView requires an active layer; LLM-built graphs always carry layers, ours must too.)
  const rtlIds: string[] = [];
  const tbIds: string[] = [];
  for (const n of nodes) {
    if (n.filePath && n.filePath.startsWith("rtl/")) rtlIds.push(n.id);
    else tbIds.push(n.id);
  }
  const layers = [
    { id: "layer:rtl", name: "RTL Design", description: "Synthesizable RTL modules and their instantiation hierarchy.", nodeIds: rtlIds },
    { id: "layer:uvm", name: "UVM Testbench", description: "UVM verification environment and its class hierarchy.", nodeIds: tbIds },
  ];

  return {
    version: "1.0.0",
    project: {
      name: projectName,
      languages: ["systemverilog"],
      frameworks: ["uvm"],
      description: "HDL structural graph (deterministic)",
      analyzedAt: new Date().toISOString(),
      gitCommitHash: gitHash,
    },
    nodes,
    edges,
    layers,
    tour: [],
  };
}
