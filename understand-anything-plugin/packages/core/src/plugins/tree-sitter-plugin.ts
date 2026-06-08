import { createRequire } from "node:module";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import type {
  AnalyzerPlugin,
  StructuralAnalysis,
  ImportResolution,
  CallGraphEntry,
} from "../types.js";
import type { LanguageConfig } from "../languages/types.js";
import type { LanguageExtractor } from "./extractors/types.js";
import { builtinExtractors } from "./extractors/index.js";

// web-tree-sitter uses CJS internally; we need createRequire for .wasm resolution
const require = createRequire(import.meta.url);

/**
 * Resolve the path to a bundled grammar WASM kept inside this package under
 * `wasm-grammars/`. Used as a fallback when the npm-published grammar is
 * missing or its WASM is incompatible with the current web-tree-sitter ABI
 * (e.g. tree-sitter-dart 1.0.0 ships an outdated dylink format).
 *
 * Returns null when no bundled copy is available for the given filename.
 */
function bundledWasmPath(wasmFile: string): string | null {
  // import.meta.url resolves to dist/plugins/tree-sitter-plugin.js at runtime
  // and src/plugins/tree-sitter-plugin.ts during tests. The bundle dir lives
  // two levels up from either location (dist/plugins/.. → dist/..; same for src).
  const here = fileURLToPath(import.meta.url);
  const candidates = [
    resolve(dirname(here), "..", "..", "wasm-grammars", wasmFile),
    resolve(dirname(here), "..", "wasm-grammars", wasmFile),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

type TreeSitterParser = import("web-tree-sitter").Parser;
type TreeSitterLanguage = import("web-tree-sitter").Language;

/**
 * Config-driven tree-sitter plugin.
 *
 * Accepts LanguageConfig objects to determine which languages to support
 * and how to load their WASM grammars. Provides deep structural analysis
 * (functions, classes, imports, exports, call graphs) for all languages
 * with registered extractors: TypeScript, JavaScript, Python, Go, Rust,
 * Java, Ruby, PHP, C/C++, and C#.
 *
 * Languages without tree-sitter configs are gracefully skipped (the LLM
 * agent handles analysis for those).
 */
export class TreeSitterPlugin implements AnalyzerPlugin {
  readonly name = "tree-sitter";
  readonly languages: string[];

  private configs: LanguageConfig[];

  // Pre-loaded parser constructor and languages (set by init())
  private _ParserClass:
    | (new () => TreeSitterParser)
    | null = null;
  private _languages = new Map<string, TreeSitterLanguage>();
  private _extensionToLang = new Map<string, string>();
  private _initialized = false;

  // Language-specific extractors (keyed by language id)
  private extractors = new Map<string, LanguageExtractor>();

  /**
   * Create a TreeSitterPlugin with the given language configs.
   * Only configs that have a `treeSitter` field will be loaded.
   * If no configs are provided, defaults to TypeScript and JavaScript.
   *
   * @param configs Language configurations to load
   * @param extractors Optional language extractors; if none provided, registers all builtin extractors
   */
  constructor(configs?: LanguageConfig[], extractors?: LanguageExtractor[]) {
    if (configs) {
      this.configs = configs.filter((c) => c.treeSitter);
    } else {
      // Default: TS/JS for backward compatibility
      this.configs = [];
    }

    // Derive supported languages and extension map from configs
    const langs: string[] = [];
    for (const config of this.configs) {
      langs.push(config.id);
      for (const ext of config.extensions) {
        const key = ext.startsWith(".") ? ext : `.${ext}`;
        this._extensionToLang.set(key, config.id);
      }
    }

    // Fallback for backward compat when no configs provided
    if (langs.length === 0) {
      langs.push("typescript", "javascript");
      this._extensionToLang.set(".ts", "typescript");
      this._extensionToLang.set(".tsx", "typescript");
      this._extensionToLang.set(".js", "javascript");
      this._extensionToLang.set(".mjs", "javascript");
      this._extensionToLang.set(".cjs", "javascript");
      this._extensionToLang.set(".jsx", "javascript");
    }

    this.languages = langs;

    // Register extractors (default: all builtin extractors)
    if (extractors && extractors.length > 0) {
      for (const extractor of extractors) {
        this.registerExtractor(extractor);
      }
    } else {
      for (const extractor of builtinExtractors) {
        this.registerExtractor(extractor);
      }
    }
  }

  registerExtractor(extractor: LanguageExtractor): void {
    for (const id of extractor.languageIds) {
      this.extractors.set(id, extractor);
    }
  }

  private getExtractor(langKey: string): LanguageExtractor | null {
    // tsx is a synthetic grammar key — extraction logic is identical to typescript
    const key = langKey === "tsx" ? "typescript" : langKey;
    return this.extractors.get(key) ?? null;
  }

  private languageKeyFromPath(filePath: string): string | null {
    const ext = extname(filePath).toLowerCase();

    // Special case: .tsx needs its own grammar
    if (ext === ".tsx") return "tsx";

    return this._extensionToLang.get(ext) ?? null;
  }

  /**
   * Initialize the plugin by loading the WASM module and all language grammars.
   * Must be called (and awaited) before any synchronous methods.
   */
  async init(): Promise<void> {
    if (this._initialized) return;

    const mod = await import("web-tree-sitter");
    const ParserCls = mod.Parser;
    const LanguageCls = mod.Language;

    await ParserCls.init();
    this._ParserClass = ParserCls as unknown as new () => TreeSitterParser;

    if (this.configs.length > 0) {
      // Load grammars from configs
      const loadPromises: Promise<void>[] = [];

      for (const config of this.configs) {
        if (!config.treeSitter) continue;

        const loadGrammar = async () => {
          // Try the npm-published grammar first; if its WASM is missing or
          // fails to load (e.g. the npm package ships an outdated dylink
          // format), fall back to a copy bundled inside this package under
          // `wasm-grammars/`.
          const tryLoad = async (path: string) => LanguageCls.load(path);
          const bundledPath = bundledWasmPath(config.treeSitter!.wasmFile);

          let loaded = false;
          try {
            const wasmPath = require.resolve(
              `${config.treeSitter!.wasmPackage}/${config.treeSitter!.wasmFile}`,
            );
            const lang = await tryLoad(wasmPath);
            this._languages.set(config.id, lang);
            loaded = true;
          } catch {
            // Will try bundled fallback below.
          }

          if (!loaded && bundledPath && existsSync(bundledPath)) {
            try {
              const lang = await tryLoad(bundledPath);
              this._languages.set(config.id, lang);
              loaded = true;
            } catch {
              // fall through to debug log
            }
          }

          if (!loaded) {
            console.debug?.(
              `tree-sitter: Could not load grammar for ${config.id}, skipping structural analysis`,
            );
            return;
          }

          // Special handling for TypeScript: also load TSX grammar
          if (config.id === "typescript") {
            try {
              const tsxWasm = require.resolve(
                `${config.treeSitter!.wasmPackage}/tree-sitter-tsx.wasm`,
              );
              const tsxLang = await tryLoad(tsxWasm);
              this._languages.set("tsx", tsxLang);
            } catch {
              // TSX grammar not available; .tsx files will fall back to TS grammar
            }
          }
        };

        loadPromises.push(loadGrammar());
      }

      await Promise.all(loadPromises);
    } else {
      // Legacy fallback: load TS/JS grammars directly
      const tsWasm = require.resolve(
        "tree-sitter-typescript/tree-sitter-typescript.wasm",
      );
      const tsxWasm = require.resolve(
        "tree-sitter-typescript/tree-sitter-tsx.wasm",
      );
      const jsWasm = require.resolve(
        "tree-sitter-javascript/tree-sitter-javascript.wasm",
      );

      const [tsLang, tsxLang, jsLang] = await Promise.all([
        LanguageCls.load(tsWasm),
        LanguageCls.load(tsxWasm),
        LanguageCls.load(jsWasm),
      ]);

      this._languages.set("typescript", tsLang);
      this._languages.set("tsx", tsxLang);
      this._languages.set("javascript", jsLang);
    }

    this._initialized = true;
  }

  /**
   * Create a parser set to the appropriate language for the given file.
   * This is synchronous because all languages are pre-loaded during init().
   */
  private getParser(filePath: string): TreeSitterParser | null {
    if (!this._initialized || !this._ParserClass) {
      throw new Error(
        "TreeSitterPlugin.init() must be called before use",
      );
    }
    const langKey = this.languageKeyFromPath(filePath);
    if (!langKey) return null;
    const lang = this._languages.get(langKey);
    if (!lang) {
      // Language grammar not loaded — graceful degradation
      return null;
    }
    const parser = new this._ParserClass();
    parser.setLanguage(lang);
    return parser;
  }

  analyzeFile(
    filePath: string,
    content: string,
  ): StructuralAnalysis {
    const parser = this.getParser(filePath);
    if (!parser) {
      return { functions: [], classes: [], imports: [], exports: [] };
    }

    const tree = parser.parse(content);
    if (!tree) {
      parser.delete();
      return { functions: [], classes: [], imports: [], exports: [] };
    }

    const langKey = this.languageKeyFromPath(filePath);
    const extractor = langKey ? this.getExtractor(langKey) : null;

    let result: StructuralAnalysis;
    if (extractor) {
      result = extractor.extractStructure(tree.rootNode);
    } else {
      result = { functions: [], classes: [], imports: [], exports: [] };
    }

    tree.delete();
    parser.delete();

    return result;
  }

  resolveImports(
    filePath: string,
    content: string,
  ): ImportResolution[] {
    const analysis = this.analyzeFile(filePath, content);
    const dir = dirname(filePath);

    return analysis.imports.map((imp) => {
      let resolvedPath: string;
      if (
        imp.source.startsWith("./") ||
        imp.source.startsWith("../")
      ) {
        resolvedPath = resolve(dir, imp.source);
      } else {
        resolvedPath = imp.source;
      }
      return {
        source: imp.source,
        resolvedPath,
        specifiers: imp.specifiers,
      };
    });
  }

  extractCallGraph(
    filePath: string,
    content: string,
  ): CallGraphEntry[] {
    const parser = this.getParser(filePath);
    if (!parser) return [];

    const tree = parser.parse(content);
    if (!tree) {
      parser.delete();
      return [];
    }

    const langKey = this.languageKeyFromPath(filePath);
    const extractor = langKey ? this.getExtractor(langKey) : null;
    const result = extractor ? extractor.extractCallGraph(tree.rootNode) : [];

    tree.delete();
    parser.delete();

    return result;
  }
}
