# Logseq Format Guide

## Detection

Identify a Logseq graph by the presence of a `logseq/` directory containing `config.edn` at the graph root. Logseq graphs also have characteristic `journals/` and `pages/` directories.

**Directory signatures:**
- `logseq/config.edn` — primary configuration file (EDN format)
- `logseq/custom.css` — custom styling
- `logseq/custom.js` — custom scripts (desktop only)
- `journals/` — daily journal entries
- `pages/` — named pages
- `assets/` — attached files
- `draws/` — Excalidraw drawings

## Link Syntax

Logseq is a **block-based outliner** — every line (bullet) is a block with a unique UUID.

### Page References
```
[[Page Name]]
```
Creates a link to a page. If the page does not exist, it will be created on click.

### Page Reference with Alias
```
[Display Text]([[Page Name]])
```

### Block References
```
((block-uuid))
```
References a specific block by its UUID. The referenced block's content is displayed inline. UUIDs look like: `64a5f9b2-3c1e-4d8f-a9b7-1234abcd5678`.

### Block Reference with Alias
```
[Display Text](((block-uuid)))
```

### Block Embeds
```
{{embed ((block-uuid))}}
{{embed [[Page Name]]}}
```
Embeds the full content of a block or page inline.

### Hashtag References
```
#tag
#[[Multi Word Tag]]
```
Tags are equivalent to page references in Logseq — `#tag` and `[[tag]]` both link to the same page.

## Metadata

### Page Properties
Properties on the **first block** of a page are page-level properties:
```markdown
type:: article
author:: John Doe
date:: 2026-04-10
tags:: #research, #ai
```

### Block Properties
Properties on any non-first block are block-level properties:
```markdown
- This is a task block
  priority:: high
  deadline:: 2026-04-15
```

### Property Syntax Rules
- Use `property-name:: value` (double colon, space)
- Property names are case-insensitive
- Values can be: text, numbers, page references `[[...]]`, tags `#...`
- Multiple values separated by commas
- Built-in properties: `type`, `tags`, `alias`, `title`, `icon`, `template`, `template-including-parent`

## Folder Structure

Logseq enforces a specific directory layout:

```
graph-root/
  logseq/
    config.edn
    custom.css
    pages-metadata.edn
  journals/
    2026_04_10.md       # Daily journal (YYYY_MM_DD format)
    2026_04_09.md
  pages/
    My Page.md          # Named pages
    Project Alpha.md
  assets/
    image.png           # Attachments
  draws/
    drawing.excalidraw  # Excalidraw files
```

**Journal naming**: Files in `journals/` follow the pattern `YYYY_MM_DD.md` by default (configurable in `config.edn` via `:journal/file-name-format`).

**Page naming**: Files in `pages/` use the page title as filename. Namespaces use `/` in the page name which maps to `%2F` or nested directories depending on configuration.

## Tags

Tags in Logseq are **page references** — there is no separate tag system.

```
#tag
#[[Multi Word Tag]]
```

- `#machine-learning` creates/links to a page called "machine-learning"
- `#[[Machine Learning]]` creates/links to a page called "Machine Learning"
- Tags can appear inline in any block or as property values
- All tags are queryable as page references

## Special Files

| Path | Purpose | Action |
|------|---------|--------|
| `logseq/config.edn` | Graph configuration | **Parse** — contains format settings, journal config |
| `logseq/custom.css` | Custom CSS | Ignore |
| `logseq/custom.js` | Custom scripts | Ignore |
| `logseq/pages-metadata.edn` | Page metadata cache | Can parse for supplemental metadata |
| `logseq/bak/` | Backup files | **Skip entirely** |
| `.recycle/` | Deleted pages | **Skip entirely** |
| `draws/` | Excalidraw drawings | Ignore or parse separately |

## Parsing Instructions for LLM

1. **Detect the graph**: Look for `logseq/config.edn`. If found, confirm Logseq format.

2. **Read config**: Parse `logseq/config.edn` to determine:
   - `:editor/preferred-format` — `"markdown"` or `"org"` (default markdown)
   - `:journal/file-name-format` — journal filename pattern
   - `:pages-directory` and `:journals-directory` — custom directory names if overridden

3. **Enumerate notes**: Collect all `.md` (or `.org`) files from `journals/` and `pages/`. Skip `logseq/`, `.recycle/`, `draws/`.

4. **Parse block structure**: Logseq files are outlines. Each line starting with `- ` is a block. Indentation (two spaces per level) denotes nesting:
   ```
   - Parent block
     - Child block
       - Grandchild block
   ```
   Every block implicitly has a UUID (stored in Logseq's internal database, not always visible in the file).

5. **Extract page properties**: The first block's properties (lines matching `key:: value` before any sub-blocks) are page-level metadata. Parse these as key-value pairs.

6. **Extract page references**: Find all `[[Page Name]]` patterns in block content. These are directed edges to other pages.

7. **Extract block references**: Find all `((uuid))` patterns. These reference specific blocks by UUID. Note: resolving block UUIDs to their source page requires scanning all files for matching block IDs (look for `id:: uuid` properties on blocks).

8. **Extract tags**: Find `#tag` and `#[[Multi Word Tag]]` patterns. Map each tag to a page reference (tags are pages).

9. **Identify journals**: Files in `journals/` represent daily entries. Parse the date from the filename (`YYYY_MM_DD`). Journal pages often serve as entry points linking to topic pages.

10. **Build the graph**: Create page nodes for every file and every referenced-but-nonexistent page (these are effectively stubs). Create edges for page references, block references, and tag references. Label journal nodes distinctly.
