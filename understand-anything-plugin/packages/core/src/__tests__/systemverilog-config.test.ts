import { describe, it, expect } from "vitest";
import { LanguageRegistry } from "../languages/language-registry.js";

describe("systemverilog language config", () => {
  const reg = LanguageRegistry.createDefault();
  it.each([
    ["rtl/fifo.sv", "systemverilog"],
    ["rtl/cpu.v", "systemverilog"],
    ["tb/types_pkg.svh", "systemverilog"],
    ["tb/defs.vh", "systemverilog"],
  ])("detects %s as %s", (path, id) => {
    expect(reg.getForFile(path)?.id).toBe(id);
  });

  it("exposes HDL/UVM concepts", () => {
    const cfg = reg.getForFile("x.sv");
    expect(cfg?.displayName).toBe("SystemVerilog");
    expect(cfg?.concepts).toContain("uvm");
  });
});
