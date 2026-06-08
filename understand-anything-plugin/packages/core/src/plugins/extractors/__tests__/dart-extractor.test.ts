import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { DartExtractor } from "../dart-extractor.js";

const require = createRequire(import.meta.url);

let Parser: any;
let Language: any;
let dartLang: any;

beforeAll(async () => {
  const mod = await import("web-tree-sitter");
  Parser = mod.Parser;
  Language = mod.Language;
  await Parser.init();

  // Prefer the bundled WASM (rebuilt against the current web-tree-sitter ABI)
  // since the npm tree-sitter-dart 1.0.0 release ships an outdated dylink
  // format that fails to load. Fall back to the npm copy if the bundle is
  // not present (e.g. when running outside the source tree).
  const here = fileURLToPath(import.meta.url);
  const bundled = resolve(
    dirname(here),
    "..", "..", "..", "..", "wasm-grammars", "tree-sitter-dart.wasm",
  );
  const wasmPath = existsSync(bundled)
    ? bundled
    : require.resolve("tree-sitter-dart/tree-sitter-dart.wasm");
  dartLang = await Language.load(wasmPath);
});

function parse(code: string) {
  const parser = new Parser();
  parser.setLanguage(dartLang);
  const tree = parser.parse(code);
  const root = tree.rootNode;
  return { tree, parser, root };
}

describe("DartExtractor", () => {
  const extractor = new DartExtractor();

  it("has correct languageIds", () => {
    expect(extractor.languageIds).toEqual(["dart"]);
  });

  describe("extractStructure - imports", () => {
    it("extracts package imports with alias and last-path-segment fallback", () => {
      const { tree, parser, root } = parse(`
import 'package:flutter/material.dart';
import 'package:foo/bar.dart' as bar;
import 'dart:async';
`);
      const result = extractor.extractStructure(root);

      expect(result.imports).toHaveLength(3);

      expect(result.imports[0].source).toBe("package:flutter/material.dart");
      expect(result.imports[0].specifiers).toEqual(["material"]);

      expect(result.imports[1].source).toBe("package:foo/bar.dart");
      expect(result.imports[1].specifiers).toEqual(["bar"]);

      expect(result.imports[2].source).toBe("dart:async");
      expect(result.imports[2].specifiers).toEqual(["async"]);

      tree.delete();
      parser.delete();
    });

    it("records exports as star imports", () => {
      const { tree, parser, root } = parse(`
export 'package:foo/bar.dart';
`);
      const result = extractor.extractStructure(root);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe("package:foo/bar.dart");
      expect(result.imports[0].specifiers).toEqual(["*"]);

      tree.delete();
      parser.delete();
    });
  });

  describe("extractStructure - top-level functions", () => {
    it("extracts function name, params, and return type", () => {
      const { tree, parser, root } = parse(`
String greet(String name, int age) {
  return 'hi';
}

void main() {}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions.length).toBeGreaterThanOrEqual(2);
      const greet = result.functions.find((f) => f.name === "greet");
      const main = result.functions.find((f) => f.name === "main");

      expect(greet).toBeDefined();
      expect(greet!.params).toEqual(["name", "age"]);
      expect(greet!.returnType).toBe("String");

      expect(main).toBeDefined();
      expect(main!.returnType).toBe("void");

      // Public top-level functions are exported (Dart: not starting with _)
      expect(result.exports.map((e) => e.name)).toContain("greet");
      expect(result.exports.map((e) => e.name)).toContain("main");

      tree.delete();
      parser.delete();
    });

    it("treats _-prefixed names as library-private (not exported)", () => {
      const { tree, parser, root } = parse(`
void _helper() {}
void publicFn() {}
`);
      const result = extractor.extractStructure(root);
      const exportNames = result.exports.map((e) => e.name);

      expect(exportNames).toContain("publicFn");
      expect(exportNames).not.toContain("_helper");

      tree.delete();
      parser.delete();
    });
  });

  describe("extractStructure - classes", () => {
    it("extracts class with methods and properties", () => {
      const { tree, parser, root } = parse(`
class Counter {
  int value = 0;
  String label;

  Counter(this.label);

  void increment() {
    value++;
  }

  int get current => value;
}
`);
      const result = extractor.extractStructure(root);

      expect(result.classes).toHaveLength(1);
      const counter = result.classes[0];
      expect(counter.name).toBe("Counter");
      expect(counter.methods).toContain("increment");
      // Constructor name should appear too
      expect(counter.methods.some((m) => m.includes("Counter"))).toBe(true);
      // Field names from `int value = 0;` and `String label;`
      // Either `value` or `label` should be present (parser shape varies).
      expect(
        counter.properties.includes("value") ||
          counter.properties.includes("label"),
      ).toBe(true);

      expect(result.exports.map((e) => e.name)).toContain("Counter");

      tree.delete();
      parser.delete();
    });

    it("extracts mixin and enum", () => {
      const { tree, parser, root } = parse(`
mixin Walker {
  void walk() {}
}

enum Color { red, green, blue }
`);
      const result = extractor.extractStructure(root);

      const walker = result.classes.find((c) => c.name === "Walker");
      const color = result.classes.find((c) => c.name === "Color");

      expect(walker).toBeDefined();
      expect(walker!.methods).toContain("walk");

      expect(color).toBeDefined();
      // enum constants captured as properties
      expect(color!.properties).toEqual(
        expect.arrayContaining(["red", "green", "blue"]),
      );

      tree.delete();
      parser.delete();
    });
  });

  describe("extractCallGraph", () => {
    it("returns empty array (semantic call analysis is delegated to LLM)", () => {
      const { tree, parser, root } = parse(`
void main() {
  print('hi');
}
`);
      const result = extractor.extractCallGraph(root);
      expect(result).toEqual([]);

      tree.delete();
      parser.delete();
    });
  });
});
