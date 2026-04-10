# Obsidian Format Guide

## Detection

Identify an Obsidian vault by the presence of a `.obsidian/` directory at the vault root. This directory contains configuration files such as `app.json`, `appearance.json`, `core-plugins.json`, `community-plugins.json`, and `workspace.json`. All notes are stored as `.md` files. Canvas files (`.canvas`) may also be present.

**Directory signatures:**
- `.obsidian/` directory exists
- `.obsidian/app.json` — core app settings
- `.obsidian/plugins/` — installed community plugins
- `.obsidian/themes/` — installed themes

## Link Syntax

Obsidian uses **wikilink** syntax by default (can be configured to use standard Markdown links).

### Basic Wikilinks
```
[[Note Name]]
```

### Wikilink with Alias (Custom Display Text)
```
[[Note Name|Display Text]]
```
Renders as "Display Text" but links to "Note Name".

### Link to Heading
```
[[Note Name#Heading]]
[[Note Name#Heading|Display Text]]
```
Multiple heading levels use multiple `#`:
```
[[Note Name#Heading#Subheading]]
```

### Link to Block
```
[[Note Name#^block-id]]
```
The target block must have a `^block-id` anchor appended at the end of the line.

### Embeds (Transclusion)
Prefix any link with `!` to embed the content inline:
```
![[Note Name]]
![[Note Name#Heading]]
![[Note Name#^block-id]]
![[image.png]]
![[document.pdf]]
```

### Standard Markdown Links
Also supported (and used when wikilinks are disabled in settings):
```
[Display Text](Note%20Name.md)
[Display Text](Note%20Name.md#heading)
```

## Metadata

### YAML Frontmatter (Properties)
Metadata is stored in YAML frontmatter at the top of each note:
```yaml
---
title: My Note
date: 2026-04-10
tags:
  - project
  - research
aliases:
  - alternative name
  - another alias
cssclasses:
  - wide-page
publish: true
---
```

**Property types supported:** Text, List, Number, Checkbox, Date, Date & time.

**Default properties with special meaning:**
- `tags` — note tags (array)
- `aliases` — alternative names for the note (used in link autocomplete)
- `cssclasses` — CSS classes applied to the note in reading mode
- `publish` — whether the note is published via Obsidian Publish

### Dataview Inline Fields
The popular Dataview plugin introduces inline metadata with `key:: value` syntax:

**Line-based (own line):**
```
Rating:: 9
Status:: In Progress
Author:: Jane Doe
```

**Bracketed (inline within text):**
```
I would rate this a [rating:: 9] out of 10.
```

**Parenthesis (hidden key in reading mode):**
```
This was published (year:: 2024) recently.
```

Note: Inline fields use `::` (double colon), while YAML frontmatter uses `:` (single colon).

## Folder Structure

Obsidian imposes no required folder structure. Users organize freely with directories and subdirectories. Folder hierarchy is purely organizational and user-defined. Some common conventions:
- `Templates/` — note templates
- `Attachments/` or `Assets/` — images and files
- `Daily Notes/` or `Journal/` — daily notes

## Tags

### Inline Tags
Prefixed with `#` in the note body:
```
This is about #machine-learning and #python.
```

**Tag syntax rules:**
- Must contain at least one non-numeric character
- Can contain: letters, numbers, underscores `_`, hyphens `-`, forward slashes `/`
- Cannot contain spaces
- Case-insensitive for matching

### Nested Tags
Use `/` to create tag hierarchies:
```
#project/active
#project/archived
#reading/books/fiction
```
Searching for `#project` also finds `#project/active` and `#project/archived`.

### Frontmatter Tags
```yaml
---
tags:
  - machine-learning
  - python
---
```
Frontmatter tags do NOT include the `#` prefix.

## Special Files

| Path | Purpose | Action |
|------|---------|--------|
| `.obsidian/` | Configuration directory | **Skip entirely** — not user content |
| `.obsidian/app.json` | App settings | Ignore |
| `.obsidian/workspace.json` | UI layout state | Ignore |
| `.obsidian/plugins/` | Community plugin configs | Ignore |
| `.trash/` | Obsidian's trash | **Skip entirely** |
| `*.canvas` | Canvas files (JSON) | Parse separately — contains nodes and edges for visual boards |
| Templates directory | Template files | **Identify but deprioritize** — they are scaffolding, not knowledge |

## Parsing Instructions for LLM

1. **Detect the vault**: Look for `.obsidian/` at the root. If found, confirm Obsidian format.

2. **Enumerate notes**: Recursively find all `.md` files. Exclude `.obsidian/`, `.trash/`, and any configured attachment directories.

3. **Parse frontmatter**: For each note, extract YAML between `---` delimiters at the file start. Capture `tags`, `aliases`, and all custom properties.

4. **Extract wikilinks**: Scan note body for `[[...]]` patterns. Parse into components:
   - `[[Target]]` — link to note
   - `[[Target|Alias]]` — link with display text
   - `[[Target#Heading]]` — link to heading
   - `[[Target#^block-id]]` — link to block
   - `![[Target]]` — embed (note the `!` prefix)

5. **Extract inline tags**: Find all `#tag` patterns in the body (not inside code blocks). Include nested tags with `/` separators.

6. **Extract Dataview fields**: If Dataview is likely in use (check `.obsidian/plugins/dataview/`), scan for `key:: value` patterns on their own lines and `[key:: value]` or `(key:: value)` inline.

7. **Resolve links**: Note names in wikilinks match filenames without the `.md` extension. If multiple notes share the same name in different folders, Obsidian uses the shortest path. Aliases from frontmatter can also be link targets.

8. **Build edges**: Each wikilink creates a directed edge from the source note to the target note. Embeds (`![[...]]`) should be typed as "embeds" rather than plain links.

9. **Handle canvas files**: `.canvas` files are JSON with `nodes` (cards, notes, links, groups) and `edges` (connections). Parse these as separate visual graph structures.
