import { describe, it, expect } from "vitest";
import { PluginRegistry } from "../plugins/registry.js";
import { registerAllParsers } from "../plugins/parsers/index.js";

describe("SystemVerilog AnalyzerPlugin", () => {
  const reg = new PluginRegistry();
  registerAllParsers(reg);

  it("routes .sv files to the sv parser", () => {
    expect(reg.getPluginForFile("rtl/alu.sv")?.name).toBe("systemverilog-parser");
  });
  it("routes .v files to the sv parser", () => {
    expect(reg.getPluginForFile("rtl/cpu.v")?.name).toBe("systemverilog-parser");
  });
  it("emits module definitions and UVM classes", () => {
    const a = reg.analyzeFile("tb/d.sv", "module top; endmodule\nclass d extends uvm_driver; endclass")!;
    expect(a.definitions?.some((d) => d.kind === "module" && d.name === "top")).toBe(true);
    expect(a.classes.some((c) => c.name === "d")).toBe(true);
  });
});
