# Rust cross-crate import resolution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Rust import resolver in `extract-import-map.mjs` resolve cross-crate `use other_crate::…` imports, intra-crate `crate::` when the crate root is overridden via `[lib] path`, and bare-module `use crate::mod;` / `use super::mod;` imports.

**Architecture:** Mirror the existing Go (`go.mod`) / PHP (`composer.json`) pattern — scan `files[]` for `Cargo.toml`, parse with `smol-toml`, build a `crateIdent → srcDir` map once in `buildResolutionContext`, and consume it in `resolveRustImport` / `findRustCrateSrc`.

**Tech Stack:** Node ESM, `smol-toml` (TOML parser, added to `@understand-anything/core`), Vitest. Node lives in the `ua-node` mamba env, so **every** node/pnpm command is prefixed `mamba run -n ua-node`.

**Branch:** `fix/rust-cross-crate-import-resolution` (already checked out).

**Spec:** `docs/superpowers/specs/2026-06-10-rust-cross-crate-import-resolution-design.md`

---

## File Structure

- **Create** `understand-anything-plugin/packages/core/src/manifests/cargo.ts` — `parseCargoManifest(content)` returning `{ packageName, libName, libPath } | null`. Sole responsibility: read the three Cargo.toml fields we need via `smol-toml`.
- **Create** `understand-anything-plugin/packages/core/src/__tests__/cargo-manifest.test.ts` — unit tests for the parser.
- **Modify** `understand-anything-plugin/packages/core/package.json` — declare `smol-toml` dependency.
- **Modify** `understand-anything-plugin/packages/core/src/index.ts` — re-export `parseCargoManifest`.
- **Modify** `understand-anything-plugin/skills/understand/extract-import-map.mjs` — `loadCargoCrates` loader, wire into `buildResolutionContext`, make `findRustCrateSrc` manifest-aware, extend `resolveRustImport` (cross-crate + bare-module + `specifiers` arg), pass `imp.specifiers` from the dispatcher.
- **Modify** `tests/skill/understand/test_extract_import_map.test.mjs` — add cross-crate, `[lib].path`, and bare-module cases to the existing Rust `describe` block.

---

## Task 1: Add `smol-toml` dep + `parseCargoManifest` in core

**Files:**
- Modify: `understand-anything-plugin/packages/core/package.json`
- Create: `understand-anything-plugin/packages/core/src/manifests/cargo.ts`
- Test: `understand-anything-plugin/packages/core/src/__tests__/cargo-manifest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `understand-anything-plugin/packages/core/src/__tests__/cargo-manifest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseCargoManifest } from "../manifests/cargo.js";

describe("parseCargoManifest", () => {
  it("reads [package].name", () => {
    const r = parseCargoManifest(`[package]\nname = "my-crate"\nversion = "0.1.0"\n`);
    expect(r).toEqual({ packageName: "my-crate", libName: null, libPath: null });
  });

  it("reads [lib].name and [lib].path overrides", () => {
    const r = parseCargoManifest(
      `[package]\nname = "df-common"\n[lib]\nname = "datafusion_common"\npath = "src/mod.rs"\n`,
    );
    expect(r).toEqual({
      packageName: "df-common",
      libName: "datafusion_common",
      libPath: "src/mod.rs",
    });
  });

  it("does not mistake [[bin]].name for the crate name", () => {
    const r = parseCargoManifest(
      `[package]\nname = "real-pkg"\n[[bin]]\nname = "some_bin"\npath = "src/bin/x.rs"\n`,
    );
    expect(r?.packageName).toBe("real-pkg");
    expect(r?.libName).toBeNull();
  });

  it("returns null for a virtual workspace manifest", () => {
    const r = parseCargoManifest(`[workspace]\nmembers = ["crates/*"]\n`);
    expect(r).toBeNull();
  });

  it("throws on malformed TOML", () => {
    expect(() => parseCargoManifest(`[package\nname = `)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `mamba run -n ua-node pnpm --filter @understand-anything/core test -- cargo-manifest`
Expected: FAIL — cannot resolve `../manifests/cargo.js` (module does not exist).

- [ ] **Step 3: Add `smol-toml` to core's dependencies**

In `understand-anything-plugin/packages/core/package.json`, add to the `"dependencies"` object (alphabetical, before `"tree-sitter-c-sharp"`):

```json
    "smol-toml": "^1.6.0",
```

- [ ] **Step 4: Install so the direct dependency is linked**

Run: `mamba run -n ua-node pnpm install`
Expected: completes exit 0; `smol-toml` now a declared dep of `@understand-anything/core`.

- [ ] **Step 5: Write the implementation**

Create `understand-anything-plugin/packages/core/src/manifests/cargo.ts`:

```ts
import { parse } from "smol-toml";

export interface CargoManifestInfo {
  /** `[package].name` (hyphenated), or null if absent. */
  packageName: string | null;
  /** `[lib].name` override (the crate identifier used in `use ...`), or null. */
  libName: string | null;
  /** `[lib].path` crate-root override (e.g. "src/mod.rs"), or null. */
  libPath: string | null;
}

/**
 * Parse a Cargo.toml's content and extract the fields needed to map a crate
 * identifier to its source directory.
 *
 * Returns null for a virtual manifest (a workspace root with neither
 * [package] nor [lib]). Throws if the TOML is malformed — callers catch and
 * skip the manifest.
 */
export function parseCargoManifest(content: string): CargoManifestInfo | null {
  const parsed = parse(content) as Record<string, unknown>;

  const pkg =
    parsed.package && typeof parsed.package === "object"
      ? (parsed.package as Record<string, unknown>)
      : undefined;
  const lib =
    parsed.lib && typeof parsed.lib === "object"
      ? (parsed.lib as Record<string, unknown>)
      : undefined;

  const packageName = pkg && typeof pkg.name === "string" ? pkg.name : null;
  const libName = lib && typeof lib.name === "string" ? lib.name : null;
  const libPath = lib && typeof lib.path === "string" ? lib.path : null;

  if (packageName === null && libName === null) return null;
  return { packageName, libName, libPath };
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `mamba run -n ua-node pnpm --filter @understand-anything/core test -- cargo-manifest`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add understand-anything-plugin/packages/core/package.json \
        understand-anything-plugin/packages/core/src/manifests/cargo.ts \
        understand-anything-plugin/packages/core/src/__tests__/cargo-manifest.test.ts \
        pnpm-lock.yaml
git commit -m "feat(core): add parseCargoManifest + smol-toml dependency"
```

---

## Task 2: Export `parseCargoManifest` from core and rebuild

**Files:**
- Modify: `understand-anything-plugin/packages/core/src/index.ts:1` (top of the export list)

- [ ] **Step 1: Add the re-export**

In `understand-anything-plugin/packages/core/src/index.ts`, add after line 1 (`export * from "./types.js";`):

```ts
export { parseCargoManifest, type CargoManifestInfo } from "./manifests/cargo.js";
```

- [ ] **Step 2: Build core**

Run: `mamba run -n ua-node pnpm --filter @understand-anything/core build`
Expected: `tsc` exits 0; `dist/manifests/cargo.js` exists.

- [ ] **Step 3: Verify the symbol is importable from the built entry**

Run: `mamba run -n ua-node node -e "import('@understand-anything/core').then(m => console.log(typeof m.parseCargoManifest))"`
(run from repo root)
Expected: prints `function`.

- [ ] **Step 4: Commit**

```bash
git add understand-anything-plugin/packages/core/src/index.ts
git commit -m "feat(core): export parseCargoManifest from main entry"
```

---

## Task 3: Add failing resolver tests (cross-crate, [lib].path, bare-module)

**Files:**
- Modify: `tests/skill/understand/test_extract_import_map.test.mjs` — inside the existing `describe('extract-import-map.mjs — Rust resolver', …)` block, before its closing `});` at line 1138.

- [ ] **Step 1: Add the three test cases**

Insert these three `it(...)` blocks immediately after the `super::` test (after line 1137, before the `});` that closes the Rust describe):

```js
  it('resolves cross-crate use other_crate::module::item', () => {
    projectRoot = setupTree({
      'Cargo.toml': `[workspace]\nresolver = "2"\nmembers = ["crates/*"]\n`,
      'crates/core-utils/Cargo.toml': `[package]\nname = "test-core-utils"\nversion = "0.1.0"\n`,
      'crates/core-utils/src/lib.rs': `pub mod math;\n`,
      'crates/core-utils/src/math.rs': `pub fn add(a: i32, b: i32) -> i32 { a + b }\n`,
      'crates/app/Cargo.toml':
        `[package]\nname = "test-app"\nversion = "0.1.0"\n[dependencies]\ntest-core-utils = { path = "../core-utils" }\n`,
      'crates/app/src/main.rs': `use test_core_utils::math::add;\nfn main() { let _ = add(1, 2); }\n`,
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'Cargo.toml', language: 'toml', fileCategory: 'config' },
        { path: 'crates/core-utils/Cargo.toml', language: 'toml', fileCategory: 'config' },
        { path: 'crates/core-utils/src/lib.rs', language: 'rust', fileCategory: 'code' },
        { path: 'crates/core-utils/src/math.rs', language: 'rust', fileCategory: 'code' },
        { path: 'crates/app/Cargo.toml', language: 'toml', fileCategory: 'config' },
        { path: 'crates/app/src/main.rs', language: 'rust', fileCategory: 'code' },
      ],
    });

    expect(result.status).toBe(0);
    // crate name `test_core_utils` (hyphens->underscores) maps to its src dir.
    expect(result.output.importMap['crates/app/src/main.rs']).toEqual([
      'crates/core-utils/src/math.rs',
    ]);
  });

  it('resolves intra-crate crate:: when [lib] path overrides the crate root', () => {
    projectRoot = setupTree({
      'Cargo.toml': `[workspace]\nresolver = "2"\nmembers = ["crates/*"]\n`,
      'crates/engine/Cargo.toml':
        `[package]\nname = "test-engine"\nversion = "0.1.0"\n[lib]\npath = "src/mod.rs"\n`,
      'crates/engine/src/mod.rs': `pub mod runner;\nuse crate::runner::Runner;\nfn boot() -> Runner { Runner }\n`,
      'crates/engine/src/runner.rs': `pub struct Runner;\n`,
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'Cargo.toml', language: 'toml', fileCategory: 'config' },
        { path: 'crates/engine/Cargo.toml', language: 'toml', fileCategory: 'config' },
        { path: 'crates/engine/src/mod.rs', language: 'rust', fileCategory: 'code' },
        { path: 'crates/engine/src/runner.rs', language: 'rust', fileCategory: 'code' },
      ],
    });

    expect(result.status).toBe(0);
    // `use crate::runner::Runner;` resolves even though the crate root is
    // src/mod.rs (not src/lib.rs); dedups with `mod runner;` to one edge.
    expect(result.output.importMap['crates/engine/src/mod.rs']).toEqual([
      'crates/engine/src/runner.rs',
    ]);
    // No "no crate root" warning should fire for this file.
    expect(result.stderr).not.toContain('no crate root');
  });

  it('resolves bare-module use crate::<module>;', () => {
    projectRoot = setupTree({
      'Cargo.toml': `[package]\nname = "cu"\nversion = "0.1.0"\n`,
      'src/lib.rs': `pub mod math;\npub mod text;\n`,
      'src/math.rs': `pub fn add(a: i32, b: i32) -> i32 { a + b }\n`,
      // bare module import: no `mod math;` here, so this is the ONLY path to
      // the text.rs -> math.rs edge.
      'src/text.rs': `use crate::math;\npub fn go(n: i32) -> i32 { math::add(n, n) }\n`,
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'Cargo.toml', language: 'toml', fileCategory: 'config' },
        { path: 'src/lib.rs', language: 'rust', fileCategory: 'code' },
        { path: 'src/math.rs', language: 'rust', fileCategory: 'code' },
        { path: 'src/text.rs', language: 'rust', fileCategory: 'code' },
      ],
    });

    expect(result.status).toBe(0);
    expect(result.output.importMap['src/text.rs']).toEqual(['src/math.rs']);
  });
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `mamba run -n ua-node pnpm test -- test_extract_import_map`
Expected: the 3 new Rust tests FAIL (cross-crate → `[]`; `[lib].path` → `[]` + "no crate root" warning present; bare-module → `[]`). Pre-existing tests still pass.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/skill/understand/test_extract_import_map.test.mjs
git commit -m "test: failing cases for Rust cross-crate, [lib].path, bare-module"
```

---

## Task 4: Build the crate map in `buildResolutionContext`

**Files:**
- Modify: `understand-anything-plugin/skills/understand/extract-import-map.mjs` — destructure `parseCargoManifest` (line 84), add `loadCargoCrates` (near `loadGoModules`), wire into `buildResolutionContext` (lines 359-405).

- [ ] **Step 1: Destructure `parseCargoManifest` from core**

Replace line 84:

```js
const { TreeSitterPlugin, PluginRegistry, builtinLanguageConfigs, registerAllParsers } = core;
```

with:

```js
const { TreeSitterPlugin, PluginRegistry, builtinLanguageConfigs, registerAllParsers, parseCargoManifest } = core;
```

- [ ] **Step 2: Add the `loadCargoCrates` loader**

Insert this function immediately after `loadGoModules` ends (after line 300, before the `findNearestConfigDir` doc comment at line 302):

```js
/**
 * Load every `Cargo.toml` discovered in the input file list and build a map
 * from crate identifier to the crate's source directory. Mirrors
 * loadGoModules.
 *
 * The crate identifier used in `use <ident>::...` is `[lib].name` if present,
 * else `[package].name` with hyphens replaced by underscores. The source dir
 * is `<cargo-dir>/<dirname([lib].path ?? 'src/lib.rs')>` — i.e. `src/` even
 * when the crate root is overridden to `src/mod.rs`. `srcDirs` collects every
 * crate's source dir so findRustCrateSrc can locate the importer's own crate.
 *
 * On parse failure for a specific Cargo.toml, buffers a Warning: and skips it.
 * Virtual manifests (workspace roots with no [package]/[lib]) yield null and
 * are skipped.
 */
async function loadCargoCrates(projectRoot, files) {
  const crates = new Map();   // crateIdent -> srcDir
  const srcDirs = new Set();  // every crate srcDir
  const warnings = [];
  const candidates = [];
  for (const f of files) {
    const p = toPosix(f.path);
    const base = p.includes('/') ? p.slice(p.lastIndexOf('/') + 1) : p;
    if (base !== 'Cargo.toml') continue;
    const absPath = join(projectRoot, p);
    if (!existsSync(absPath)) continue;
    candidates.push({ key: p, absPath });
  }
  const reads = await readFilesParallel(candidates);
  for (const { key: p, raw, err } of reads) {
    if (err) continue;
    let info;
    try {
      info = parseCargoManifest(raw);
    } catch (e) {
      warnings.push(
        `Warning: extract-import-map: Cargo.toml at ${join(projectRoot, p)} ` +
        `failed to parse (${e.message}) — cross-crate imports for this crate unresolved\n`,
      );
      continue;
    }
    if (!info) continue;
    const ident = info.libName
      ?? (info.packageName ? info.packageName.replaceAll('-', '_') : null);
    if (!ident) continue;
    const cargoDir = dirOf(p);
    const rootRel = info.libPath ?? 'src/lib.rs';
    const srcDir = resolveRelative(cargoDir, posix.dirname(rootRel));
    if (crates.has(ident)) {
      warnings.push(
        `Warning: extract-import-map: duplicate Rust crate identifier '${ident}' ` +
        `(keeping first) — check the workspace for clashing [lib] names\n`,
      );
      continue;
    }
    crates.set(ident, srcDir);
    srcDirs.add(srcDir);
  }
  return { crates, srcDirs, warnings };
}
```

- [ ] **Step 3: Wire it into `buildResolutionContext`**

Replace the `Promise.all` block (lines 359-369):

```js
  const [tsResult, goResult, phpResult] = await Promise.all([
    loadTsConfigs(projectRoot, files),
    loadGoModules(projectRoot, files),
    loadPhpAutoloads(projectRoot, files),
  ]);
  for (const w of tsResult.warnings) process.stderr.write(w);
  for (const w of goResult.warnings) process.stderr.write(w);
  for (const w of phpResult.warnings) process.stderr.write(w);
  const tsConfigs = tsResult.configs;
  const goModules = goResult.modules;
  const phpAutoloads = phpResult.autoloads;
```

with:

```js
  const [tsResult, goResult, phpResult, cargoResult] = await Promise.all([
    loadTsConfigs(projectRoot, files),
    loadGoModules(projectRoot, files),
    loadPhpAutoloads(projectRoot, files),
    loadCargoCrates(projectRoot, files),
  ]);
  for (const w of tsResult.warnings) process.stderr.write(w);
  for (const w of goResult.warnings) process.stderr.write(w);
  for (const w of phpResult.warnings) process.stderr.write(w);
  for (const w of cargoResult.warnings) process.stderr.write(w);
  const tsConfigs = tsResult.configs;
  const goModules = goResult.modules;
  const phpAutoloads = phpResult.autoloads;
  const rustCrates = cargoResult.crates;
  const rustCrateSrcDirs = cargoResult.srcDirs;
```

- [ ] **Step 4: Add the new fields to the returned context**

In the `return { … }` of `buildResolutionContext` (lines 391-405), add `rustCrates` and `rustCrateSrcDirs` after `phpAutoloads,`:

```js
    phpAutoloads,
    rustCrates,
    rustCrateSrcDirs,
    // Dedupe Sets for one-time-per-file warnings. Keyed by importer file
    // path. Mutated by resolvers.
    _warnedNoRustCrateRoot: new Set(),
    _warnedNoGoModule: new Set(),
  };
```

- [ ] **Step 5: Smoke-check the loader doesn't crash the script**

Run: `mamba run -n ua-node node understand-anything-plugin/skills/understand/extract-import-map.mjs /home/vunet/workspace/projects/repos/test/rust-multicrate/.ua-test/input.json /home/vunet/workspace/projects/repos/test/rust-multicrate/.ua-test/output-step4.json`
Expected: exit 0 (resolution not yet improved — that's Task 5).

- [ ] **Step 6: Commit**

```bash
git add understand-anything-plugin/skills/understand/extract-import-map.mjs
git commit -m "feat(resolver): build Rust crate-name->src map from Cargo.toml"
```

---

## Task 5: Cross-crate + [lib].path + bare-module in the resolver

**Files:**
- Modify: `understand-anything-plugin/skills/understand/extract-import-map.mjs` — `findRustCrateSrc` (lines 1267-1277), `resolveRustImport` (lines 1279-1336), dispatcher (lines 1445-1447).

- [ ] **Step 1: Make `findRustCrateSrc` manifest-aware**

Replace the whole function (lines 1267-1277):

```js
function findRustCrateSrc(importerDir, fileSet) {
  const parts = importerDir.split('/').filter(Boolean);
  for (let i = parts.length; i >= 0; i--) {
    const ancestor = parts.slice(0, i).join('/');
    const childSrc = ancestor ? `${ancestor}/src` : 'src';
    if (fileSet.has(`${childSrc}/lib.rs`) || fileSet.has(`${childSrc}/main.rs`)) {
      return childSrc;
    }
  }
  return null;
}
```

with:

```js
function findRustCrateSrc(importerDir, ctx) {
  // Manifest-driven: return the crate srcDir (from Cargo.toml) that is the
  // deepest ancestor of (or equal to) the importer. This honors [lib].path
  // crate-root overrides that the lib.rs/main.rs probe below would miss.
  if (ctx.rustCrateSrcDirs && ctx.rustCrateSrcDirs.size > 0) {
    let best = null;
    for (const srcDir of ctx.rustCrateSrcDirs) {
      if (importerDir === srcDir || importerDir.startsWith(`${srcDir}/`)) {
        if (best === null || srcDir.length > best.length) best = srcDir;
      }
    }
    if (best !== null) return best;
  }
  // Fallback: probe for a conventional crate root when no manifest is present
  // (single-file or non-Cargo layouts).
  const parts = importerDir.split('/').filter(Boolean);
  for (let i = parts.length; i >= 0; i--) {
    const ancestor = parts.slice(0, i).join('/');
    const childSrc = ancestor ? `${ancestor}/src` : 'src';
    if (ctx.fileSet.has(`${childSrc}/lib.rs`) || ctx.fileSet.has(`${childSrc}/main.rs`)) {
      return childSrc;
    }
  }
  return null;
}
```

- [ ] **Step 2: Rewrite `resolveRustImport` (cross-crate + bare-module + specifiers arg)**

Replace the whole function (lines 1279-1336):

```js
export function resolveRustImport(rawImport, file, ctx) {
  if (!rawImport || typeof rawImport !== 'string') return [];
  const src = rawImport.trim();
  if (!src) return [];

  const importerDir = dirOf(toPosix(file.path));
  const segments = src.split('::').filter(Boolean);
  if (segments.length === 0) return [];
  const head = segments[0];

  // External crates: anything not rooted at crate/super/self.
  if (head !== 'crate' && head !== 'super' && head !== 'self') return [];

  // Walk segments after the head to a base file path. We probe each
  // successive prefix from longest to shortest so that `crate::a::b::Item`
  // matches `a/b.rs` (with `Item` being a re-export inside) rather than
  // failing because `a/b/Item.rs` doesn't exist.
  let baseDir;
  if (head === 'crate') {
    const crateSrc = findRustCrateSrc(importerDir, ctx.fileSet);
    if (!crateSrc) {
      // Warn once per importer file (a single .rs file can have many
      // `use crate::...` statements; suppress duplicate warnings).
      const importerPath = toPosix(file.path);
      if (!ctx._warnedNoRustCrateRoot.has(importerPath)) {
        ctx._warnedNoRustCrateRoot.add(importerPath);
        process.stderr.write(
          `Warning: extract-import-map: Rust file ${importerPath} has ` +
          `'use crate::' but no crate root (src/lib.rs or src/main.rs) ` +
          `found — crate-relative imports unresolved\n`,
        );
      }
      return [];
    }
    baseDir = crateSrc;
  } else if (head === 'super') {
    // Walk up one directory from the importer
    const parts = importerDir.split('/').filter(Boolean);
    if (parts.length === 0) return [];
    baseDir = parts.slice(0, -1).join('/');
  } else {
    // self::
    baseDir = importerDir;
  }

  const rest = segments.slice(1);
  // Try each prefix length from longest -> shortest. The empty rest case
  // (e.g. bare `use crate;`) is unresolvable.
  for (let i = rest.length; i > 0; i--) {
    const prefix = rest.slice(0, i);
    const base = baseDir
      ? `${baseDir}/${prefix.join('/')}`
      : prefix.join('/');
    const match = probeRustModule(base, ctx.fileSet);
    if (match) return [match];
  }
  return [];
}
```

with:

```js
export function resolveRustImport(rawImport, file, ctx, specifiers = []) {
  if (!rawImport || typeof rawImport !== 'string') return [];
  const src = rawImport.trim();
  if (!src) return [];

  const importerDir = dirOf(toPosix(file.path));
  const segments = src.split('::').filter(Boolean);
  if (segments.length === 0) return [];
  const head = segments[0];

  // Resolve the base directory the rest of the path is anchored at:
  //  - crate  -> this crate's src root (manifest-aware; honors [lib].path)
  //  - super  -> one directory up from the importer
  //  - self   -> the importer's own directory
  //  - <crate name in the workspace> -> that crate's src root (cross-crate)
  //  - anything else (std, third-party) -> external, unresolved
  let baseDir;
  if (head === 'crate') {
    const crateSrc = findRustCrateSrc(importerDir, ctx);
    if (!crateSrc) {
      // Warn once per importer file (a single .rs file can have many
      // `use crate::...` statements; suppress duplicate warnings).
      const importerPath = toPosix(file.path);
      if (!ctx._warnedNoRustCrateRoot.has(importerPath)) {
        ctx._warnedNoRustCrateRoot.add(importerPath);
        process.stderr.write(
          `Warning: extract-import-map: Rust file ${importerPath} has ` +
          `'use crate::' but no crate root (src/lib.rs or src/main.rs) ` +
          `found — crate-relative imports unresolved\n`,
        );
      }
      return [];
    }
    baseDir = crateSrc;
  } else if (head === 'super') {
    const parts = importerDir.split('/').filter(Boolean);
    if (parts.length === 0) return [];
    baseDir = parts.slice(0, -1).join('/');
  } else if (head === 'self') {
    baseDir = importerDir;
  } else if (ctx.rustCrates && ctx.rustCrates.has(head)) {
    // Cross-crate: `use other_crate::module::Item;`
    baseDir = ctx.rustCrates.get(head);
  } else {
    return [];
  }

  const rest = segments.slice(1);
  // Symbol/list imports with an explicit module path: probe each prefix from
  // longest to shortest so `a::b::Item` matches `a/b.rs` (Item re-exported
  // inside) rather than failing on a nonexistent `a/b/Item.rs`.
  for (let i = rest.length; i > 0; i--) {
    const prefix = rest.slice(0, i);
    const base = baseDir ? `${baseDir}/${prefix.join('/')}` : prefix.join('/');
    const match = probeRustModule(base, ctx.fileSet);
    if (match) return [match];
  }

  // Bare-module import: `use crate::config;`, `use super::sibling;`,
  // `use other_crate::thing;`. tree-sitter puts the module name in
  // `specifiers`, not in `source`, so the loop above sees an empty `rest`.
  // Probe each plain specifier as a module under baseDir.
  if (rest.length === 0) {
    for (const spec of specifiers) {
      if (!spec || spec === '*' || spec === 'self') continue;
      const base = baseDir ? `${baseDir}/${spec}` : spec;
      const match = probeRustModule(base, ctx.fileSet);
      if (match) return [match];
    }
  }
  return [];
}
```

- [ ] **Step 3: Pass `imp.specifiers` from the dispatcher**

Replace the Rust branch in `resolveImport` (lines 1445-1447):

```js
  if (lang === 'rust') {
    return resolveRustImport(src, file, ctx);
  }
```

with:

```js
  if (lang === 'rust') {
    return resolveRustImport(src, file, ctx, imp.specifiers);
  }
```

- [ ] **Step 4: Run the Task 3 resolver tests to verify they pass**

Run: `mamba run -n ua-node pnpm test -- test_extract_import_map`
Expected: PASS — all Rust cases (including the 3 new ones) pass; no regressions in TS/JS/Go/PHP/C++ cases.

- [ ] **Step 5: Commit**

```bash
git add understand-anything-plugin/skills/understand/extract-import-map.mjs
git commit -m "feat(resolver): resolve Rust cross-crate, [lib].path, and bare-module imports"
```

---

## Task 6: Integration — verify the test repo goes 4 -> 9 edges

**Files:**
- No source changes. Uses the existing harness at `test/rust-multicrate` and its baseline `output-before.json`.

- [ ] **Step 1: Re-run the resolver on the test workspace**

Run:
```bash
mamba run -n ua-node node understand-anything-plugin/skills/understand/extract-import-map.mjs \
  /home/vunet/workspace/projects/repos/test/rust-multicrate/.ua-test/input.json \
  /home/vunet/workspace/projects/repos/test/rust-multicrate/.ua-test/output-after.json
```
Expected: exit 0, summary line `filesWithImports=6 totalEdges=9`, and **no** "no crate root" warning.

- [ ] **Step 2: Diff after vs. before and assert the 5 recovered edges**

Run:
```bash
mamba run -n ua-node node -e "
const dir='/home/vunet/workspace/projects/repos/test/rust-multicrate/.ua-test';
const b=require(dir+'/output-before.json').importMap;
const a=require(dir+'/output-after.json').importMap;
const flat=m=>Object.entries(m).flatMap(([k,v])=>v.map(t=>k+' -> '+t)).sort();
const B=flat(b), A=flat(a);
console.log('before edges:', B.length, ' after edges:', A.length);
console.log('NEW edges:'); for(const e of A) if(!B.includes(e)) console.log('  + '+e);
"
```
Expected: `before edges: 4  after edges: 9`, and the 5 new edges:
```
  + crates/app/src/main.rs -> crates/core-utils/src/math.rs
  + crates/app/src/main.rs -> crates/engine/src/runner.rs
  + crates/core-utils/src/text.rs -> crates/core-utils/src/math.rs
  + crates/engine/src/mod.rs -> crates/core-utils/src/math.rs
  + crates/engine/src/runner.rs -> crates/core-utils/src/text.rs
```

- [ ] **Step 3: Run the full core + skill test suites for regressions**

Run: `mamba run -n ua-node pnpm --filter @understand-anything/core test && mamba run -n ua-node pnpm test`
Expected: all green.

- [ ] **Step 4: Run lint**

Run: `mamba run -n ua-node pnpm lint`
Expected: no new errors in the touched files.

- [ ] **Step 5: Commit the verification artifact (optional)**

The `test/rust-multicrate` repo is outside this git repo, so nothing to commit here. Confirm the working tree is clean:

```bash
git status -s
```
Expected: clean (all source changes already committed in Tasks 1-5).

---

## Self-Review notes (author)

- **Spec coverage:** cross-crate (Task 5 §2), `[lib].path` (Task 5 §1), bare-module (Task 5 §2 bare-module block), `smol-toml` declared (Task 1 §3), `parseCargoManifest` in core (Task 1), crate map mirroring Go (Task 4), error handling for malformed Cargo.toml + duplicate idents (Task 4 §2), tests (Tasks 1, 3, 6). All spec sections map to a task.
- **Out of scope (unchanged):** dependency renames, `pub use` re-export chains — not implemented, as specified.
- **Type/name consistency:** `parseCargoManifest` / `CargoManifestInfo`, `ctx.rustCrates` (Map ident→srcDir), `ctx.rustCrateSrcDirs` (Set), `loadCargoCrates` returning `{ crates, srcDirs, warnings }`, `findRustCrateSrc(importerDir, ctx)`, `resolveRustImport(rawImport, file, ctx, specifiers)` — names match across Tasks 4 and 5.
