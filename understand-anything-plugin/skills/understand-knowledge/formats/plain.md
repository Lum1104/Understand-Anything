# Plain Markdown Format Guide

## Detection

Plain Markdown is the **fallback format** when no specific knowledge management tool is detected. Use this guide when the directory does not match any other format's detection criteria.

**Positive signals (generic Markdown collection):**
- `.md` files present without any tool-specific configuration directories
- No `.obsidian/`, `logseq/`, `dendron.yml`, `.vscode/foam.*`, or `wiki/index.md`
- Standard folder hierarchy used for organization
- Standard Markdown links (not wikilinks)

**This format covers:**
- Personal notes directories
- Documentation folders
- GitHub wikis (without specific tool configuration)
- Any unstructured collection of Markdown files

## Link Syntax

Plain Markdown uses **standard Markdown links** only. No wikilink syntax.

### Inline Links
```
[Display Text](other-file.md)
[Display Text](subfolder/other-file.md)
[Display Text](../parent-folder/file.md)
```

### Links with Anchors
```
[Section Name](file.md#heading-slug)
```
Heading slugs are lowercase, spaces replaced with hyphens, special characters removed:
- `# My Heading Title` -> `#my-heading-title`
- `# API v2.0 (Beta)` -> `#api-v20-beta`

### Reference-Style Links
```
Read the [introduction][intro] first.

[intro]: introduction.md "Introduction to the Project"
```

### Image Links
```
![Alt text](images/diagram.png)
![Alt text](images/diagram.png "Title")
```

### Autolinks
```
<https://example.com>
```

### Relative Path Resolution
Links are relative to the current file's location:
- `[link](sibling.md)` — same directory
- `[link](sub/child.md)` — subdirectory
- `[link](../other.md)` — parent directory

## Metadata

### YAML Frontmatter (Optional)
Some plain Markdown files include frontmatter, but it is not required or standardized:

```yaml
---
title: My Document
author: Jane Doe
date: 2026-04-10
tags:
  - tutorial
  - getting-started
---
```

Without frontmatter, the document title is inferred from:
1. The first `# Heading` in the file
2. The filename (without extension)

### No Inline Metadata Convention
Plain Markdown has no `key:: value` or property syntax. Any metadata must be in frontmatter or inferred from content.

## Folder Structure

In plain Markdown collections, **folder hierarchy serves as the primary organizational structure**. Directories represent categories or topics.

```
notes/
  README.md                  # Root overview
  getting-started/
    installation.md
    configuration.md
  concepts/
    architecture.md
    data-model.md
  guides/
    deployment.md
    troubleshooting.md
  reference/
    api.md
    cli.md
```

**Interpretation rules:**
- Each directory represents a category or topic area
- `README.md` or `index.md` in a directory is that category's overview
- Directory depth indicates topic specificity
- Sibling files within a directory are related by topic

## Tags

Plain Markdown has **no native tag syntax**. Tags may appear in:

### Frontmatter Tags
```yaml
---
tags:
  - tutorial
  - advanced
---
```

### Informal Inline Tags
Some authors use hashtag conventions even without tool support:
```
Topics: #architecture #microservices
```
These have no standard behavior and should be treated as hints rather than reliable metadata.

### LLM-Inferred Tags
When no explicit tags exist, the LLM should infer topic tags from:
- The folder path (e.g., `guides/deployment.md` suggests tags: "guide", "deployment")
- The document title and headings
- Key terms in the content

## Special Files

| Path | Purpose | Action |
|------|---------|--------|
| `README.md` | Directory overview / project root | **Parse** — often the entry point |
| `index.md` | Directory index | **Parse** — alternative to README |
| `CHANGELOG.md` | Version history | **Deprioritize** — not knowledge content |
| `LICENSE.md` | License text | **Skip** — not knowledge content |
| `CONTRIBUTING.md` | Contribution guidelines | **Deprioritize** — process, not knowledge |
| `_drafts/` | Draft documents | Include but flag as draft |
| `.github/` | GitHub configuration | **Skip** |
| `node_modules/`, `vendor/` | Dependencies | **Skip entirely** |
| `*.min.md` | Minified/generated | **Skip** |

## Parsing Instructions for LLM

1. **Confirm fallback**: Verify that no other format's detection criteria match. If unsure, default to this guide.

2. **Enumerate files**: Recursively find all `.md` files. Exclude common non-content directories: `.git/`, `node_modules/`, `vendor/`, `.github/`, `_site/`, `build/`, `dist/`.

3. **Infer structure from folders**: The directory tree is the primary organizational signal:
   - Map each directory to a category/topic node
   - Files within a directory are grouped under that category
   - `README.md` / `index.md` files represent the category itself

4. **Parse frontmatter**: If YAML frontmatter exists (between `---` delimiters), extract all fields. Common: `title`, `date`, `tags`, `author`, `description`.

5. **Extract title**: In order of priority:
   - `title` from frontmatter
   - First `# Heading` in the file
   - Filename without extension (convert hyphens/underscores to spaces, title-case)

6. **Extract Markdown links**: Find all `[text](target)` patterns. Resolve relative paths against the file's directory to determine the target:
   - Internal links: target is another `.md` file in the collection
   - External links: target starts with `http://` or `https://`
   - Anchor links: target starts with `#` (same-file heading)
   - Image links: prefixed with `!` — `![alt](path)`

7. **Extract reference-style links**: Find link definitions at the bottom of files:
   ```
   [label]: url "title"
   ```
   Match these to `[text][label]` references in the body.

8. **Extract headings**: Parse the heading structure (`#`, `##`, `###`, etc.) to understand the document's internal organization. Use headings to generate summaries and identify subtopics.

9. **Infer relationships**: Without explicit linking conventions, relationships must be inferred:
   - **Explicit links**: Markdown links between files
   - **Folder co-location**: Files in the same directory are related
   - **Heading similarity**: Notes with similar headings may cover related topics
   - **Content overlap**: The LLM should identify topical connections even without links

10. **Build the graph**:
    - **File nodes**: Each `.md` file is a node
    - **Category nodes**: Each directory is a grouping node
    - **Link edges**: Standard Markdown links between files
    - **Hierarchy edges**: File -> parent directory category
    - **Inferred edges**: LLM-identified topical relationships (labeled as inferred)
