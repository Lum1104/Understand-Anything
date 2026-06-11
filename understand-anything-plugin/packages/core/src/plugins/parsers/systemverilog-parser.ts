// SystemVerilog / Verilog structural parser (custom, non-tree-sitter).
//
// Exposes a rich `analyzeHdl()` (used by the deterministic HDL graph assembler)
// and a `SystemVerilogParser` AnalyzerPlugin (used by UA's normal pipeline).
// Cross-symbol edge resolution (instantiation -> module, extends -> base) is the
// assembler's job; `analyzeHdl` only reports raw per-file facts.

import type { AnalyzerPlugin, StructuralAnalysis, DefinitionInfo } from "../../types.js";

export interface HdlInstantiation { type: string; instance: string; line: number; }
export interface HdlModule {
  name: string;
  kind: "module" | "interface" | "program";
  lineRange: [number, number];
  ports: string[];
  params: string[];
  instantiations: HdlInstantiation[];
}
/** A UVM component/object constructed via the factory: `handle = Type::type_id::create(...)`. */
export interface HdlCreate { handle?: string; type: string; }
/** A raw TLM `lhs.connect(rhs)` call; chains are dotted handle paths resolved by the assembler. */
export interface HdlConnect { from: string; to: string; }
export interface HdlClass {
  name: string;
  base?: string;
  lineRange: [number, number];
  /** Component/object types this class constructs via the UVM factory (composition / "has-a"). */
  creates: HdlCreate[];
  /** TLM port/export wiring (`a.b.connect(c.d)`) captured as raw handle chains. */
  connects: HdlConnect[];
}
export interface HdlPackage { name: string; lineRange: [number, number]; }
export interface HdlFunction { name: string; kind: "function" | "task"; lineRange: [number, number]; }
export interface HdlImport { pkg: string; line: number; }
export interface HdlAnalysis {
  modules: HdlModule[];
  classes: HdlClass[];
  packages: HdlPackage[];
  functions: HdlFunction[];
  imports: HdlImport[];
}

/** Replace // and block comments + string literals with spaces, preserving newlines so line numbers stay stable. */
export function stripSvComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") { out += " "; i++; }
    } else if (c === "/" && d === "*") {
      out += "  "; i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { out += src[i] === "\n" ? "\n" : " "; i++; }
      out += "  "; i += 2;
    } else if (c === '"') {
      out += " "; i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === "\\") { out += "  "; i += 2; }
        else { out += src[i] === "\n" ? "\n" : " "; i++; }
      }
      out += " "; i++;
    } else {
      out += c; i++;
    }
  }
  return out;
}

const KEYWORDS = new Set([
  "module", "macromodule", "endmodule", "interface", "endinterface", "program", "endprogram",
  "package", "endpackage", "class", "endclass", "extends", "function", "endfunction", "task", "endtask",
  "begin", "end", "if", "else", "for", "while", "do", "foreach", "case", "endcase", "generate", "endgenerate",
  "assign", "always", "always_ff", "always_comb", "always_latch", "initial", "import", "typedef", "enum",
  "struct", "union", "logic", "wire", "reg", "bit", "int", "integer", "input", "output", "inout", "parameter",
  "localparam", "return", "new", "virtual", "pure", "static", "automatic", "const", "ref", "var", "void",
]);

const lineAt = (src: string, idx: number): number => src.slice(0, idx).split("\n").length;

function extractParams(header: string): string[] {
  const out: string[] = [];
  const re = /\bparameter\b[^;,)]*?\b([A-Za-z_]\w*)\s*=/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header))) out.push(m[1]);
  return out;
}

function extractPorts(header: string): string[] {
  const out: string[] = [];
  const re = /\b(?:input|output|inout)\b[^;,()]*?\b([A-Za-z_]\w*)\s*(?=[,)])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header))) out.push(m[1]);
  return out;
}

/** UVM factory constructions in a class body: `handle = Type::type_id::create(...)`. */
function extractCreates(body: string): HdlCreate[] {
  const out: HdlCreate[] = [];
  const seen = new Set<string>();
  // Optional `handle =` capture; `Type::type_id::create` is the factory signature.
  const re = /(?:([A-Za-z_]\w*)\s*=\s*)?\b([A-Za-z_]\w*)\s*::\s*type_id\s*::\s*create\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const handle = m[1];
    const type = m[2];
    const key = `${handle ?? ""}:${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ handle, type });
  }
  return out;
}

/** TLM wiring in a class body: `a.b.c.connect(d.e)` -> raw dotted handle chains. */
function extractConnects(body: string): HdlConnect[] {
  const out: HdlConnect[] = [];
  const re = /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\.connect\s*\(\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.push({ from: m[1], to: m[2] });
  return out;
}

export function analyzeHdl(rawSrc: string): HdlAnalysis {
  const src = stripSvComments(rawSrc);
  const modules: HdlModule[] = [];
  const classes: HdlClass[] = [];
  const packages: HdlPackage[] = [];
  const functions: HdlFunction[] = [];
  const imports: HdlImport[] = [];
  let m: RegExpExecArray | null;

  // Packages
  const pkgRe = /\bpackage\s+([A-Za-z_]\w*)\b([\s\S]*?)\bendpackage\b/g;
  while ((m = pkgRe.exec(src))) {
    packages.push({ name: m[1], lineRange: [lineAt(src, m.index), lineAt(src, m.index + m[0].length)] });
  }

  // Classes (optional extends; strip param spec from base). Group 3 captures the
  // class body so we can mine UVM composition (factory creates) and TLM wiring.
  const classRe = /\bclass\s+([A-Za-z_]\w*)\s*(?:#\s*\([\s\S]*?\)\s*)?(?:extends\s+([A-Za-z_][\w:]*)\s*(?:#\s*\([\s\S]*?\)\s*)?)?([\s\S]*?)\bendclass\b/g;
  while ((m = classRe.exec(src))) {
    classes.push({
      name: m[1],
      base: m[2] ? m[2].replace(/::$/, "") : undefined,
      lineRange: [lineAt(src, m.index), lineAt(src, m.index + m[0].length)],
      creates: extractCreates(m[3]),
      connects: extractConnects(m[3]),
    });
  }

  // Functions / tasks
  const fnRe = /\b(function|task)\b\s+(?:automatic\s+|static\s+|virtual\s+)*(?:[A-Za-z_][\w:$]*\s+)*?([A-Za-z_]\w*)\s*[(;]/g;
  while ((m = fnRe.exec(src))) {
    functions.push({ name: m[2], kind: m[1] as "function" | "task", lineRange: [lineAt(src, m.index), lineAt(src, m.index)] });
  }

  // Package imports
  const impRe = /\bimport\s+([A-Za-z_]\w*)\s*::/g;
  while ((m = impRe.exec(src))) {
    imports.push({ pkg: m[1], line: lineAt(src, m.index) });
  }

  // Modules / interfaces / programs (+ header ports/params + candidate instantiations)
  const modRe = /\b(module|macromodule|interface|program)\s+([A-Za-z_]\w*)([\s\S]*?)\bend(?:module|interface|program)\b/g;
  while ((m = modRe.exec(src))) {
    const kind = (m[1] === "macromodule" ? "module" : m[1]) as "module" | "interface" | "program";
    const name = m[2];
    const body = m[3];
    const start = lineAt(src, m.index);
    const end = lineAt(src, m.index + m[0].length);
    const semi = body.indexOf(";");
    const header = semi >= 0 ? body.slice(0, semi) : body;
    const inner = semi >= 0 ? body.slice(semi + 1) : "";
    const params = extractParams(header);
    const ports = extractPorts(header);
    const instantiations: HdlInstantiation[] = [];
    // Require real separation between Type and instance: a #(...) param block OR whitespace.
    // Without this, `clk(` backtracks into type="cl", instance="k" (false positive).
    const instRe = /\b([A-Za-z_]\w*)(?:\s*#\s*\([\s\S]*?\)\s*|\s+)([A-Za-z_]\w*)\s*\(/g;
    let im: RegExpExecArray | null;
    while ((im = instRe.exec(inner))) {
      const type = im[1], instance = im[2];
      if (KEYWORDS.has(type) || KEYWORDS.has(instance)) continue;
      instantiations.push({ type, instance, line: start + (inner.slice(0, im.index).split("\n").length - 1) });
    }
    modules.push({ name, kind, lineRange: [start, end], ports, params, instantiations });
  }

  return { modules, classes, packages, functions, imports };
}

export class SystemVerilogParser implements AnalyzerPlugin {
  name = "systemverilog-parser";
  languages = ["systemverilog"];

  analyzeFile(_filePath: string, content: string): StructuralAnalysis {
    const h = analyzeHdl(content);
    const definitions: DefinitionInfo[] = [
      ...h.modules.map((mod) => ({ name: mod.name, kind: mod.kind, lineRange: mod.lineRange, fields: mod.ports })),
      ...h.packages.map((p) => ({ name: p.name, kind: "package", lineRange: p.lineRange, fields: [] as string[] })),
    ];
    return {
      functions: h.functions.map((f) => ({ name: f.name, lineRange: f.lineRange, params: [] as string[] })),
      classes: h.classes.map((c) => ({ name: c.name, lineRange: c.lineRange, methods: [] as string[], properties: [] as string[] })),
      imports: h.imports.map((i) => ({ source: i.pkg, specifiers: ["*"], lineNumber: i.line })),
      exports: [],
      definitions,
    };
  }
}
