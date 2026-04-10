# Foam Format Guide

## Detection

Identify a Foam workspace by the presence of Foam-specific VS Code configuration. Foam is a VS Code extension that works on top of standard Markdown files, so detection relies on configuration files rather than note format.

**Directory signatures:**
- `.vscode/extensions.json` containing `"foam.foam-vscode"` in recommendations
- `.vscode/settings.json` containing `foam.*` settings
- `.foam/` directory (older versions)
- Link reference definitions at the bottom of `.md` files (distinctive Foam feature)

**Secondary indicators:**
- A `.vscode/` directory with Foam-related settings
- Markdown files with auto-generated reference definition blocks at the bottom

## Link Syntax

### Wikilinks
```
[[note-name]]
```
Links to `note-name.md` in the workspace. Foam uses filenames (without extension) as identifiers.

### Section Links
```
[[note-name#Section Title]]
```
Links to a specific heading within a note. Autocomplete is available for section titles.

### Block Links
```
[[note-name#^block-id]]
```
Links to a specific block. The target block must have a `^block-id` anchor at its end.

### Embeds
```
![[note-name]]
![[note-name#Section Title]]
```
Embeds the content of another note or section inline.

### Directory Links
```
[[projects]]
```
Linking to a folder name opens the folder's index file (`projects/index.md` or `projects/README.md`).

### Standard Markdown Links
Also fully supported:
```
[Display Text](other-file.md)
[Display Text](other-file.md#section-name)
```

### Placeholder Links
Wikilinks to non-existent notes are displayed as **placeholders** (visually distinct in VS Code). Clicking a placeholder creates the note. These indicate intended-but-not-yet-written content.

## Metadata

### YAML Frontmatter
Foam supports standard YAML frontmatter:
```yaml
---
title: My Note
type: concept
tags:
  - research
  - machine-learning
---
```

There are no Foam-specific required fields. The frontmatter is freeform and follows standard YAML conventions.

### Link Reference Definitions
Foam's most distinctive feature. The extension auto-generates standard Markdown link reference definitions at the bottom of each file:

```markdown
# My Note

This relates to [[Data Science]] and [[Statistics]].

<!-- More content... -->

[Data Science]: data-science.md "Data Science"
[Statistics]: statistics.md "Statistics"
```

**Key characteristics:**
- Generated automatically on file save
- Placed at the end of the file, separated by a blank line
- Make wikilinks compatible with standard Markdown processors
- Format: `[Note Name]: relative-path.md "Note Title"`

**Configuration options** (in `.vscode/settings.json`):
- `"foam.edit.linkReferenceDefinitions": "off"` — disabled
- `"foam.edit.linkReferenceDefinitions": "withoutExtensions"` — paths without `.md`
- `"foam.edit.linkReferenceDefinitions": "withExtensions"` — paths with `.md`

## Folder Structure

Foam imposes no required folder structure. Users organize notes freely. Common patterns:

```
workspace-root/
  .vscode/
    extensions.json     # Recommends foam.foam-vscode
    settings.json       # Foam configuration
  docs/
    topic-a.md
    topic-b.md
  journal/
    2026-04-10.md       # Daily notes (if configured)
  attachments/
    image.png
  readme.md
```

Foam supports templates for note creation, typically stored in a `.foam/templates/` directory:
```
.foam/
  templates/
    new-note.md
    daily-note.md
```

## Tags

Foam supports tags in two ways:

### Frontmatter Tags
```yaml
---
tags:
  - research
  - ai
---
```

### Inline Tags
```
This is about #machine-learning and #research.
```

Tags are searchable through VS Code's tag explorer panel. There is no special hierarchy or nesting convention for tags in Foam.

## Special Files

| Path | Purpose | Action |
|------|---------|--------|
| `.vscode/settings.json` | Foam configuration | **Parse** — contains Foam settings |
| `.vscode/extensions.json` | Extension recommendations | **Check** — confirms Foam format |
| `.foam/` | Foam workspace data | Ignore |
| `.foam/templates/` | Note templates | **Identify but skip** — scaffolding, not knowledge |
| `_layouts/`, `_site/` | Static site generator output | **Skip entirely** |
| `readme.md` / `index.md` | Workspace root document | Parse as a content node |

## Parsing Instructions for LLM

1. **Detect the workspace**: Look for `.vscode/extensions.json` containing `foam.foam-vscode`, or `.vscode/settings.json` with `foam.*` keys. If found, confirm Foam format.

2. **Read configuration**: Parse `.vscode/settings.json` for Foam-specific settings:
   - `foam.edit.linkReferenceDefinitions` — whether reference definitions are generated
   - `foam.files.ignore` — patterns for files to skip
   - `foam.graph.style` — graph display settings

3. **Enumerate notes**: Find all `.md` files. Exclude `.vscode/`, `.foam/templates/`, `node_modules/`, `_site/`, and any paths in `foam.files.ignore`.

4. **Parse frontmatter**: Extract YAML frontmatter if present. Foam does not require frontmatter, so many notes may lack it.

5. **Extract wikilinks**: Scan note body for `[[...]]` patterns:
   - `[[target]]` — link to note
   - `[[target#heading]]` — link to heading
   - `[[target#^block-id]]` — link to block
   - `![[target]]` — embed

6. **Handle link reference definitions**: At the bottom of files, look for lines matching:
   ```
   [Note Name]: relative-path.md "Title"
   ```
   These are auto-generated by Foam. They provide a mapping from wikilink display names to file paths. Use these to resolve wikilink targets when present, but note they may be stale if the user disabled auto-update.

7. **Identify placeholders**: Wikilinks that do not resolve to any existing file are placeholders — notes the author intends to write. Include these as stub nodes in the graph to show intended structure.

8. **Extract standard Markdown links**: Also parse `[text](path.md)` links, as Foam users may mix both syntaxes.

9. **Build the graph**: Create nodes for each note file and each placeholder. Create directed edges for all wikilinks, standard links, and embeds. The link reference definitions can serve as a cross-reference for validating link resolution.

10. **Note on compatibility**: Foam notes are designed to be valid standard Markdown. The link reference definitions ensure that even without Foam, the links resolve correctly in any Markdown renderer. This means the notes are also parseable as plain Markdown if Foam detection fails.
