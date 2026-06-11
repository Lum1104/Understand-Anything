import { describe, it, expect } from "vitest";
import { stripSvComments, analyzeHdl } from "../systemverilog-parser.js";

describe("stripSvComments", () => {
  it("removes // and /* */ but preserves newlines (line numbers stable)", () => {
    const src = `module a; // trailing\n/* block\ncomment */ logic x;\nendmodule\n`;
    const out = stripSvComments(src);
    expect(out).not.toContain("trailing");
    expect(out).not.toContain("block");
    expect(out.split("\n").length).toBe(src.split("\n").length);
  });
});

describe("analyzeHdl — modules", () => {
  const src = `
package math_pkg; typedef enum {A,B} e_t; endpackage
module alu #(parameter int W=8) (input logic [W-1:0] a, output logic [W-1:0] y);
  assign y = a;
endmodule
module top (input logic clk);
  import math_pkg::*;
  alu #(.W(16)) u_alu (.a(a), .y(y));
  fifo u_fifo (.clk(clk));
endmodule`;
  const r = analyzeHdl(src);
  it("finds modules", () => expect(r.modules.map((m) => m.name).sort()).toEqual(["alu", "top"]));
  it("finds the package", () => expect(r.packages.map((p) => p.name)).toContain("math_pkg"));
  it("captures top's instantiations", () => {
    const top = r.modules.find((m) => m.name === "top")!;
    expect(top.instantiations.map((x) => x.type).sort()).toEqual(["alu", "fifo"]);
  });
  it("captures package import", () => expect(r.imports.map((x) => x.pkg)).toContain("math_pkg"));
  it("captures alu params and ports", () => {
    const alu = r.modules.find((m) => m.name === "alu")!;
    expect(alu.params).toContain("W");
    expect(alu.ports).toEqual(expect.arrayContaining(["a", "y"]));
  });
});

describe("analyzeHdl — classes/UVM", () => {
  const src = `
class my_item extends uvm_sequence_item; endclass
class my_driver extends uvm_driver #(my_item);
  task run_phase(uvm_phase phase); endtask
endclass`;
  const r = analyzeHdl(src);
  it("captures base classes without param spec", () => {
    expect(r.classes.find((c) => c.name === "my_item")?.base).toBe("uvm_sequence_item");
    expect(r.classes.find((c) => c.name === "my_driver")?.base).toBe("uvm_driver");
  });
  it("captures task as function entry", () => expect(r.functions.map((f) => f.name)).toContain("run_phase"));
});

describe("analyzeHdl — UVM composition + TLM (type_id::create / connect)", () => {
  const src = `
class dut_env extends uvm_env;
  dut_agent      agt;
  dut_scoreboard sb;
  function void build_phase(uvm_phase phase);
    agt = dut_agent::type_id::create("agt", this);
    sb  = dut_scoreboard::type_id::create("sb", this);
  endfunction
  function void connect_phase(uvm_phase phase);
    agt.mon.ap.connect(sb.imp);
  endfunction
endclass
class dut_base_test extends uvm_test;
  dut_env env;
  function void build_phase(uvm_phase phase);
    env = dut_env::type_id::create("env", this);
  endfunction
  task run_phase(uvm_phase phase);
    dut_sequence seq;
    seq = dut_sequence::type_id::create("seq");
  endtask
endclass`;
  const r = analyzeHdl(src);
  const env = r.classes.find((c) => c.name === "dut_env")!;
  const test = r.classes.find((c) => c.name === "dut_base_test")!;

  it("captures created component types (handle + type)", () =>
    expect(env.creates.map((x) => x.type).sort()).toEqual(["dut_agent", "dut_scoreboard"]));

  it("captures the create handle names", () =>
    expect(env.creates.map((x) => x.handle).sort()).toEqual(["agt", "sb"]));

  it("captures creates from any phase/task body within the class span", () =>
    expect(test.creates.map((x) => x.type).sort()).toEqual(["dut_env", "dut_sequence"]));

  it("captures TLM connect endpoints as raw dotted chains", () =>
    expect(env.connects).toEqual([{ from: "agt.mon.ap", to: "sb.imp" }]));

  it("leaves connects empty when a class has no TLM wiring", () =>
    expect(test.connects).toEqual([]));
});
