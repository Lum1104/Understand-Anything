import { describe, it, expect } from "vitest";
import { buildHdlGraph } from "../hdl-graph.js";
import { validateGraph } from "../../schema.js";

const files = [
  { path: "rtl/alu.sv", content: "module alu; endmodule" },
  { path: "rtl/fifo.sv", content: "module fifo; endmodule" },
  { path: "rtl/top.sv", content: "module top; alu u_alu(); fifo u_fifo(); endmodule" },
  { path: "tb/item.sv", content: "class my_item extends uvm_sequence_item; endclass" },
  { path: "tb/drv.sv", content: "class my_driver extends uvm_driver #(my_item); endclass" },
];

describe("buildHdlGraph", () => {
  const g = buildHdlGraph(files, "uvm_demo", "deadbeef");

  it("produces a schema-valid graph", () => {
    const res = validateGraph(g);
    if (!res.success) console.error("validation issues:", JSON.stringify(res.issues), res.fatal);
    expect(res.success).toBe(true);
  });

  it("creates module nodes", () =>
    expect(g.nodes.filter((n) => n.type === "module").map((n) => n.name).sort())
      .toEqual(["alu", "fifo", "top"]));

  it("creates depends_on edges for instantiations", () => {
    const top = g.nodes.find((n) => n.type === "module" && n.name === "top")!;
    const deps = g.edges.filter((e) => e.source === top.id && e.type === "depends_on")
      .map((e) => g.nodes.find((n) => n.id === e.target)!.name).sort();
    expect(deps).toEqual(["alu", "fifo"]);
  });

  it("creates inherits edges up to uvm_* bases (external nodes allowed)", () => {
    const drv = g.nodes.find((n) => n.type === "class" && n.name === "my_driver")!;
    const base = g.edges.find((e) => e.source === drv.id && e.type === "inherits");
    expect(base).toBeTruthy();
    expect(g.nodes.find((n) => n.id === base!.target)!.name).toBe("uvm_driver");
  });

  it("creates external uvm_* base class nodes", () =>
    expect(g.nodes.some((n) => n.type === "class" && n.name === "uvm_sequence_item")).toBe(true));

  it("emits RTL + UVM layers so the dashboard can render them", () => {
    expect(g.layers.map((l) => l.name)).toEqual(["RTL Design", "UVM Testbench"]);
    const rtl = g.layers.find((l) => l.id === "layer:rtl")!;
    expect(rtl.nodeIds).toContain("module:top");
  });
});

// A minimal-but-complete UVM testbench: env owns agent+scoreboard, agent owns
// driver+monitor+sequencer, test owns env+sequence, sequence makes seq_items.
const uvmFiles = [
  { path: "tb/item.sv", content: "class dut_seq_item extends uvm_sequence_item; endclass" },
  { path: "tb/driver.sv", content: "class dut_driver extends uvm_driver #(dut_seq_item); endclass" },
  { path: "tb/sequencer.sv", content: "class dut_sequencer extends uvm_sequencer #(dut_seq_item); endclass" },
  { path: "tb/monitor.sv", content: "class dut_monitor extends uvm_monitor; endclass" },
  { path: "tb/scoreboard.sv", content: "class dut_scoreboard extends uvm_scoreboard; endclass" },
  {
    path: "tb/sequence.sv",
    content: `class dut_sequence extends uvm_sequence #(dut_seq_item);
      task body();
        dut_seq_item req;
        req = dut_seq_item::type_id::create("req");
      endtask
    endclass`,
  },
  {
    path: "tb/agent.sv",
    content: `class dut_agent extends uvm_agent;
      dut_driver drv; dut_monitor mon; dut_sequencer sqr;
      function void build_phase(uvm_phase phase);
        drv = dut_driver::type_id::create("drv", this);
        mon = dut_monitor::type_id::create("mon", this);
        sqr = dut_sequencer::type_id::create("sqr", this);
      endfunction
      function void connect_phase(uvm_phase phase);
        drv.seq_item_port.connect(sqr.seq_item_export);
      endfunction
    endclass`,
  },
  {
    path: "tb/env.sv",
    content: `class dut_env extends uvm_env;
      dut_agent agt; dut_scoreboard sb;
      function void build_phase(uvm_phase phase);
        agt = dut_agent::type_id::create("agt", this);
        sb  = dut_scoreboard::type_id::create("sb", this);
      endfunction
      function void connect_phase(uvm_phase phase);
        agt.mon.ap.connect(sb.imp);
      endfunction
    endclass`,
  },
  {
    path: "tb/test.sv",
    content: `class dut_base_test extends uvm_test;
      dut_env env;
      function void build_phase(uvm_phase phase);
        env = dut_env::type_id::create("env", this);
      endfunction
      task run_phase(uvm_phase phase);
        dut_sequence seq;
        seq = dut_sequence::type_id::create("seq");
      endtask
    endclass`,
  },
];

describe("buildHdlGraph — UVM composition + TLM", () => {
  const g = buildHdlGraph(uvmFiles, "uvm_tb", "deadbeef");
  const id = (name: string): string => `class:${name}`;
  const childrenVia = (parent: string, type: string): string[] =>
    g.edges
      .filter((e) => e.source === id(parent) && e.type === type)
      .map((e) => g.nodes.find((n) => n.id === e.target)!.name)
      .sort();

  it("emits composition (depends_on) edges from each component to what it creates", () => {
    expect(childrenVia("dut_base_test", "depends_on")).toEqual(["dut_env", "dut_sequence"]);
    expect(childrenVia("dut_env", "depends_on")).toEqual(["dut_agent", "dut_scoreboard"]);
    expect(childrenVia("dut_agent", "depends_on")).toEqual(["dut_driver", "dut_monitor", "dut_sequencer"]);
    expect(childrenVia("dut_sequence", "depends_on")).toEqual(["dut_seq_item"]);
  });

  it("resolves TLM connect() chains to publishes edges between components", () => {
    // agt.mon.ap.connect(sb.imp)  -> monitor publishes to scoreboard
    expect(childrenVia("dut_monitor", "publishes")).toEqual(["dut_scoreboard"]);
    // drv.seq_item_port.connect(sqr.seq_item_export) -> driver <-> sequencer data path
    expect(childrenVia("dut_driver", "publishes")).toEqual(["dut_sequencer"]);
  });

  it("converges: every TB component is reachable from dut_base_test via composition", () => {
    const adj = new Map<string, string[]>();
    for (const e of g.edges.filter((e) => e.type === "depends_on")) {
      (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push(e.target);
    }
    const seen = new Set<string>();
    const stack = [id("dut_base_test")];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const next of adj.get(cur) ?? []) stack.push(next);
    }
    const components = ["dut_env", "dut_sequence", "dut_agent", "dut_scoreboard",
      "dut_driver", "dut_monitor", "dut_sequencer", "dut_seq_item"];
    for (const c of components) expect(seen.has(id(c))).toBe(true);
  });
});
