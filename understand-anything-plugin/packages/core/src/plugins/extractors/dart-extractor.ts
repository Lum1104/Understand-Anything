import type { StructuralAnalysis, CallGraphEntry } from "../../types.js";
import type { LanguageExtractor, TreeSitterNode } from "./types.js";
import { findChild, findChildren, traverse } from "./base-extractor.js";

/**
 * Dart extractor for tree-sitter structural analysis.
 *
 * Grammar reference: tree-sitter-dart (UserNobody14/tree-sitter-dart).
 *
 * Top-level mapping:
 * - class_definition / mixin_declaration / extension_declaration → classes
 * - enum_declaration → classes (Dart enums can carry methods/fields)
 * - top-level `function_signature` → functions
 * - library_import → imports (source is the URI text, trimmed of quotes)
 * - library_export is recorded as an import-style edge with an "*" specifier
 *   so the graph reviewer can still detect re-exports.
 *
 * Visibility convention (Dart): names starting with "_" are library-private.
 * Anything else is exported.
 */
export class DartExtractor implements LanguageExtractor {
  readonly languageIds = ["dart"];

  extractStructure(rootNode: TreeSitterNode): StructuralAnalysis {
    const functions: StructuralAnalysis["functions"] = [];
    const classes: StructuralAnalysis["classes"] = [];
    const imports: StructuralAnalysis["imports"] = [];
    const exports: StructuralAnalysis["exports"] = [];

    // Walk top-level children of the program node. tree-sitter-dart represents
    // top-level functions as a `function_signature` followed by a sibling
    // `function_body`, so we iterate index-by-index to pair them.
    for (let i = 0; i < rootNode.childCount; i++) {
      const node = rootNode.child(i);
      if (!node) continue;

      switch (node.type) {
        case "class_definition":
          this.extractClass(node, classes, exports);
          break;

        case "mixin_declaration":
          this.extractMixin(node, classes, exports);
          break;

        case "extension_declaration":
          this.extractExtension(node, classes, exports);
          break;

        case "enum_declaration":
          this.extractEnum(node, classes, exports);
          break;

        case "function_signature": {
          // Top-level function: pair with the trailing function_body if present
          const next = rootNode.child(i + 1);
          const endLine =
            next && next.type === "function_body"
              ? next.endPosition.row + 1
              : node.endPosition.row + 1;
          this.extractTopLevelFunction(node, endLine, functions, exports);
          break;
        }

        case "getter_signature":
        case "setter_signature": {
          const nameNode = node.childForFieldName("name");
          if (nameNode) {
            const next = rootNode.child(i + 1);
            const endLine =
              next && next.type === "function_body"
                ? next.endPosition.row + 1
                : node.endPosition.row + 1;
            functions.push({
              name: nameNode.text,
              lineRange: [node.startPosition.row + 1, endLine],
              params: [],
            });
            if (isExported(nameNode.text)) {
              exports.push({
                name: nameNode.text,
                lineNumber: node.startPosition.row + 1,
              });
            }
          }
          break;
        }

        case "library_import":
          this.extractImport(node, imports);
          break;

        case "library_export":
          this.extractExportDirective(node, imports);
          break;

        case "import_or_export": {
          // tree-sitter-dart wraps imports/exports in an `import_or_export`
          // node at the program level. Unwrap and dispatch.
          const lib =
            findChild(node, "library_import") ??
            findChild(node, "library_export");
          if (!lib) break;
          if (lib.type === "library_import") {
            this.extractImport(lib, imports);
          } else {
            this.extractExportDirective(lib, imports);
          }
          break;
        }
      }
    }

    return { functions, classes, imports, exports };
  }

  // tree-sitter-dart does not expose a single `call_expression` node; calls are
  // expressed via chained selectors (`identifier` + `argument_part`). Producing
  // a clean caller→callee mapping requires nontrivial heuristics, so we return
  // [] here and let the LLM-side analysis cover semantic call relationships.
  extractCallGraph(_rootNode: TreeSitterNode): CallGraphEntry[] {
    return [];
  }

  // ---- Private helpers ----

  private extractClass(
    node: TreeSitterNode,
    classes: StructuralAnalysis["classes"],
    exports: StructuralAnalysis["exports"],
  ): void {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return;

    const bodyNode = node.childForFieldName("body");
    const { methods, properties } = bodyNode
      ? this.extractClassBody(bodyNode)
      : { methods: [], properties: [] };

    classes.push({
      name: nameNode.text,
      lineRange: [node.startPosition.row + 1, node.endPosition.row + 1],
      methods,
      properties,
    });

    if (isExported(nameNode.text)) {
      exports.push({
        name: nameNode.text,
        lineNumber: node.startPosition.row + 1,
      });
    }
  }

  private extractMixin(
    node: TreeSitterNode,
    classes: StructuralAnalysis["classes"],
    exports: StructuralAnalysis["exports"],
  ): void {
    const nameNode = findChild(node, "identifier");
    if (!nameNode) return;

    const bodyNode = findChild(node, "class_body");
    const { methods, properties } = bodyNode
      ? this.extractClassBody(bodyNode)
      : { methods: [], properties: [] };

    classes.push({
      name: nameNode.text,
      lineRange: [node.startPosition.row + 1, node.endPosition.row + 1],
      methods,
      properties,
    });

    if (isExported(nameNode.text)) {
      exports.push({
        name: nameNode.text,
        lineNumber: node.startPosition.row + 1,
      });
    }
  }

  private extractExtension(
    node: TreeSitterNode,
    classes: StructuralAnalysis["classes"],
    exports: StructuralAnalysis["exports"],
  ): void {
    // Anonymous extensions are allowed (`extension on Foo { ... }`); they have
    // no `identifier` direct child, so we skip the export but still record
    // the structure under a synthetic name.
    const nameNode = findChild(node, "identifier");
    const bodyNode = node.childForFieldName("body");
    const { methods, properties } = bodyNode
      ? this.extractClassBody(bodyNode)
      : { methods: [], properties: [] };

    const name = nameNode ? nameNode.text : `_AnonymousExtension_${node.startPosition.row + 1}`;

    classes.push({
      name,
      lineRange: [node.startPosition.row + 1, node.endPosition.row + 1],
      methods,
      properties,
    });

    if (nameNode && isExported(nameNode.text)) {
      exports.push({
        name: nameNode.text,
        lineNumber: node.startPosition.row + 1,
      });
    }
  }

  private extractEnum(
    node: TreeSitterNode,
    classes: StructuralAnalysis["classes"],
    exports: StructuralAnalysis["exports"],
  ): void {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return;

    const bodyNode = node.childForFieldName("body");
    const properties: string[] = [];
    if (bodyNode) {
      // Enum constants live in the body; collect identifier names as properties.
      const constants = findChildren(bodyNode, "enum_constant");
      for (const c of constants) {
        const id = findChild(c, "identifier");
        if (id) properties.push(id.text);
      }
    }

    classes.push({
      name: nameNode.text,
      lineRange: [node.startPosition.row + 1, node.endPosition.row + 1],
      methods: [],
      properties,
    });

    if (isExported(nameNode.text)) {
      exports.push({
        name: nameNode.text,
        lineNumber: node.startPosition.row + 1,
      });
    }
  }

  private extractClassBody(bodyNode: TreeSitterNode): {
    methods: string[];
    properties: string[];
  } {
    const methods: string[] = [];
    const properties: string[] = [];

    // class_body children: declaration | method_signature | function_body | annotation
    for (let i = 0; i < bodyNode.childCount; i++) {
      const child = bodyNode.child(i);
      if (!child) continue;

      if (child.type === "method_signature") {
        // method_signature → wraps function/getter/setter/operator/constructor signatures.
        // We pull the inner signature's name.
        const inner =
          findChild(child, "function_signature") ??
          findChild(child, "getter_signature") ??
          findChild(child, "setter_signature") ??
          findChild(child, "operator_signature") ??
          findChild(child, "constructor_signature") ??
          findChild(child, "factory_constructor_signature");
        if (inner) {
          const nameNode = inner.childForFieldName("name");
          if (nameNode) {
            methods.push(nameNode.text);
          } else {
            // factory_constructor_signature has no field name; fallback to first identifier
            const fallback = findChild(inner, "identifier");
            if (fallback) methods.push(fallback.text);
          }
        }
      } else if (child.type === "declaration") {
        // declarations cover fields and inline method definitions.
        // - function_signature inside declaration → method
        // - identifier list / initialized_identifier → field
        const fnSig = findChild(child, "function_signature");
        if (fnSig) {
          const nameNode = fnSig.childForFieldName("name");
          if (nameNode) methods.push(nameNode.text);
        }

        const getter = findChild(child, "getter_signature");
        if (getter) {
          const nameNode = getter.childForFieldName("name");
          if (nameNode) methods.push(nameNode.text);
        }
        const setter = findChild(child, "setter_signature");
        if (setter) {
          const nameNode = setter.childForFieldName("name");
          if (nameNode) methods.push(nameNode.text);
        }

        const ctor = findChild(child, "constructor_signature");
        if (ctor) {
          const nameNode = ctor.childForFieldName("name");
          if (nameNode) methods.push(nameNode.text);
          else {
            const fallback = findChild(ctor, "identifier");
            if (fallback) methods.push(fallback.text);
          }
        }

        const factoryCtor = findChild(child, "factory_constructor_signature");
        if (factoryCtor) {
          // factory constructors: `factory Foo()` or `factory Foo.named()`
          const ids = findChildren(factoryCtor, "identifier");
          if (ids.length > 0) methods.push(ids.map((n) => n.text).join("."));
        }

        // Field declarations: collect identifiers from initialized_identifier_list /
        // static_final_declaration_list / initialized_identifier descendants.
        traverse(child, (n) => {
          if (n.type === "initialized_identifier") {
            const id = findChild(n, "identifier");
            if (id) properties.push(id.text);
          } else if (n.type === "static_final_declaration") {
            const id = findChild(n, "identifier");
            if (id) properties.push(id.text);
          }
        });
      }
    }

    return { methods, properties };
  }

  private extractTopLevelFunction(
    sigNode: TreeSitterNode,
    endLine: number,
    functions: StructuralAnalysis["functions"],
    exports: StructuralAnalysis["exports"],
  ): void {
    const nameNode = sigNode.childForFieldName("name");
    if (!nameNode) return;

    const params = extractParamNames(findChild(sigNode, "formal_parameter_list"));
    const returnType = extractReturnType(sigNode);

    functions.push({
      name: nameNode.text,
      lineRange: [sigNode.startPosition.row + 1, endLine],
      params,
      returnType,
    });

    if (isExported(nameNode.text)) {
      exports.push({
        name: nameNode.text,
        lineNumber: sigNode.startPosition.row + 1,
      });
    }
  }

  private extractImport(
    node: TreeSitterNode,
    imports: StructuralAnalysis["imports"],
  ): void {
    const spec = findChild(node, "import_specification");
    if (!spec) return;

    const source = extractUri(spec);
    if (!source) return;

    // Look for `as <alias>` identifier or fall back to the URI's last path
    // segment (without extension). For Dart, `package:flutter/material.dart`
    // becomes "material" — this matches how the language registry treats
    // unaliased imports across other extractors.
    const alias = findChild(spec, "identifier");
    let specifier: string;
    if (alias) {
      specifier = alias.text;
    } else {
      // For `package:foo/bar.dart` → "bar"; for `dart:async` → "async";
      // for bare `dart:` schemes without a slash, split on ":" first.
      const afterColon = source.includes(":") ? source.split(":").pop()! : source;
      const last = afterColon.split("/").pop() ?? afterColon;
      specifier = last.replace(/\.dart$/i, "");
    }

    imports.push({
      source,
      specifiers: [specifier],
      lineNumber: node.startPosition.row + 1,
    });
  }

  private extractExportDirective(
    node: TreeSitterNode,
    imports: StructuralAnalysis["imports"],
  ): void {
    const source = extractUri(node);
    if (!source) return;
    imports.push({
      source,
      specifiers: ["*"],
      lineNumber: node.startPosition.row + 1,
    });
  }
}

// ---- module-private helpers ----

function isExported(name: string): boolean {
  return !name.startsWith("_");
}

function extractUri(parent: TreeSitterNode): string | null {
  // import_specification or library_export children include `configurable_uri`
  // or `uri`. Both ultimately wrap a string literal.
  const configurable = findChild(parent, "configurable_uri");
  const uri = configurable
    ? findChild(configurable, "uri") ?? configurable
    : findChild(parent, "uri");
  if (!uri) return null;
  // `uri` text is typically a string literal: 'package:foo/bar.dart'
  const stringLit = findChild(uri, "string_literal") ?? uri;
  return stripQuotes(stringLit.text);
}

function stripQuotes(text: string): string {
  return text.replace(/^['"]|['"]$/g, "").replace(/^['"]{3}|['"]{3}$/g, "");
}

function extractParamNames(
  paramsNode: TreeSitterNode | null,
): string[] {
  if (!paramsNode) return [];
  const names: string[] = [];

  const collect = (n: TreeSitterNode) => {
    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (!child) continue;
      if (child.type === "formal_parameter") {
        const nameField = child.childForFieldName("name");
        if (nameField) {
          names.push(nameField.text);
        } else {
          // Fallback: last identifier child is usually the param name
          const ids = findChildren(child, "identifier");
          if (ids.length > 0) names.push(ids[ids.length - 1]!.text);
        }
      } else if (
        child.type === "optional_formal_parameters" ||
        child.type === "named_formal_parameters" ||
        child.type === "default_formal_parameter" ||
        child.type === "default_named_parameter"
      ) {
        // Recurse into wrappers for `[a, b]` / `{a, b}` / `a = 1` shapes.
        collect(child);
      }
    }
  };

  collect(paramsNode);
  return names;
}

function extractReturnType(sigNode: TreeSitterNode): string | undefined {
  // function_signature children include the return type as `type_identifier`,
  // `void_type`, or `function_type` placed before the `name` identifier.
  // We grab the first such typed child if present.
  for (let i = 0; i < sigNode.childCount; i++) {
    const child = sigNode.child(i);
    if (!child) continue;
    if (
      child.type === "type_identifier" ||
      child.type === "void_type" ||
      child.type === "function_type"
    ) {
      return child.text;
    }
    if (child.type === "identifier") {
      // Reached the name field — no return type was present before it.
      return undefined;
    }
  }
  return undefined;
}
