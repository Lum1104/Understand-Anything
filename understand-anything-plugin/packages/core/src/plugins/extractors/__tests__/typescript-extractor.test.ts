import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { TypeScriptExtractor } from "../typescript-extractor.js";

const require = createRequire(import.meta.url);

let Parser: any;
let Language: any;
let jsLang: any;

beforeAll(async () => {
  const mod = await import("web-tree-sitter");
  Parser = mod.Parser;
  Language = mod.Language;
  await Parser.init();
  const wasmPath = require.resolve(
    "tree-sitter-javascript/tree-sitter-javascript.wasm",
  );
  jsLang = await Language.load(wasmPath);
});

function parse(code: string) {
  const parser = new Parser();
  parser.setLanguage(jsLang);
  const tree = parser.parse(code);
  const root = tree.rootNode;
  return { tree, parser, root };
}

describe("TypeScriptExtractor", () => {
  const extractor = new TypeScriptExtractor();

  it("has correct languageIds", () => {
    expect(extractor.languageIds).toEqual(["typescript", "javascript"]);
  });

  describe("AMD define() unwrapping", () => {
    it("extracts functions from anonymous define with function callback", () => {
      const { tree, parser, root } = parse(`
define(['N/record', 'N/search'], function (record, search) {
  function getOrCreateLPN(id) { return id; }
  function processLine(line) { return line; }
});
`);
      const result = extractor.extractStructure(root);
      const names = result.functions.map((f) => f.name);
      expect(names).toContain("getOrCreateLPN");
      expect(names).toContain("processLine");
      tree.delete();
      parser.delete();
    });

    it("extracts functions from anonymous define with arrow callback", () => {
      const { tree, parser, root } = parse(`
define(['N/runtime', 'N/record'], (runtime, record) => {
  const getInputData = (ctx) => { return {}; };
  const map = (ctx) => {};
  const summarize = (ctx) => {};
});
`);
      const result = extractor.extractStructure(root);
      const names = result.functions.map((f) => f.name);
      expect(names).toContain("getInputData");
      expect(names).toContain("map");
      expect(names).toContain("summarize");
      tree.delete();
      parser.delete();
    });

    it("skips JSDoc block between deps array and arrow callback", () => {
      // Real-world SuiteScript shape: JSDoc params doc sits BETWEEN the deps
      // array and the arrow callback. tree-sitter exposes it as a named
      // `comment` arg child, which would otherwise shift the cursor and hide
      // the callback.
      const { tree, parser, root } = parse(`
define(['N/record', 'N/search'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search) => {
        const getInputData = (ctx) => {};
        const map = (ctx) => {};
    }
);
`);
      const result = extractor.extractStructure(root);
      const names = result.functions.map((f) => f.name);
      expect(names).toContain("getInputData");
      expect(names).toContain("map");
      tree.delete();
      parser.delete();
    });

    it("extracts functions from named define (leading string arg)", () => {
      const { tree, parser, root } = parse(`
define("myModule", ['N/record'], function (record) {
  function helper() { return 1; }
});
`);
      const result = extractor.extractStructure(root);
      const names = result.functions.map((f) => f.name);
      expect(names).toContain("helper");
      tree.delete();
      parser.delete();
    });

    it("extracts functions from bare define(function(){...}) with no deps", () => {
      const { tree, parser, root } = parse(`
define(function () {
  function bareHelper() { return 1; }
});
`);
      const result = extractor.extractStructure(root);
      const names = result.functions.map((f) => f.name);
      expect(names).toContain("bareHelper");
      tree.delete();
      parser.delete();
    });

    it("zips dep array strings to callback parameter names as import specifiers", () => {
      const { tree, parser, root } = parse(`
define(['N/record', 'N/search', 'N/runtime'], function (record, search, runtime) {});
`);
      const result = extractor.extractStructure(root);
      expect(result.imports).toHaveLength(3);
      expect(result.imports[0]).toMatchObject({
        source: "N/record",
        specifiers: ["record"],
      });
      expect(result.imports[1]).toMatchObject({
        source: "N/search",
        specifiers: ["search"],
      });
      expect(result.imports[2]).toMatchObject({
        source: "N/runtime",
        specifiers: ["runtime"],
      });
      tree.delete();
      parser.delete();
    });

    it("emits exports for returned object literal keys", () => {
      const { tree, parser, root } = parse(`
define(['N/record'], function (record) {
  function beforeLoad(ctx) {}
  function afterSubmit(ctx) {}
  return { beforeLoad: beforeLoad, afterSubmit: afterSubmit };
});
`);
      const result = extractor.extractStructure(root);
      const names = result.exports.map((e) => e.name);
      expect(names).toContain("beforeLoad");
      expect(names).toContain("afterSubmit");
      tree.delete();
      parser.delete();
    });

    it("supports shorthand exports in returned object literal", () => {
      const { tree, parser, root } = parse(`
define([], function () {
  function getInputData() {}
  function map() {}
  function reduce() {}
  return { getInputData, map, reduce };
});
`);
      const result = extractor.extractStructure(root);
      const names = result.exports.map((e) => e.name);
      expect(names).toContain("getInputData");
      expect(names).toContain("map");
      expect(names).toContain("reduce");
      tree.delete();
      parser.delete();
    });

    it("returns empty result for malformed define (no callback)", () => {
      const { tree, parser, root } = parse(`
define(['N/record']);
`);
      const result = extractor.extractStructure(root);
      expect(result.functions).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
      tree.delete();
      parser.delete();
    });

    it("skips non-define expression statements (regression guard)", () => {
      const { tree, parser, root } = parse(`
console.log("hello");
someOtherFn(['a', 'b'], function () { function nope() {} });
`);
      const result = extractor.extractStructure(root);
      expect(result.functions).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
      tree.delete();
      parser.delete();
    });

    it("falls through unchanged for files without define wrapper", () => {
      const { tree, parser, root } = parse(`
function top1() { return 1; }
class Foo { method() {} }
const top2 = () => 2;
import x from "y";
`);
      const result = extractor.extractStructure(root);
      const fnNames = result.functions.map((f) => f.name);
      expect(fnNames).toContain("top1");
      expect(fnNames).toContain("top2");
      expect(result.classes.map((c) => c.name)).toContain("Foo");
      expect(result.imports.map((i) => i.source)).toContain("y");
      tree.delete();
      parser.delete();
    });
  });
});
