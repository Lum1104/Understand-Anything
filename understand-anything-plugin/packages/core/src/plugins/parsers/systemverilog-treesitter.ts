// Tree-sitter SystemVerilog backend.
//
// Produces the same `HdlAnalysis` shape as the regex parser (systemverilog-parser.ts),
// but by walking the tree-sitter-systemverilog AST instead of regex heuristics — far
// more robust on real SV/UVM. The deterministic assembler (hdl-graph.ts) consumes
// either backend's output identically.
//
// Node-only: loads web-tree-sitter's WASM grammar via createRequire, so this module
// must never be imported from browser-facing code paths.

import { createRequire } from "node:module";
import type {
  HdlAnalysis, HdlModule, HdlClass, HdlPackage, HdlFunction, HdlImport,
  HdlInstantiation, HdlCreate, HdlConnect,
} from "./systemverilog-parser.js";

const require = createRequire(import.meta.url);
type SNode = import("web-tree-sitter").Node;

// ── tiny AST helpers ──────────────────────────────────────────────────────
function eachNamed(n: SNode, fn: (c: SNode) => void): void {
  for (let i = 0; i < n.namedChildCount; i++) { const c = n.namedChild(i); if (c) fn(c); }
}
function walk(n: SNode, visit: (x: SNode) => void): void { visit(n); eachNamed(n, (c) => walk(c, visit)); }
function collect(n: SNode, type: string): SNode[] {
  const out: SNode[] = [];
  walk(n, (x) => { if (x.type === type) out.push(x); });
  return out;
}
function childOfType(n: SNode | null, type: string): SNode | null {
  if (!n) return null;
  for (let i = 0; i < n.namedChildCount; i++) { const c = n.namedChild(i); if (c && c.type === type) return c; }
  return null;
}
/** First `simple_identifier` in pre-order (the leftmost identifier of a subtree). */
function firstIdent(n: SNode | null): string | undefined {
  if (!n) return undefined;
  let found: string | undefined;
  walk(n, (x) => { if (found === undefined && x.type === "simple_identifier") found = x.text; });
  return found;
}
function idsIn(n: SNode | null): string[] {
  return n ? collect(n, "simple_identifier").map((x) => x.text) : [];
}
const range = (n: SNode): [number, number] => [n.startPosition.row + 1, n.endPosition.row + 1];

// ── per-construct extraction ──────────────────────────────────────────────
/** `handle = Type::type_id::create(...)` -> { handle, type } (composition). */
function extractCreates(classNode: SNode): HdlCreate[] {
  const out: HdlCreate[] = [];
  const seen = new Set<string>();
  for (const asg of collect(classNode, "operator_assignment")) {
    const bodies = collect(asg, "method_call_body").map((b) => childOfType(b, "simple_identifier")?.text);
    if (!(bodies.includes("type_id") && bodies.includes("create"))) continue;
    const handle = firstIdent(childOfType(asg, "variable_lvalue"));
    const type = firstIdent(childOfType(asg, "expression")); // receiver of type_id == created type
    if (!type) continue;
    const key = `${handle ?? ""}:${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ handle, type });
  }
  return out;
}
/** `a.b.c.connect(d.e)` -> { from: "a.b.c", to: "d.e" } (TLM wiring). */
function extractConnects(classNode: SNode): HdlConnect[] {
  const out: HdlConnect[] = [];
  for (const call of collect(classNode, "tf_call")) {
    const ids = idsIn(childOfType(call, "hierarchical_identifier"));
    if (ids.length < 2 || ids[ids.length - 1] !== "connect") continue;
    const from = ids.slice(0, -1).join(".");
    const argHid = collect(childOfType(call, "list_of_arguments") ?? call, "hierarchical_identifier")[0] ?? null;
    const to = idsIn(argHid).join(".");
    if (from && to) out.push({ from, to });
  }
  return out;
}

const MOD_KINDS: ReadonlyArray<readonly [string, HdlModule["kind"]]> = [
  ["module_declaration", "module"],
  ["interface_declaration", "interface"],
  ["program_declaration", "program"],
];

/** Extract HDL facts from a parsed SystemVerilog syntax tree's root node. */
export function analyzeHdlFromTree(root: SNode): HdlAnalysis {
  const modules: HdlModule[] = [];
  const classes: HdlClass[] = [];
  const packages: HdlPackage[] = [];
  const functions: HdlFunction[] = [];
  const imports: HdlImport[] = [];

  for (const [declType, kind] of MOD_KINDS) {
    for (const md of collect(root, declType)) {
      const header = md.namedChild(0);
      const name = childOfType(header, "simple_identifier")?.text ?? firstIdent(md);
      if (!name) continue;
      const params = collect(header ?? md, "param_assignment")
        .map((pa) => childOfType(pa, "simple_identifier")?.text).filter((x): x is string => !!x);
      const ports = collect(header ?? md, "ansi_port_declaration")
        .map((apd) => childOfType(apd, "simple_identifier")?.text).filter((x): x is string => !!x);
      const instantiations: HdlInstantiation[] = collect(md, "module_instantiation")
        .map((mi) => ({
          type: childOfType(mi, "simple_identifier")?.text ?? "",
          instance: firstIdent(childOfType(mi, "hierarchical_instance")) ?? "",
          line: mi.startPosition.row + 1,
        }))
        .filter((i) => i.type.length > 0);
      modules.push({ name, kind, lineRange: range(md), ports, params, instantiations });
    }
  }

  for (const cd of collect(root, "class_declaration")) {
    const name = childOfType(cd, "simple_identifier")?.text;
    if (!name) continue;
    const base = childOfType(childOfType(cd, "class_type"), "simple_identifier")?.text;
    classes.push({ name, base, lineRange: range(cd), creates: extractCreates(cd), connects: extractConnects(cd) });
  }

  for (const pd of collect(root, "package_declaration")) {
    const name = childOfType(pd, "simple_identifier")?.text;
    if (name) packages.push({ name, lineRange: range(pd) });
  }

  for (const fd of collect(root, "function_declaration")) {
    const name = childOfType(childOfType(fd, "function_body_declaration"), "simple_identifier")?.text;
    if (name) functions.push({ name, kind: "function", lineRange: [fd.startPosition.row + 1, fd.startPosition.row + 1] });
  }
  for (const td of collect(root, "task_declaration")) {
    const name = firstIdent(childOfType(td, "task_body_declaration") ?? td);
    if (name) functions.push({ name, kind: "task", lineRange: [td.startPosition.row + 1, td.startPosition.row + 1] });
  }
  for (const cc of collect(root, "class_constructor_declaration")) {
    functions.push({ name: "new", kind: "function", lineRange: [cc.startPosition.row + 1, cc.startPosition.row + 1] });
  }

  for (const pii of collect(root, "package_import_item")) {
    const name = childOfType(pii, "simple_identifier")?.text;
    if (name) imports.push({ pkg: name, line: pii.startPosition.row + 1 });
  }

  return { modules, classes, packages, functions, imports };
}

// ── lazy WASM grammar loader ──────────────────────────────────────────────
let _parser: Promise<import("web-tree-sitter").Parser> | null = null;
function getParser(): Promise<import("web-tree-sitter").Parser> {
  if (!_parser) {
    _parser = (async () => {
      const mod = await import("web-tree-sitter");
      const ParserCls = mod.Parser;
      const LanguageCls = mod.Language;
      await ParserCls.init();
      const wasmPath = require.resolve("tree-sitter-systemverilog/tree-sitter-systemverilog.wasm");
      const lang = await LanguageCls.load(wasmPath);
      const p = new ParserCls();
      p.setLanguage(lang);
      return p;
    })();
  }
  return _parser;
}

/** Parse one SV/Verilog source string and extract HDL facts via the tree-sitter AST. */
export async function analyzeHdlTreeSitter(src: string): Promise<HdlAnalysis> {
  const parser = await getParser();
  const tree = parser.parse(src);
  if (!tree) return { modules: [], classes: [], packages: [], functions: [], imports: [] };
  try {
    return analyzeHdlFromTree(tree.rootNode);
  } finally {
    tree.delete?.();
  }
}

/** Whether the tree-sitter SystemVerilog grammar can be loaded in this environment. */
export async function isSvTreeSitterAvailable(): Promise<boolean> {
  try { await getParser(); return true; } catch { return false; }
}
