---
name: understand-knowledge
description: Analyze a markdown knowledge base (Obsidian, Logseq, Dendron, Foam, Karpathy-style, Zettelkasten, or plain) to produce an interactive knowledge graph with typed relationships
argument-hint: [path/to/notes] [--ingest <file-or-folder>]
---

# /understand-knowledge

Analyze a folder of markdown notes and produce a `knowledge-graph.json` file in `.understand-anything/` with `kind: "knowledge"`. This file powers the interactive dashboard for exploring a personal knowledge base's structure, topics, entities, claims, and relationships.

## Options

- `$ARGUMENTS` may contain:
  - A directory path — Point at a specific notes folder (defaults to CWD)
  - `--ingest <file-or-folder>` — Incrementally add new files to an existing knowledge graph without rescanning the entire vault

---

## Phase 0 — Pre-flight

Determine target directory and whether to run a full scan or incremental ingest.

1. Set `TARGET_DIR`:
   - If `$ARGUMENTS` contains a directory path (not prefixed with `--`), resolve it to an absolute path.
   - Otherwise, use the current working directory.

2. Get the current git commit hash (or `"no-git"` if not a git repo):
   ```bash
   git rev-parse HEAD 2>/dev/null || echo "no-git"
   ```

3. Create the intermediate output directory:
   ```bash
   mkdir -p $TARGET_DIR/.understand-anything/intermediate
   ```

4. **Check for `--ingest` flag:**
   - If `--ingest` IS in `$ARGUMENTS`:
     - Verify `$TARGET_DIR/.understand-anything/knowledge-graph.json` exists. If not, report "No existing knowledge graph found. Run `/understand-knowledge` first to create one." and STOP.
     - Read the existing graph and store as `$EXISTING_GRAPH`.
     - Read `$TARGET_DIR/.understand-anything/meta.json` to get `knowledgeFormat`. Store as `$KNOWN_FORMAT`.
     - Resolve the ingest target path (the argument after `--ingest`). Store as `$INGEST_TARGET`.
     - Set `$MODE` to `"ingest"` and skip to Phase 2 (format detection is skipped — use `$KNOWN_FORMAT`).
   - If `--ingest` is NOT in `$ARGUMENTS`:
     - Set `$MODE` to `"full"`.

5. Check if `$TARGET_DIR/.understand-anything/knowledge-graph.json` exists. If it does, read it and check if `kind` is `"knowledge"`. If the existing graph is a codebase graph (`kind` is `"codebase"` or absent), warn the user: "An existing codebase graph will be replaced with a knowledge graph. Continue?" Proceed only if user confirms.

---

## Phase 1 — SCAN

Dispatch a subagent using the `knowledge-scanner` agent definition (at `agents/knowledge-scanner.md`).

Pass these parameters in the dispatch prompt:

> Scan this directory to discover all markdown files for knowledge base analysis.
> Target directory: `$TARGET_DIR`
> Write output to: `$TARGET_DIR/.understand-anything/intermediate/knowledge-manifest.json`

Pass the input as JSON:
```json
{ "targetDir": "$TARGET_DIR" }
```

After the subagent completes, read `$TARGET_DIR/.understand-anything/intermediate/knowledge-manifest.json` to get:
- Total file count
- File list with paths, sizes, first-lines previews
- Directory structure signatures (e.g., `.obsidian/`, `logseq/`, `raw/` + `wiki/`)

Store the file list as `$FILE_LIST` and the total count as `$TOTAL_FILES`.

Report to the user: **"Scanned $TOTAL_FILES markdown files."**

**Gate check:** If >500 files, inform the user and suggest scoping with a subdirectory argument. Proceed only if user confirms or add guidance that this may take a while.

---

## Phase 2 — FORMAT DETECTION

> **Ingest mode:** Skip this phase entirely. Use `$KNOWN_FORMAT` from Phase 0.

Dispatch a subagent using the `format-detector` agent definition (at `agents/format-detector.md`).

Pass these parameters in the dispatch prompt:

> Detect the knowledge base format for the scanned directory.
> Target directory: `$TARGET_DIR`
> Read the manifest at: `$TARGET_DIR/.understand-anything/intermediate/knowledge-manifest.json`
> Write output to: `$TARGET_DIR/.understand-anything/intermediate/format-detection.json`

After the subagent completes, read `$TARGET_DIR/.understand-anything/intermediate/format-detection.json` to get:
- `format`: one of `"obsidian"`, `"logseq"`, `"dendron"`, `"foam"`, `"karpathy"`, `"zettelkasten"`, `"plain"`
- `confidence`: a confidence score (0-1)
- `hints`: format-specific parsing hints for downstream agents

Store as `$DETECTED_FORMAT`, `$FORMAT_CONFIDENCE`, and `$FORMAT_HINTS`.

Report to the user: **"Detected format: $DETECTED_FORMAT (confidence: $FORMAT_CONFIDENCE)"**

---

## Phase 3 — ANALYZE

### Prepare format guide

1. Determine the format to use:
   - Full mode: use `$DETECTED_FORMAT` from Phase 2.
   - Ingest mode: use `$KNOWN_FORMAT` from Phase 0.
2. Read the corresponding format guide from `skills/understand-knowledge/formats/<format>.md` (these files are in the `formats/` subdirectory next to this SKILL.md file — use the skill directory path, not the project root). If the file does not exist, fall back to `formats/plain.md`.
3. Store the format guide content as `$FORMAT_GUIDE`.

### Determine files to analyze

- **Full mode:** Use `$FILE_LIST` from Phase 1.
- **Ingest mode:** Scan only the `$INGEST_TARGET` path:
  - If it is a single file, the batch is just that file.
  - If it is a directory, discover all `.md` files recursively within it.
  - Store as `$INGEST_FILES`.

### Batch and dispatch

Batch the files into groups of **15-25 files each** (aim for ~20 files per batch for balanced sizes).

**Batching strategy:**
- Group files in the same subdirectory together when possible (preserves topical locality).
- Keep daily notes / journal entries together in the same batch.
- Each file's size and preview from the manifest should be included.

For each batch, dispatch a subagent using the `article-analyzer` agent definition (at `agents/article-analyzer.md`). Run up to **5 subagents concurrently** using parallel dispatch. Append the following additional context:

> **Additional context from main session:**
>
> Knowledge base format: `$DETECTED_FORMAT` (or `$KNOWN_FORMAT` in ingest mode)
>
> Format guide:
> ```
> $FORMAT_GUIDE
> ```
>
> Format-specific hints:
> ```json
> $FORMAT_HINTS
> ```

Fill in batch-specific parameters below and dispatch:

> Analyze these markdown files and produce knowledge graph nodes (article, entity, topic, claim, source) and edges.
> Target directory: `$TARGET_DIR`
> Batch index: `<batchIndex>`
> Write output to: `$TARGET_DIR/.understand-anything/intermediate/article-batch-<batchIndex>.json`
>
> Files to analyze in this batch:
> 1. `<path>` (<sizeLines> lines)
> 2. `<path>` (<sizeLines> lines)
> ...

After ALL batches complete, verify that all expected `article-batch-*.json` files exist. Read each one and track any per-batch warnings.

Report progress to the user: **"Analyzed $ANALYZED_FILES files in $BATCH_COUNT batches."**

---

## Phase 4 — RELATIONSHIPS

Dispatch a subagent using the `relationship-builder` agent definition (at `agents/relationship-builder.md`).

### Full mode

Pass these parameters in the dispatch prompt:

> Discover cross-file relationships across all analyzed articles.
> Target directory: `$TARGET_DIR`
> Read all article batch files at: `$TARGET_DIR/.understand-anything/intermediate/article-batch-*.json`
> Write output to: `$TARGET_DIR/.understand-anything/intermediate/relationships.json`
>
> Knowledge base format: `$DETECTED_FORMAT`
>
> Build the following relationship types:
> - `builds_on`: article → article (extends, refines, deepens)
> - `contradicts`: claim → claim (conflicts or disagrees)
> - `categorized_under`: article/entity → topic (thematic grouping)
> - `exemplifies`: entity → concept/topic (concrete example of)
> - `cites`: article → source (references or draws from)
> - `authored_by`: article → entity (written by)
>
> Also produce:
> - Topic nodes: cluster related articles into topics
> - Layers: group nodes by thematic hierarchy (topics at top, articles in middle, entities/claims/sources at bottom)

### Ingest mode

Pass additional context to the relationship-builder:

> **Existing graph context:**
> The existing knowledge graph has these nodes and edges (summary):
> - Node IDs: `[list of existing node IDs]`
> - Topics: `[list of existing topic nodes with names]`
> - Layers: `[existing layer definitions]`
>
> Find relationships between the NEW nodes from the ingest batch and the EXISTING nodes. Reuse existing topic nodes where appropriate rather than creating duplicates.

After the subagent completes, read `$TARGET_DIR/.understand-anything/intermediate/relationships.json` to get:
- Cross-file edges
- Topic nodes (with `categorized_under` edges to articles)
- Layer definitions

Store as `$RELATIONSHIPS`, `$TOPIC_NODES`, and `$LAYERS`.

Report to the user: **"Discovered $EDGE_COUNT cross-file relationships and $TOPIC_COUNT topics."**

---

## Phase 5 — ASSEMBLE

Merge all intermediate results into the final KnowledgeGraph structure.

1. **Collect all nodes:**
   - Read all `article-batch-*.json` files and collect their nodes.
   - Add topic nodes from `$TOPIC_NODES` (Phase 4).
   - In ingest mode: also include all nodes from `$EXISTING_GRAPH`.

2. **Collect all edges:**
   - Read all `article-batch-*.json` files and collect their edges (explicit wikilinks, tags, frontmatter-derived edges).
   - Add cross-file edges from `$RELATIONSHIPS` (Phase 4).
   - In ingest mode: also include all edges from `$EXISTING_GRAPH`.

3. **Deduplicate:**
   - Nodes: deduplicate by `id` (keep last occurrence — newer analysis wins).
   - Edges: deduplicate by `(source, target, type)` tuple (keep last occurrence).

4. **Drop dangling edges:** Remove any edge whose `source` or `target` does not exist in the final node set.

5. **Normalize layers:**
   - Use layer definitions from Phase 4.
   - Ensure every node is assigned to exactly one layer.
   - Drop any `nodeIds` entries that do not exist in the final node set.
   - Each layer must have: `id`, `name`, `description`, `nodeIds`.

6. **Assemble the KnowledgeGraph object:**

   ```json
   {
     "version": "1.0.0",
     "kind": "knowledge",
     "project": {
       "name": "<directory name or vault name>",
       "languages": ["markdown"],
       "frameworks": ["<detected format>"],
       "description": "<auto-generated description based on topic analysis>",
       "analyzedAt": "<ISO 8601 timestamp>",
       "gitCommitHash": "<commit hash from Phase 0>"
     },
     "nodes": [<all deduplicated nodes>],
     "edges": [<all deduplicated edges>],
     "layers": [<normalized layers>],
     "tour": []
   }
   ```

   Note: `tour` is left as an empty array — the relationship-builder does not generate tours for knowledge graphs. A future enhancement may add guided tours through knowledge bases.

7. Write the assembled graph to `$TARGET_DIR/.understand-anything/intermediate/assembled-graph.json`.

---

## Phase 6 — REVIEW

Dispatch a subagent using the `graph-reviewer` agent definition (at `agents/graph-reviewer.md`). Append the following additional context:

> **Additional context from main session:**
>
> This is a knowledge graph (`kind: "knowledge"`), not a codebase graph.
>
> Knowledge-specific node types: `article`, `entity`, `topic`, `claim`, `source`
> Knowledge-specific edge types: `cites`, `contradicts`, `builds_on`, `exemplifies`, `categorized_under`, `authored_by`
>
> Phase warnings/errors accumulated during analysis:
> - [list any batch failures, skipped files, or warnings from Phases 1-5]
>
> Validate the following knowledge-specific constraints:
> - Every `article` node should have at least one edge (no orphan articles)
> - Every `topic` node should have at least one `categorized_under` edge pointing to it
> - Entity names should be consistent (no duplicates like "Obsidian" vs "obsidian")
> - Edge weights follow the conventions below

Pass these parameters in the dispatch prompt:

> Validate the knowledge graph at `$TARGET_DIR/.understand-anything/intermediate/assembled-graph.json`.
> Project root: `$TARGET_DIR`
> Read the file and validate it for completeness and correctness.
> Write output to: `$TARGET_DIR/.understand-anything/intermediate/review.json`

After the subagent completes, read `$TARGET_DIR/.understand-anything/intermediate/review.json`.

**If `issues` array is non-empty:**
- Review the `issues` list.
- Apply automated fixes where possible:
  - Remove edges with dangling references.
  - Merge duplicate entity nodes (keep the one with more edges).
  - Fill missing required fields with sensible defaults (e.g., empty `tags` -> `["untagged"]`, empty `summary` -> `"No summary available"`).
- Re-run validation after automated fixes.
- If critical issues remain after one fix attempt, save the graph anyway but include the warnings in the final report and mark dashboard auto-launch as skipped.

**If `issues` array is empty:** Proceed to Phase 7.

---

## Phase 7 — SAVE

1. Write the final knowledge graph to `$TARGET_DIR/.understand-anything/knowledge-graph.json`.

2. Write metadata to `$TARGET_DIR/.understand-anything/meta.json`:
   ```json
   {
     "lastAnalyzedAt": "<ISO 8601 timestamp>",
     "gitCommitHash": "<commit hash>",
     "version": "1.0.0",
     "analyzedFiles": <number of files analyzed>,
     "knowledgeFormat": "<detected format>"
   }
   ```

3. Clean up intermediate files:
   ```bash
   rm -rf $TARGET_DIR/.understand-anything/intermediate
   ```

4. Report a summary to the user containing:
   - Knowledge base name and detected format
   - Files analyzed / total files
   - Nodes created (broken down by type: article, entity, topic, claim, source)
   - Edges created (broken down by type: cites, contradicts, builds_on, exemplifies, categorized_under, authored_by, plus any explicit link edges)
   - Layers identified (with names)
   - Any warnings from the reviewer
   - Path to the output file: `$TARGET_DIR/.understand-anything/knowledge-graph.json`

---

## Phase 8 — DASHBOARD

Only automatically launch the dashboard by invoking the `/understand-dashboard` skill if final graph validation passed after review fixes.

If final validation did not pass, report that the graph was saved with warnings and dashboard launch was skipped.

---

## Incremental Mode (`--ingest`) — Abbreviated Pipeline

When `--ingest` is specified, the pipeline runs an abbreviated flow:

| Phase | Full Mode | Ingest Mode |
|-------|-----------|-------------|
| Phase 0 — Pre-flight | Determine target, create dirs | Verify existing graph, load format, resolve ingest target |
| Phase 1 — SCAN | Scan entire directory | Scan only `$INGEST_TARGET` (single file or folder) |
| Phase 2 — FORMAT DETECTION | Detect format from scratch | **SKIPPED** — use `knowledgeFormat` from `meta.json` |
| Phase 3 — ANALYZE | Analyze all files | Analyze only new/changed files from `$INGEST_TARGET` |
| Phase 4 — RELATIONSHIPS | Build relationships across all nodes | Build relationships between NEW nodes and EXISTING graph |
| Phase 5 — ASSEMBLE | Merge all intermediate results | Merge new results INTO existing graph (preserve existing nodes/edges) |
| Phase 6 — REVIEW | Full validation | Full validation on merged graph |
| Phase 7 — SAVE | Write graph + meta | Write merged graph + updated meta |
| Phase 8 — DASHBOARD | Auto-trigger dashboard | Auto-trigger dashboard |

---

## Error Handling

- If any subagent dispatch fails, retry **once** with the same prompt plus additional context about the failure.
- Track all warnings and errors from each phase in a `$PHASE_WARNINGS` list. Pass this list to the graph-reviewer in Phase 6.
- If it fails a second time, skip that phase and continue with partial results.
- ALWAYS save partial results — a partial graph is better than no graph.
- Report any skipped phases or errors in the final summary so the user knows what happened.
- NEVER silently drop errors. Every failure must be visible in the final report.

---

## Reference: Knowledge Graph Schema

### Knowledge Node Types (5)

| Type | Description | ID Convention |
|---|---|---|
| `article` | A wiki/note page — the primary content unit | `article:<relative-path>` |
| `entity` | A named thing: person, tool, paper, org, project | `entity:<kebab-case-name>` |
| `topic` | A thematic cluster grouping related articles | `topic:<kebab-case-name>` |
| `claim` | A specific assertion, insight, or takeaway | `claim:<source-path>:<short-slug>` |
| `source` | Raw/reference material that articles cite | `source:<url-or-path-hash>` |

### Knowledge Edge Types (6)

| Type | Direction | Weight | Meaning |
|---|---|---|---|
| `cites` | article → source | 0.7 | References or draws from |
| `contradicts` | claim → claim | 0.9 | Conflicts or disagrees with |
| `builds_on` | article → article | 0.8 | Extends, refines, or deepens |
| `exemplifies` | entity → concept/topic | 0.6 | Is a concrete example of |
| `categorized_under` | article/entity → topic | 0.5 | Belongs to this theme |
| `authored_by` | article → entity | 0.5 | Written or created by |

### Shared Edge Types (also used)

| Type | Weight | Usage in Knowledge Graphs |
|---|---|---|
| `contains` | 1.0 | Topic contains subtopics |
| `related` | 0.5 | General semantic similarity between articles |
| `similar_to` | 0.5 | Near-duplicate or highly overlapping content |
| `documents` | 0.5 | Article documents an entity |

### KnowledgeMeta (on GraphNode)

```typescript
interface KnowledgeMeta {
  format?: "obsidian" | "logseq" | "dendron" | "foam" | "karpathy" | "zettelkasten" | "plain";
  wikilinks?: string[];       // outgoing [[wikilinks]] found in this file
  backlinks?: string[];       // files that link TO this file
  frontmatter?: Record<string, unknown>;  // parsed YAML frontmatter
  sourceUrl?: string;         // external URL for source nodes
  confidence?: number;        // 0-1, for LLM-inferred relationships
}
```
