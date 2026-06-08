import type { LanguageConfig } from "../types.js";

export const dartConfig = {
  id: "dart",
  displayName: "Dart",
  extensions: [".dart"],
  treeSitter: {
    wasmPackage: "tree-sitter-dart",
    wasmFile: "tree-sitter-dart.wasm",
  },
  concepts: [
    "null safety",
    "futures and async/await",
    "streams",
    "mixins",
    "extensions",
    "isolates",
    "named/optional parameters",
    "factory constructors",
    "const constructors",
    "generics",
    "sealed classes and pattern matching",
  ],
  filePatterns: {
    entryPoints: ["lib/main.dart", "bin/main.dart", "lib/*.dart"],
    barrels: ["lib/*.dart"],
    tests: ["test/**/*_test.dart", "integration_test/**/*.dart"],
    config: ["pubspec.yaml", "analysis_options.yaml", "build.yaml"],
  },
} satisfies LanguageConfig;
