import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { TypeScriptExtractor } from "../typescript-extractor.js";

const require = createRequire(import.meta.url);

// ---- TypeScript grammar (used for .ts/.tsx files) ----
let Parser: any;
let Language: any;
let tsLang: any;
let jsLang: any;

beforeAll(async () => {
  const mod = await import("web-tree-sitter");
  Parser = mod.Parser;
  Language = mod.Language;
  await Parser.init();

  const tsWasm = require.resolve(
    "tree-sitter-typescript/tree-sitter-typescript.wasm",
  );
  tsLang = await Language.load(tsWasm);

  const jsWasm = require.resolve(
    "tree-sitter-javascript/tree-sitter-javascript.wasm",
  );
  jsLang = await Language.load(jsWasm);
});

function parseTs(code: string) {
  const parser = new Parser();
  parser.setLanguage(tsLang);
  const tree = parser.parse(code);
  return { tree, parser, root: tree.rootNode };
}

function parseJs(code: string) {
  const parser = new Parser();
  parser.setLanguage(jsLang);
  const tree = parser.parse(code);
  return { tree, parser, root: tree.rootNode };
}
