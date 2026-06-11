// Same corpus contract as hdl-corpus.integration.test.ts, but built through the
// tree-sitter backend — proving both parsers yield an equivalent knowledge graph.
import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { buildHdlGraphTreeSitter, type HdlFile } from "../hdl-graph.js";
import type { KnowledgeGraph } from "../../types.js";
import { validateGraph } from "../../schema.js";

function findCorpus(): string {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "uvm_demo");
  if (!existsSync(dir)) throw new Error("uvm_demo fixture not found at " + dir);
  return dir;
}
function loadCorpus(dir: string): HdlFile[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .map((p) => p.replace(/\\/g, "/"))
    .filter((p) => /\.(sv|svh|v|vh)$/.test(p))
    .map((p) => ({ path: p, content: readFileSync(join(dir, p), "utf8") }));
}

describe("uvm_demo corpus — tree-sitter backend", () => {
  let g: KnowledgeGraph;
  beforeAll(async () => {
    g = await buildHdlGraphTreeSitter(loadCorpus(findCorpus()), "uvm_demo", "test");
  });
  const nameOf = (id: string): string => g.nodes.find((n) => n.id === id)!.name;
  const composes = (parent: string): string[] =>
    g.edges.filter((e) => e.source === `class:${parent}` && e.type === "depends_on").map((e) => nameOf(e.target)).sort();

  it("is schema-valid", () => {
    const res = validateGraph(g);
    if (!res.success) console.error("issues:", JSON.stringify(res.issues), res.fatal);
    expect(res.success).toBe(true);
  });

  it("extracts the 4 RTL modules", () => {
    const mods = g.nodes.filter((n) => n.type === "module").map((n) => n.name);
    expect(mods).toEqual(expect.arrayContaining(["alu", "arbiter", "fifo", "top"]));
  });

  it("top depends_on its three submodules", () => {
    const deps = g.edges.filter((e) => e.source === "module:top" && e.type === "depends_on").map((e) => nameOf(e.target)).sort();
    expect(deps).toEqual(["alu", "arbiter", "fifo"]);
  });

  it("has 9 UVM inheritance edges", () => {
    expect(g.edges.filter((e) => e.type === "inherits").length).toBe(9);
  });

  it("extracts the UVM composition tree from type_id::create", () => {
    expect(composes("dut_base_test")).toEqual(["dut_env", "dut_sequence"]);
    expect(composes("dut_env")).toEqual(["dut_agent", "dut_scoreboard"]);
    expect(composes("dut_agent")).toEqual(["dut_driver", "dut_monitor", "dut_sequencer"]);
    expect(composes("dut_sequence")).toEqual(["dut_seq_item"]);
  });

  it("resolves TLM connect() into publishes edges", () => {
    const tlm = g.edges.filter((e) => e.type === "publishes").map((e) => `${nameOf(e.source)}->${nameOf(e.target)}`).sort();
    expect(tlm).toEqual(["dut_driver->dut_sequencer", "dut_monitor->dut_scoreboard"]);
  });

  it("converges: the whole testbench is reachable from dut_base_test via composition", () => {
    const adj = new Map<string, string[]>();
    for (const e of g.edges.filter((e) => e.type === "depends_on")) {
      const list = adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!;
      list.push(e.target);
    }
    const seen = new Set<string>();
    const stack = ["class:dut_base_test"];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const next of adj.get(cur) ?? []) stack.push(next);
    }
    for (const c of ["dut_env", "dut_sequence", "dut_agent", "dut_scoreboard",
      "dut_driver", "dut_monitor", "dut_sequencer", "dut_seq_item"]) {
      expect(seen.has(`class:${c}`), `${c} reachable`).toBe(true);
    }
  });
});
