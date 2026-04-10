# Karpathy LLM Wiki Format Guide

## Detection

Identify a Karpathy-style LLM wiki by the presence of the characteristic three-layer directory structure with `raw/` and `wiki/` directories, and a schema document (typically `CLAUDE.md` or similar) at the root.

**Directory signatures:**
- `raw/` — immutable source documents
- `wiki/` — LLM-generated and maintained markdown pages
- `wiki/index.md` — master catalog of all wiki pages
- `wiki/log.md` — append-only operational history
- `_meta/` — optional state and metadata directory
- `CLAUDE.md` or similar schema file at root — defines wiki conventions

**Secondary indicators:**
- Markdown files with consistent cross-reference patterns maintained by an LLM
- `index.md` containing a structured catalog with one-line summaries
- `log.md` with timestamped operation entries

## Link Syntax

The Karpathy wiki uses **standard Markdown links** (not wikilinks), as the wiki is designed to be readable in any Markdown renderer including Obsidian.

### Standard Markdown Links
```
[Page Title](page-name.md)
[Page Title](subfolder/page-name.md)
```

### Links with Section Anchors
```
[Section Name](page-name.md#section-heading)
```

### Cross-References
LLM-maintained cross-references between related pages:
```
## See Also
- [Related Concept A](concept-a.md)
- [Related Concept B](concept-b.md)
- [Source Summary](summaries/source-title.md)
```

### Source Citations
Links back to raw source documents:
```
[Source: Original Article](../raw/article-title.md)
```

**Note:** Since an LLM maintains all links, the linking style may vary based on the schema document's conventions. The LLM ensures consistency within a given wiki instance.

## Metadata

### YAML Frontmatter
Wiki pages typically include frontmatter with metadata about the page's provenance and status:

```yaml
---
title: Concept Name
type: concept | entity | summary | synthesis | comparison
sources:
  - raw/article-1.md
  - raw/article-2.md
created: 2026-04-10
updated: 2026-04-10
tags:
  - machine-learning
  - transformers
---
```

**Common fields:**
- `title` — page display title
- `type` — page category (entity, concept, summary, synthesis, comparison)
- `sources` — list of raw source documents that informed this page
- `created` / `updated` — timestamps
- `tags` — topic tags

### Dataview Compatibility
If Obsidian is the reading interface, pages may include Dataview-compatible frontmatter for dynamic queries.

## Folder Structure

The three-layer architecture:

```
wiki-root/
  CLAUDE.md               # Schema: conventions, workflows, page types
  raw/                     # Layer 1: Immutable source documents
    article-title.md       # Clipped articles, papers, notes
    paper-summary.md
    assets/                # Downloaded images from sources
      figure-1.png
  wiki/                    # Layer 2: LLM-maintained knowledge pages
    index.md               # Master catalog of all pages
    log.md                 # Append-only operation history
    entities/              # Entity pages (people, orgs, tools)
      transformer.md
      attention-mechanism.md
    concepts/              # Concept pages (ideas, theories)
      scaling-laws.md
    summaries/             # Source summaries
      article-title-summary.md
    syntheses/             # Cross-source synthesis
      comparison-x-vs-y.md
  _meta/                   # Optional: state tracking
    ingest-queue.md
    review-status.json
```

**Layer roles:**
- **raw/** — read-only source material. The LLM reads but never modifies these files.
- **wiki/** — the durable artifact. Knowledge compounds here through repeated LLM updates.
- **Schema** (CLAUDE.md) — the configuration layer defining how the LLM should behave.

### index.md Structure
A content-oriented catalog organized by category:
```markdown
# Wiki Index

## Entities
- [Transformer](entities/transformer.md) — Neural network architecture based on self-attention
- [GPT-4](entities/gpt-4.md) — OpenAI's large language model (3 sources)

## Concepts
- [Scaling Laws](concepts/scaling-laws.md) — Empirical relationships between model size and performance

## Summaries
- [Attention Is All You Need](summaries/attention-paper.md) — Original transformer paper summary
```

### log.md Structure
Append-only with consistent prefixes:
```markdown
## [2026-04-10] ingest | Attention Is All You Need
- Wrote summary: wiki/summaries/attention-paper.md
- Created entity: wiki/entities/transformer.md
- Updated 3 existing pages with cross-references

## [2026-04-09] query | How do scaling laws affect training cost?
- Synthesized answer from 4 wiki pages
- Filed new page: wiki/syntheses/scaling-cost-analysis.md
```

## Tags

Tags are stored in YAML frontmatter and maintained by the LLM:
```yaml
tags:
  - machine-learning
  - nlp
  - transformers
```

There is no special tag syntax beyond frontmatter. The LLM ensures consistent tag usage across pages during ingestion and lint passes.

## Special Files

| Path | Purpose | Action |
|------|---------|--------|
| `CLAUDE.md` (or schema file) | Wiki schema and conventions | **Parse first** — defines all conventions for this wiki instance |
| `wiki/index.md` | Master catalog | **Parse** — provides the complete page inventory with summaries |
| `wiki/log.md` | Operation history | **Parse** — shows wiki evolution and recent activity |
| `raw/` | Source documents | **Parse as source nodes** — immutable inputs |
| `raw/assets/` | Source images | Ignore |
| `_meta/` | State tracking | **Parse if present** — may contain queue and status info |

## Parsing Instructions for LLM

1. **Detect the wiki**: Look for `wiki/index.md` and `raw/` directory together. If a schema file (CLAUDE.md, README.md with wiki conventions) exists at root, this confirms the Karpathy pattern.

2. **Parse the schema first**: Read the root schema document (CLAUDE.md or equivalent). This defines the specific conventions for this wiki instance — page types, naming rules, workflow descriptions. The schema overrides any generic assumptions.

3. **Parse index.md**: This is the master catalog. Extract all listed pages with their titles, paths, summaries, and categories. This provides the complete graph node inventory without scanning the filesystem.

4. **Parse log.md**: Extract operation entries to understand wiki history. Each entry follows `## [DATE] operation | Title` format. This reveals temporal relationships and provenance chains.

5. **Enumerate wiki pages**: Scan `wiki/` for all `.md` files (excluding `index.md` and `log.md` which are structural). Parse frontmatter for metadata, especially `type` and `sources` fields.

6. **Enumerate raw sources**: Scan `raw/` for all source documents. These are leaf nodes — they have no outgoing links within the wiki but are referenced by wiki pages via `sources` frontmatter.

7. **Extract links**: Parse standard Markdown links `[text](path.md)` from each wiki page. Resolve relative paths to identify link targets.

8. **Build the graph with typed edges**:
   - **Source edges**: wiki page -> raw source (from `sources` frontmatter)
   - **Cross-reference edges**: wiki page -> wiki page (from inline links)
   - **Category edges**: wiki page -> category (from `type` frontmatter or index.md grouping)
   - **Temporal edges**: entries in log.md show which pages were created/updated together

9. **Identify page types**: Categorize nodes by their `type` frontmatter or by their directory location:
   - Entity pages — describe specific things (people, tools, orgs)
   - Concept pages — describe ideas and theories
   - Summary pages — distill individual sources
   - Synthesis pages — combine insights across sources

10. **Check for staleness**: Cross-reference `wiki/index.md` against actual files. Orphaned pages (exist on disk but not in index) or missing pages (in index but not on disk) indicate maintenance gaps.
