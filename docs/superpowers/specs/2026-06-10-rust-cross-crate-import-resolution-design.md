# Rust cross-crate, `[lib].path`, and bare-module import resolution

**Date:** 2026-06-10
**Branch:** `fix/rust-cross-crate-import-resolution`
**Related:** GitHub issue [#413](https://github.com/Egonex-AI/Understand-Anything/issues/413) (comment about empty `batchImportData` on a Rust workspace)

## Problem

`extract-import-map.mjs`'s Rust resolver under-populates the dependency graph on
multi-crate Cargo workspaces. Three gaps, all confirmed empirically against a
miniature test workspace and a real 50-crate one (Apache DataFusion):

1. **Cross-crate imports dropped.** `use other_crate::module::Item;` is treated as
   an external crate and discarded, because the resolver only handles paths rooted
   at `crate` / `super` / `self`. In DataFusion this drops **6,625** internal
   inter-crate edges (the majority of the internal dependency graph).
2. **`[lib] path` crate-root override unhandled.** `findRustCrateSrc` only probes
   `src/lib.rs` / `src/main.rs`, so a crate whose root is declared as
   `[lib] path = "src/mod.rs"` fails even its own intra-crate `crate::` imports.
3. **Bare-module imports dropped.** `use crate::config;` (importing a *module*, not
   a symbol within it) yields a tree-sitter `source` of just `crate`, with the
   module name landing in `specifiers` — which the resolver never consults.

### Baseline (before fix), `test/rust-multicrate` (3 crates, 11 files)

Resolver captured 4 edges, dropped 5 that should exist:

| File | Missing edge | Gap |
|---|---|---|
| `core-utils/src/text.rs` | → `core-utils/src/math.rs` | bare-module `use crate::math;` |
| `engine/src/mod.rs` | → `core-utils/src/math.rs` | cross-crate |
| `engine/src/runner.rs` | → `core-utils/src/text.rs` | cross-crate |
| `app/src/main.rs` | → `engine/src/runner.rs` | cross-crate |
| `app/src/main.rs` | → `core-utils/src/math.rs` | cross-crate |

`engine/src/mod.rs`'s `use crate::runner::Runner;` was also unresolved (warning
emitted) — the `[lib] path` trap; the edge survived only via the separate
`mod runner;`.

**Target:** 4 → 9 resolved edges.

## Approach

Mirror the existing manifest-resolution pattern used for Go (`go.mod`) and PHP
(`composer.json`): scan `files[]` for the language manifest, build a map once in
`buildResolutionContext`, consume it in the per-import resolver.

Parse `Cargo.toml` with a real TOML parser (`smol-toml`) rather than a hand-rolled
regex, because we need key-values under specific tables (`[package].name`,
`[lib].name`, `[lib].path`) and must NOT confuse them with `name` keys in
`[[bin]]` / `[[test]]` / `[dependencies]`. `smol-toml` is pure-ESM, zero-dependency,
~103 KB, already present transitively, and consistent with core already shipping
the `yaml` parser for the same class of job. The existing `TOMLParser`
(`plugins/parsers/toml-parser.ts`) only extracts `[section]` headers and cannot
read key-values, so it is not reusable here.

## Components

### 1. Core: Cargo manifest parsing
- `packages/core/package.json` — add `smol-toml` to `dependencies` (declare the
  currently-transitive dep).
- `packages/core/src/manifests/cargo.ts` (new) — exports
  `parseCargoManifest(content: string): { packageName: string | null; libName:
  string | null; libPath: string | null } | null`. Uses `smol-toml`'s `parse`;
  returns `null` for virtual manifests (no `[package]` and no `[lib]`). Returns raw
  names (hyphen→underscore normalization happens at map-build time).
- `packages/core/src/index.ts` — re-export `parseCargoManifest` from the Node main
  entry (NOT the browser subpaths — keeps Node-only code out of the dashboard
  bundle).

### 2. Script: crate map (`extract-import-map.mjs`)
- In `buildResolutionContext`: scan `files[]` for basename `Cargo.toml`, read in
  parallel (reuse `readFilesParallel`), `parseCargoManifest` each.
- Build `ctx.rustCrates: Map<crateIdent, srcDir>`:
  - `crateIdent = libName ?? packageName.replaceAll('-', '_')` (skip if both null)
  - `srcDir = posixJoin(dirOf(cargoTomlPath), dirname(libPath ?? 'src/lib.rs'))`
    — the module-path anchor (`src/` even when the root file is `mod.rs`).

### 3. Script: resolver changes
- `findRustCrateSrc(importerDir, ctx)`: if `ctx.rustCrates` is populated, return the
  crate `srcDir` that is the deepest ancestor of (or equal to) `importerDir`
  (manifest-driven — fixes the `[lib].path` trap). Fall back to the existing
  `src/lib.rs` / `src/main.rs` probe when no manifests exist.
- `resolveRustImport(source, file, ctx, specifiers = [])`:
  - `crate` / `super` / `self` → existing logic (`crate` now manifest-aware).
  - else if `ctx.rustCrates.has(head)` → cross-crate: `baseDir =
    rustCrates.get(head)`, resolve the rest via the existing longest→shortest
    prefix probe.
  - else → external, `[]`.
  - Bare-module: when the path after the head is empty, probe each plain
    `specifier` (skip `*` and `self`) as a module under `baseDir`.
- Dispatcher (`resolveImport`): for `rust`, pass `imp.specifiers` as the 4th arg.
  The supplemental `mod x;` pass continues to synthesize `self::x` (non-empty rest)
  and is unaffected. The optional 4th parameter keeps the exported signature
  backward-compatible.

## Data flow

`files[]` → scan `Cargo.toml` → `ctx.rustCrates` (built once in
`buildResolutionContext`) → `resolveRustImport` per import → `importMap`.
Identical in shape to Go's `ctx.goModules`.

## Error handling

- Malformed `Cargo.toml` → `smol-toml` throws → caught per-file in
  `buildResolutionContext`; emit `Warning: extract-import-map: Cargo.toml at <path>
  failed to parse — cross-crate imports for this crate unresolved`; skip that
  manifest. Resolution degrades, never crashes (matches Go/composer behavior).
- Duplicate crate identifiers across manifests → keep first, emit a `Warning:`.
- `[[bin]]` / `[[test]]` `name` keys → ignored for free (real TOML parse, not regex).
- Bins-only crate (no `[lib]`) → `crateIdent` from package name, `srcDir` defaults to
  `src/`. Harmless: cross-crate imports target lib crates.

## Out of scope

- Dependency **renames** (`foo = { package = "real-name" }` in a consumer's
  `[dependencies]`, so `use foo::…` maps to `real-name`'s crate). Rare; documented
  as possible future work.
- Re-export chains (`pub use`) that move a symbol across files — the resolver
  already accepts the existing limitation of landing on the declaring module file.

## Testing

- **Core unit tests** (`packages/core/src/__tests__/`): `parseCargoManifest` —
  `[package].name`, hyphen→underscore (at the call site), `[lib].name` override,
  `[lib].path`, and that a `[[bin]].name` is NOT mistaken for the crate name.
- **Resolver tests** (`tests/skill/understand/test_extract_import_map.test.mjs`,
  existing Rust `describe` block): add cross-crate resolution, `[lib] path =
  "src/mod.rs"` intra-crate resolution, and bare-module (`use crate::mod;`).
- **Integration**: re-run the `test/rust-multicrate` before/after harness with the
  same `input.json`; assert the importMap grows from 4 → 9 edges, diffed against the
  saved baseline.

## Files touched

- `understand-anything-plugin/packages/core/package.json`
- `understand-anything-plugin/packages/core/src/manifests/cargo.ts` (new)
- `understand-anything-plugin/packages/core/src/index.ts`
- `understand-anything-plugin/skills/understand/extract-import-map.mjs`
- `understand-anything-plugin/packages/core/src/__tests__/cargo-manifest.test.ts` (new)
- `tests/skill/understand/test_extract_import_map.test.mjs`
