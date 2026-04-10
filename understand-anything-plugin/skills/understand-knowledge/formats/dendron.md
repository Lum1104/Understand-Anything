# Dendron Format Guide

## Detection

Identify a Dendron workspace by the presence of a `dendron.yml` configuration file at the workspace root. Dendron uses a **dot-delimited hierarchy** for note names, which is its most distinctive feature.

**Directory signatures:**
- `dendron.yml` — workspace configuration (required)
- `dendron.code-workspace` — VS Code workspace file
- `*.schema.yml` — schema definition files
- Notes named with dot-delimited paths: `project.backend.api.md`
- `vault/` or custom vault directories

## Link Syntax

### Wikilinks
```
[[note.name]]
```
The target is the dot-delimited note hierarchy path (filename without `.md`).

### Wikilinks with Alias
```
[[Display Text|note.name]]
```
Note: Dendron places the alias **before** the pipe, opposite to Obsidian.

### Link to Heading
```
[[note.name#heading-text]]
[[Display Text|note.name#heading-text]]
```

### Cross-Vault Links
Used in multi-vault workspaces to link across vaults:
```
[[dendron://vault-name/note.name]]
[[Display Text|dendron://vault-name/note.name]]
[[Display Text|dendron://vault-name/note.name#heading]]
```
The prefix `dendron://$vaultName/` converts any regular link into a cross-vault link.

### Note References (Embeds)
Embed content from another note:
```
![[note.name]]
![[dendron://vault-name/note.name]]
![[note.name#heading]]
```

### Block Anchors
Target specific blocks using `^anchor-id`:
```
![[note.name#^anchor-id]]
```

## Metadata

### YAML Frontmatter
Every Dendron note has mandatory YAML frontmatter with auto-generated fields:

```yaml
---
id: 7f2a3b4c-5d6e-4f8a-9b0c-1d2e3f4a5b6c
title: My Note Title
desc: A brief description of the note
updated: 1636492098692
created: 1636492098692
tags:
  - my.tag.name
---
```

**Required fields:**
- `id` — UUID uniquely identifying the note (stable across renames)
- `title` — display title of the note
- `desc` — description (can be empty string)
- `updated` — Unix timestamp in milliseconds of last update
- `created` — Unix timestamp in milliseconds of creation

**Optional fields:**
- `tags` — array of dot-delimited tag names
- `nav_order` — numeric order for navigation
- `nav_exclude` — exclude from navigation
- `config` — per-note configuration overrides

### Tags as Hierarchy
Tags in Dendron are themselves notes in the hierarchy:
```yaml
tags: my.example
```
This links the note to the page `tags.my.example` in the hierarchy.

## Folder Structure

Dendron's folder structure is driven by its **dot-delimited hierarchy**. All notes live flat in the vault root directory — hierarchy is encoded in the filename, not in subdirectories.

```
workspace-root/
  dendron.yml
  dendron.code-workspace
  vault/
    root.md                    # vault root note
    project.md                 # "project" node
    project.backend.md         # "project > backend" node
    project.backend.api.md     # "project > backend > api" node
    project.frontend.md        # "project > frontend" node
    project.frontend.ui.md     # "project > frontend > ui" node
    root.schema.yml            # root schema
    project.schema.yml         # schema for project hierarchy
```

**Hierarchy rules:**
- `a.b.c.md` is a child of `a.b.md` which is a child of `a.md`
- Each dot represents one level of depth
- Parent notes need not exist — Dendron creates **stubs** (empty placeholder notes) for missing parents
- `root.md` is the root of every vault

### Multi-Vault Workspaces
```
workspace-root/
  dendron.yml              # lists all vaults
  vault-personal/
    daily.2026.04.10.md
  vault-work/
    project.alpha.md
```

## Tags

Tags in Dendron are **notes in the hierarchy** under the `tags.` prefix:

```yaml
---
tags:
  - my-tag
  - project.active
---
```

- The tag `my-tag` corresponds to the note `tags.my-tag.md`
- Tags can be hierarchical: `project.active` maps to `tags.project.active.md`
- Tags are listed in frontmatter, not inline with `#` syntax
- You can also use `#my-tag` inline, which is equivalent to `[[tags.my-tag]]`

## Special Files

| Path | Purpose | Action |
|------|---------|--------|
| `dendron.yml` | Workspace configuration | **Parse** — lists vaults, settings |
| `dendron.code-workspace` | VS Code workspace | Ignore |
| `*.schema.yml` | Schema definitions | **Parse** — defines hierarchy structure and templates |
| `root.md` | Vault root note | Parse as a content node |
| `root.schema.yml` | Root schema | Parse for hierarchy rules |
| `.dendron.cache.json` | Note metadata cache | Can parse for performance |
| `pods/` | Import/export configurations | Ignore |

### Schema Files
Schema files (`*.schema.yml`) define the expected structure of note hierarchies:
```yaml
version: 1
schemas:
  - id: project
    title: Project
    children:
      - id: backend
        title: Backend
      - id: frontend
        title: Frontend
```
Schemas provide autocomplete hints and enforce consistency but do not prevent creating notes outside the schema.

## Parsing Instructions for LLM

1. **Detect the workspace**: Look for `dendron.yml` at the root. If found, confirm Dendron format.

2. **Parse dendron.yml**: Extract vault configurations — names, paths, and settings. Identify all vault directories.

3. **Enumerate notes**: For each vault directory, find all `.md` files. Every `.md` file (except schema files) is a note.

4. **Parse the hierarchy**: For each note filename (without `.md`):
   - Split on `.` to determine hierarchy depth
   - `a.b.c` means: root > a > b > c
   - Create implicit parent nodes for any missing intermediate levels (stubs)
   - The hierarchy itself defines the primary graph structure

5. **Parse frontmatter**: Extract the mandatory `id`, `title`, `desc`, `created`, `updated` fields. The `id` field is the stable identifier — use it for edge targets when possible.

6. **Extract wikilinks**: Scan note body for `[[...]]` patterns. Parse into:
   - `[[target.note]]` — link by hierarchy path
   - `[[Display|target.note]]` — aliased link
   - `[[target.note#heading]]` — heading link
   - `[[dendron://vault/target.note]]` — cross-vault link
   - `![[target.note]]` — embed

7. **Parse schemas**: Read `*.schema.yml` files to understand the intended hierarchy structure. Use this to categorize notes and identify whether a note follows an expected pattern.

8. **Identify stubs**: Notes that exist only as hierarchy placeholders (created by Dendron when a child exists but parent does not) typically have minimal or empty content with auto-generated frontmatter. Flag these in the graph.

9. **Build the graph**: Create two types of edges:
   - **Hierarchy edges**: parent-child relationships from the dot-delimited naming (e.g., `project` -> `project.backend`)
   - **Reference edges**: wikilinks and embeds between notes
   - **Tag edges**: frontmatter tags linking to `tags.*` hierarchy nodes

10. **Handle multi-vault**: If multiple vaults exist, namespace nodes by vault to avoid collisions. Cross-vault links (`dendron://`) explicitly specify the vault.
