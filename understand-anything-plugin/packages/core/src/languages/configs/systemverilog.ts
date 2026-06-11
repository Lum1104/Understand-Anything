import type { LanguageConfig } from "../types.js";

// Verilog is treated as a SystemVerilog subset (same id) for the structural MVP.
export const systemverilogConfig = {
  id: "systemverilog",
  displayName: "SystemVerilog",
  extensions: [".sv", ".svh", ".v", ".vh"],
  concepts: [
    "module", "interface", "package", "program", "class",
    "always_ff", "always_comb", "parameter", "generate",
    "uvm", "uvm component", "uvm object", "factory", "phases",
    "sequence", "sequencer", "driver", "monitor", "scoreboard",
    "agent", "env", "tlm", "config_db", "clocking block", "assertion",
  ],
  filePatterns: {
    entryPoints: ["top.sv", "tb_top.sv", "testbench.sv"],
    barrels: [],
    tests: ["*_test.sv", "*_tb.sv"],
    config: ["*_pkg.sv", "*_pkg.svh"],
  },
} satisfies LanguageConfig;
