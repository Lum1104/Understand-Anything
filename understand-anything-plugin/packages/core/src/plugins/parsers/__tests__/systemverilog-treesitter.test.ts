import { describe, it, expect } from "vitest";
import { analyzeHdlTreeSitter } from "../systemverilog-treesitter.js";

describe("analyzeHdlTreeSitter (tree-sitter backend)", () => {
  it("extracts UVM class base, factory composition, and TLM connects from the AST", async () => {
    const src = `class dut_env extends uvm_env;
  dut_agent      agt;
  dut_scoreboard sb;
  function void build_phase(uvm_phase phase);
    agt = dut_agent::type_id::create("agt", this);
    sb  = dut_scoreboard::type_id::create("sb", this);
  endfunction
  function void connect_phase(uvm_phase phase);
    agt.mon.ap.connect(sb.imp);
  endfunction
endclass`;
    const h = await analyzeHdlTreeSitter(src);
    const env = h.classes.find((c) => c.name === "dut_env")!;
    expect(env.base).toBe("uvm_env");
    expect(env.creates.map((c) => c.type).sort()).toEqual(["dut_agent", "dut_scoreboard"]);
    expect(env.creates.map((c) => c.handle).sort()).toEqual(["agt", "sb"]);
    expect(env.connects).toEqual([{ from: "agt.mon.ap", to: "sb.imp" }]);
  });

  it("extracts modules with ports, params, and instantiations from the AST", async () => {
    const src = `module top #(parameter int W = 8) (input logic clk, input logic rst_n);
  alu  #(.W(16)) u_alu  (.a(a), .y(y));
  fifo           u_fifo (.clk(clk));
endmodule`;
    const h = await analyzeHdlTreeSitter(src);
    const top = h.modules.find((m) => m.name === "top")!;
    expect(top.kind).toBe("module");
    expect(top.params).toContain("W");
    expect(top.ports).toEqual(expect.arrayContaining(["clk", "rst_n"]));
    expect(top.instantiations.map((i) => i.type).sort()).toEqual(["alu", "fifo"]);
  });

  it("parses the UVM factory macro without error and finds the class", async () => {
    const src = "class dut_seq_item extends uvm_sequence_item;\n  `uvm_object_utils(dut_seq_item)\nendclass";
    const h = await analyzeHdlTreeSitter(src);
    expect(h.classes.map((c) => c.name)).toContain("dut_seq_item");
    expect(h.classes.find((c) => c.name === "dut_seq_item")?.base).toBe("uvm_sequence_item");
  });
});
