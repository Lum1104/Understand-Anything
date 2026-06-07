---
name: understand-book
description: Convert an EPUB book into a chapter-aware wiki scaffold, then reuse /understand-knowledge and /understand-dashboard to generate an interactive book knowledge graph.
argument-hint: [book.epub] [--language <lang>] [--output <dir>]
---

# /understand-book

Analyze an EPUB book by first converting it into a deterministic Karpathy-style wiki scaffold.

## Instructions

### Phase 1: Resolve arguments

1. Parse `$ARGUMENTS`:
   - First non-flag token: EPUB input path.
   - `--language <lang>`: optional output language, defaults to EPUB metadata or `unknown`.
   - `--output <dir>`: optional output directory, defaults to `.understand-book`.
2. If no EPUB path is provided, ask the user for one.
3. Resolve relative paths against the current working directory.
4. Verify the input exists and ends with `.epub`.

### Phase 2: Convert EPUB to wiki scaffold

Run the bundled deterministic converter:

```bash
python3 <SKILL_DIR>/epub-to-wiki.py <EPUB_PATH> --output <OUTPUT_DIR> --language <LANGUAGE>
```

This writes:

```text
<OUTPUT_DIR>/
  raw/<book.epub>
  wiki/index.md
  wiki/chapters/ch01.md
  wiki/chapters/ch02.md
  .understand-anything/intermediate/book-manifest.json
```

Report:

```text
[understand-book] Manifest ready: N chapters, M assets
```

### Phase 3: Generate the knowledge graph

Run `/understand-knowledge <OUTPUT_DIR>/wiki`.

That command produces:

```text
<OUTPUT_DIR>/wiki/.understand-anything/knowledge-graph.json
```

### Phase 4: Save book-level outputs

Copy the knowledge graph to the book output root for dashboard convenience:

```bash
mkdir -p <OUTPUT_DIR>/.understand-anything
cp <OUTPUT_DIR>/wiki/.understand-anything/knowledge-graph.json <OUTPUT_DIR>/.understand-anything/knowledge-graph.json
```

Then run:

```text
/understand-dashboard <OUTPUT_DIR>
```

## Notes

- This first version is EPUB-only. Do not accept PDF/DOCX/OCR yet.
- The converter is deterministic and uses Python stdlib only: zip, XML, and HTML parsing.
- LLM analysis happens after conversion, through the existing `/understand-knowledge` path.
- Evidence comes from chapter markdown pages generated from EPUB spine order.
