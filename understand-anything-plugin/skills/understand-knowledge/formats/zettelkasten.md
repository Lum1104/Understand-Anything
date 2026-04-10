# Zettelkasten Format Guide

## Detection

Zettelkasten is a **method**, not a specific tool — implementations vary widely. Identify a Zettelkasten-style knowledge base by its characteristic patterns: atomic notes with unique ID prefixes, a flat or near-flat directory structure, and explicit semantic links between notes.

**Detection heuristics (match 2+ for high confidence):**
- Note filenames begin with timestamp IDs (e.g., `202604091234 Note Title.md`)
- Notes are predominantly flat (few or no subdirectories)
- Notes are short and focused (typically 100-500 words)
- Notes contain explicit typed links with relationship context
- Frontmatter includes `id`, `type`, or `zettel-type` fields
- A structure note or index note exists linking to other notes by category

**Common ID formats:**
- `YYYYMMDDHHmm` — timestamp: `202604091234`
- `YYYYMMDDHHMMSS` — full timestamp: `20260409123456`
- Luhmann-style — hierarchical: `1`, `1a`, `1a1`, `1b`
- Incremental — sequential: `0001`, `0002`, `0003`

## Link Syntax

Zettelkasten notes use whichever link syntax their host tool supports. The method itself does not prescribe a syntax but emphasizes **context with every link**.

### Common Patterns

**Wikilinks (Obsidian, Foam):**
```
[[202604091234 Note Title]]
[[202604091234 Note Title|short name]]
```

**Standard Markdown links:**
```
[Note Title](202604091234-note-title.md)
```

**ID-only references:**
```
[[202604091234]]
```

### Typed / Semantic Links
The defining feature of Zettelkasten linking is that **every link should explain why the connection exists**. Common patterns:

**Inline context:**
```
This builds on the concept of attention mechanisms ([[202604081100 Attention Mechanisms]]).
```

**Explicit relationship labels:**
```
- supports:: [[202604091234 Scaling Laws]]
- contradicts:: [[202604081100 Diminishing Returns]]
- extends:: [[202604071500 Original Transformer]]
- example-of:: [[202604061200 Neural Architecture]]
```

**Prose context (preferred by purists):**
```
The findings in [[202604091234]] directly contradict the earlier claims
about diminishing returns described in [[202604081100]], specifically
regarding the relationship between model size and downstream performance.
```

### Structure Notes (Hub Notes)
Special notes that serve as entry points or tables of contents:
```markdown
# Machine Learning Concepts

## Foundations
- [[202604011200 Linear Algebra Basics]] — prerequisite math
- [[202604021300 Gradient Descent]] — core optimization method

## Architectures
- [[202604031400 Convolutional Networks]] — spatial feature extraction
- [[202604041500 Transformers]] — attention-based architecture

## Training
- [[202604051600 Backpropagation]] — how networks learn
- [[202604061700 Regularization]] — preventing overfitting
```

## Metadata

### YAML Frontmatter
Zettelkasten notes commonly use frontmatter for metadata:

```yaml
---
id: "202604091234"
title: Attention Mechanisms in Transformers
type: permanent  # or: fleeting, literature, permanent, structure
created: 2026-04-09T12:34:00
modified: 2026-04-10T08:15:00
source: "Vaswani et al. 2017"
tags:
  - machine-learning
  - attention
  - transformers
status: mature  # or: seedling, growing, mature
---
```

**Common Zettelkasten-specific fields:**
- `id` — unique identifier (often the timestamp)
- `type` — note type following Zettelkasten conventions:
  - `fleeting` — quick captures, to be processed
  - `literature` — notes on a specific source
  - `permanent` — fully developed atomic ideas
  - `structure` — hub/index notes organizing other notes
- `source` — bibliographic reference for literature notes
- `status` — maturity level of the note

## Folder Structure

Pure Zettelkasten uses a **flat structure** — all notes in a single directory. Hierarchy is expressed through links, not folders.

```
zettelkasten/
  202604011200 Linear Algebra Basics.md
  202604021300 Gradient Descent.md
  202604031400 Convolutional Networks.md
  202604041500 Transformers.md
  202604051600 Backpropagation.md
  202604091234 Attention Mechanisms.md
  index.md                                    # Optional master structure note
  assets/                                     # Optional attachments
    diagram-1.png
```

**Variations:**
- Some implementations use minimal subdirectories: `fleeting/`, `literature/`, `permanent/`
- Some use `inbox/` for unprocessed notes
- The key principle: structure lives in links, not folders

## Tags

Tags supplement but do not replace links. They are used for broad categorization:

### Frontmatter Tags
```yaml
tags:
  - machine-learning
  - attention
```

### Inline Tags
```
#machine-learning #attention
```

**Zettelkasten tagging principles:**
- Tags should answer: "In what context do I want to find this note?"
- Prefer fewer, broader tags over many specific ones
- Tags are for retrieval, links are for connection
- Avoid tags that duplicate what links already express

## Special Files

| Path | Purpose | Action |
|------|---------|--------|
| Index / Structure notes | Hub notes organizing topic areas | **Parse** — these define the high-level knowledge architecture |
| Fleeting notes | Quick captures, unprocessed | **Include but flag** — low maturity |
| Literature notes | Source-specific notes | **Parse** — link to sources |
| Permanent notes | Fully developed ideas | **Parse** — core knowledge nodes |
| `inbox/` or `fleeting/` | Unprocessed captures | Include but deprioritize |

## Parsing Instructions for LLM

1. **Detect Zettelkasten**: Look for the characteristic pattern: files with timestamp/ID prefixes, flat directory structure, short focused notes. Check frontmatter for `type` or `zettel-type` fields.

2. **Identify the ID scheme**: Examine filenames to determine the ID format:
   - Timestamp prefix: `202604091234 Title.md` or `202604091234-title.md`
   - Luhmann IDs: `1a2b Title.md`
   - Numeric: `0042 Title.md`
   Extract the ID as the note's stable identifier.

3. **Classify note types**: From frontmatter `type` field or directory location:
   - **Fleeting** — raw captures, lowest priority
   - **Literature** — notes about specific sources
   - **Permanent** — atomic ideas, highest value
   - **Structure** — hub/index notes organizing others

4. **Parse frontmatter**: Extract `id`, `title`, `type`, `source`, `tags`, `status`, and any custom fields.

5. **Extract links**: Parse both wikilinks `[[...]]` and standard Markdown links `[text](path)`. For each link:
   - Resolve the target note (by ID, filename, or path)
   - Capture surrounding context (the sentence or paragraph containing the link) — this context often describes the semantic relationship

6. **Extract typed relationships**: Look for explicit relationship patterns:
   - `relationship:: [[target]]` in properties
   - Labels before links: "supports:", "contradicts:", "extends:"
   - Contextual prose around links

7. **Identify structure notes**: Notes that primarily consist of organized lists of links to other notes are structure notes. These define the knowledge architecture and should be parsed as category/grouping nodes.

8. **Assess atomicity**: True Zettelkasten notes express one idea each. Notes that are unusually long or cover multiple topics may indicate deviation from the method. Flag these for the user.

9. **Build the graph**:
   - **Primary nodes**: Each note is a node, typed by its Zettelkasten category
   - **Semantic edges**: Links between notes, labeled with relationship type when available
   - **Structure edges**: Links from structure notes to their organized notes (hierarchical)
   - **Source edges**: Literature notes linking to their source references
   - **Tag edges**: Shared tags create implicit connections

10. **Prioritize by maturity**: If `status` metadata is present, use it to indicate note maturity in the graph. Permanent/mature notes are the core knowledge; fleeting/seedling notes are peripheral.
