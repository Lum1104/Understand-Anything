import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildFingerprintStore } from "../fingerprint.js";
import { PluginRegistry } from "../plugins/registry.js";

/**
 * Smoke test for the auto-init path on `buildFingerprintStore`.
 *
 * These tests use the real filesystem rather than mocks because they're
 * exercising the public 0-config contract documented in `/understand`
 * Phase 7 step 2.5. The skill calls `buildFingerprintStore(root, paths)`
 * without wiring up a registry — that has to work end-to-end with real
 * tree-sitter init.
 */
describe("buildFingerprintStore — auto-init contract", () => {
  let projectDir: string;

  beforeAll(() => {
    projectDir = mkdtempSync(join(tmpdir(), "ua-fingerprint-autoinit-"));

    mkdirSync(join(projectDir, "src"), { recursive: true });
    writeFileSync(
      join(projectDir, "src", "math.ts"),
      [
        "export function add(a: number, b: number): number {",
        "  return a + b;",
        "}",
        "",
        "export class Calculator {",
        "  total = 0;",
        "  add(value: number): void {",
        "    this.total += value;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(projectDir, "src", "util.py"),
      [
        "def greet(name: str) -> str:",
        "    return f\"hello, {name}\"",
        "",
        "class Counter:",
        "    def __init__(self):",
        "        self.value = 0",
        "    def bump(self):",
        "        self.value += 1",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(projectDir, "README.md"),
      "# Sample\n\nA tiny project.\n",
    );
  });

  afterAll(() => {
    if (projectDir) rmSync(projectDir, { recursive: true, force: true });
  });

  it("runs end-to-end without an explicit registry or commit hash", async () => {
    const store = await buildFingerprintStore(projectDir, [
      "src/math.ts",
      "src/util.py",
      "README.md",
    ]);

    expect(store.version).toBe("1.0.0");
    expect(Object.keys(store.files)).toEqual(
      expect.arrayContaining(["src/math.ts", "src/util.py", "README.md"]),
    );
    // tmp dir is not a git repo — commit hash should fall back gracefully
    expect(store.gitCommitHash).toBe("unknown");
  });

  it("produces structural fingerprints for tree-sitter-supported languages", async () => {
    const store = await buildFingerprintStore(projectDir, [
      "src/math.ts",
      "src/util.py",
    ]);

    const tsFp = store.files["src/math.ts"];
    expect(tsFp.hasStructuralAnalysis).toBe(true);
    expect(tsFp.functions.map((f) => f.name)).toContain("add");
    expect(tsFp.classes.map((c) => c.name)).toContain("Calculator");

    const pyFp = store.files["src/util.py"];
    expect(pyFp.hasStructuralAnalysis).toBe(true);
    expect(pyFp.functions.map((f) => f.name)).toContain("greet");
    expect(pyFp.classes.map((c) => c.name)).toContain("Counter");
  });

  it("respects a non-empty registry the caller provided (no re-register)", async () => {
    const registry = new PluginRegistry();
    const sentinel = {
      name: "sentinel",
      languages: ["typescript"],
      analyzeFile: () => ({
        functions: [
          { name: "sentinelFn", lineRange: [1, 1] as [number, number], params: [] },
        ],
        classes: [],
        imports: [],
        exports: [],
      }),
    };
    registry.register(sentinel);

    const store = await buildFingerprintStore(
      projectDir,
      ["src/math.ts"],
      registry,
      "explicit-hash",
    );

    expect(store.gitCommitHash).toBe("explicit-hash");
    // Sentinel plugin won — real tree-sitter would have returned `add`, not `sentinelFn`
    expect(store.files["src/math.ts"].functions.map((f) => f.name)).toEqual([
      "sentinelFn",
    ]);
    expect(registry.getPlugins()).toHaveLength(1);
  });
});
