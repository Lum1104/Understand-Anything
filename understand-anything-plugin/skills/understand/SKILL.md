---
name: understand
description: Analyze a codebase to produce an interactive knowledge graph for understanding architecture, components, and relationships
argument-hint: [options]
{{EXTRA_FRONTMATTER}}
---

# /understand

Analyze the current codebase and produce a `knowledge-graph.json` file in `.understand-anything/`. This file powers the interactive dashboard for exploring the project's architecture.

## Options

- `$ARGUMENTS` may contain:
  - `--full` — Force a full rebuild, ignoring any existing graph
  - A directory path — Scope analysis to a specific subdirectory

---

## Phase 0 — Pre-flight

Determine whether to run a full analysis or incremental update.

1. Set `PROJECT_ROOT` to the current working directory.
2. Get the current git commit hash:
   ```bash
   git rev-parse HEAD
   ```
3. Create the intermediate output directory:
   ```bash
   mkdir -p $PROJECT_ROOT/.understand-anything/intermediate
   ```
4. Check if `$PROJECT_ROOT/.understand-anything/knowledge-graph.json` exists. If it does, read it.
5. Check if `$PROJECT_ROOT/.understand-anything/meta.json` exists. If it does, read it to get `gitCommitHash`.
6. **Decision logic:**

   | Condition | Action |
   |---|---|
   | `--full` flag in `$ARGUMENTS` | Full analysis (all phases) |
   | No existing graph or meta | Full analysis (all phases) |
   | Existing graph + unchanged commit hash | Report "Graph is up to date" and STOP |
   | Existing graph + changed files | Incremental update (re-analyze changed files only) |

   For incremental updates, get the changed file list:
   ```bash
   git diff <lastCommitHash>..HEAD --name-only
   ```
   If this returns no files, report "Graph is up to date" and STOP.

---

## Phase 1 — SCAN (Full analysis only)

{{AGENT_DISPATCH_PROJECT_SCANNER}}

> Scan this project directory to discover all source files, detect languages and frameworks.
> Project root: `$PROJECT_ROOT`
> Write output to: `$PROJECT_ROOT/.understand-anything/intermediate/scan-result.json`

After the agent completes, read `$PROJECT_ROOT/.understand-anything/intermediate/scan-result.json` to get:
- Project name, description
- Languages, frameworks
- File list with line counts
- Complexity estimate

**Gate check:** If >200 files, inform the user and suggest scoping with a subdirectory argument. Proceed only if user confirms or add guidance that this may take a while.

---

## Phase 2 — ANALYZE

### Full analysis path

Batch the file list from Phase 1 into groups of **5-10 files each** (aim for balanced batch sizes).

For each batch, dispatch a **file-analyzer** agent. {{AGENT_CONCURRENT_NOTE}} Each agent gets this prompt:

> Analyze these source files and produce GraphNode and GraphEdge objects.
> Project root: `$PROJECT_ROOT`
> Project: `<projectName>`
> Languages: `<languages>`
> Batch index: `<batchIndex>`
> Write output to: `$PROJECT_ROOT/.understand-anything/intermediate/batch-<batchIndex>.json`
>
> All project files (for import resolution):
> `<full file path list from scan>`
>
> Files to analyze in this batch:
> 1. `<path>` (<sizeLines> lines)
> 2. `<path>` (<sizeLines> lines)
> ...

After ALL batches complete, read each `batch-<N>.json` file and merge:
- Combine all `nodes` arrays. If duplicate node IDs exist, keep the later occurrence.
- Combine all `edges` arrays. Deduplicate by the composite key `source + target + type`.

### Incremental update path

Use the changed files list from Phase 0. Batch and dispatch file-analyzer agents using the same process as above, but only for changed files.

After batches complete, merge with the existing graph:
1. Remove old nodes whose `filePath` matches any changed file
2. Remove old edges whose `source` or `target` references a removed node
3. Add new nodes and edges from the fresh analysis

---

## Phase 3 — ASSEMBLE

Merge all file-analyzer results into a single set of nodes and edges. Then perform basic integrity cleanup:

- Remove any edge whose `source` or `target` references a node ID that does not exist in the merged node set
- Remove duplicate node IDs (keep the last occurrence)
- Log any removed edges or nodes for the final summary

---

## Phase 4 — ARCHITECTURE

{{AGENT_DISPATCH_ARCHITECTURE_ANALYZER}}

> Analyze this codebase's structure to identify architectural layers.
> Project root: `$PROJECT_ROOT`
> Write output to: `$PROJECT_ROOT/.understand-anything/intermediate/layers.json`
> Project: `<projectName>` — `<projectDescription>`
>
> File nodes:
> ```json
> [list of {id, name, filePath, summary, tags} for all file-type nodes]
> ```
>
> Import edges:
> ```json
> [list of edges with type "imports"]
> ```

After the agent completes, read `$PROJECT_ROOT/.understand-anything/intermediate/layers.json` to get the layer assignments.

**For incremental updates:** Always re-run architecture analysis on the full merged node set, since layer assignments may shift when files change.

---

## Phase 5 — TOUR

{{AGENT_DISPATCH_TOUR_BUILDER}}

> Create a guided learning tour for this codebase.
> Project root: `$PROJECT_ROOT`
> Write output to: `$PROJECT_ROOT/.understand-anything/intermediate/tour.json`
> Project: `<projectName>` — `<projectDescription>`
> Languages: `<languages>`
>
> Nodes (summarized):
> ```json
> [list of {id, name, filePath, summary, type} for key nodes]
> ```
>
> Layers:
> ```json
> [layers from Phase 4]
> ```
>
> Key edges:
> ```json
> [imports and calls edges]
> ```

After the agent completes, read `$PROJECT_ROOT/.understand-anything/intermediate/tour.json` to get the tour steps.

---

## Phase 6 — REVIEW

Assemble the full KnowledgeGraph JSON object:

```json
{
  "version": "1.0.0",
  "project": {
    "name": "<projectName>",
    "languages": ["<languages>"],
    "frameworks": ["<frameworks>"],
    "description": "<projectDescription>",
    "analyzedAt": "<ISO 8601 timestamp>",
    "gitCommitHash": "<commit hash from Phase 0>"
  },
  "nodes": [<all merged nodes from Phase 3>],
  "edges": [<all merged edges from Phase 3>],
  "layers": [<layers from Phase 4>],
  "tour": [<steps from Phase 5>]
}
```

1. Write the assembled graph to `$PROJECT_ROOT/.understand-anything/intermediate/assembled-graph.json`.

2. {{AGENT_DISPATCH_GRAPH_REVIEWER}}

   > Validate the knowledge graph at `$PROJECT_ROOT/.understand-anything/intermediate/assembled-graph.json`.
   > Project root: `$PROJECT_ROOT`
   > Read the file and validate it for completeness and correctness.
   > Write output to: `$PROJECT_ROOT/.understand-anything/intermediate/review.json`

3. After the agent completes, read `$PROJECT_ROOT/.understand-anything/intermediate/review.json`.

4. **If `approved: false`:**
   - Review the `issues` list
   - Apply automated fixes where possible:
     - Remove edges with dangling references
     - Fill missing required fields with sensible defaults (e.g., empty `tags` -> `["untagged"]`, empty `summary` -> `"No summary available"`)
     - Remove nodes with invalid types
   - If critical issues remain after one fix attempt, save the graph anyway but include the warnings in the final report

5. **If `approved: true`:** Proceed to Phase 7.

---

## Phase 7 — SAVE

1. Write the final knowledge graph to `$PROJECT_ROOT/.understand-anything/knowledge-graph.json`.

2. Write metadata to `$PROJECT_ROOT/.understand-anything/meta.json`:
   ```json
   {
     "lastAnalyzedAt": "<ISO 8601 timestamp>",
     "gitCommitHash": "<commit hash>",
     "version": "1.0.0",
     "analyzedFiles": <number of files analyzed>
   }
   ```

3. Clean up intermediate files:
   ```bash
   rm -rf $PROJECT_ROOT/.understand-anything/intermediate
   ```

4. Report a summary to the user containing:
   - Project name and description
   - Files analyzed / total files
   - Nodes created (broken down by type: file, function, class)
   - Edges created (broken down by type)
   - Layers identified (with names)
   - Tour steps generated (count)
   - Any warnings from the reviewer
   - Path to the output file: `$PROJECT_ROOT/.understand-anything/knowledge-graph.json`

5. Automatically launch the dashboard by invoking the `/understand-dashboard` skill.

---

## Error Handling

- If any agent dispatch fails, retry **once** with the same prompt plus additional context about the failure.
- If it fails a second time, skip that phase and continue with partial results.
- ALWAYS save partial results — a partial graph is better than no graph.
- Report any skipped phases or errors in the final summary so the user knows what happened.
- NEVER silently drop errors. Every failure must be visible in the final report.

---

## Reference: KnowledgeGraph Schema

### Node Types
| Type | Description | ID Convention |
|---|---|---|
| `file` | Source file | `file:<relative-path>` |
| `function` | Function or method | `func:<relative-path>:<name>` |
| `class` | Class, interface, or type | `class:<relative-path>:<name>` |
| `module` | Logical module or package | `module:<name>` |
| `concept` | Abstract concept or pattern | `concept:<name>` |

### Edge Types (18 total)
| Category | Types |
|---|---|
| Structural | `imports`, `exports`, `contains`, `inherits`, `implements` |
| Behavioral | `calls`, `subscribes`, `publishes`, `middleware` |
| Data flow | `reads_from`, `writes_to`, `transforms`, `validates` |
| Dependencies | `depends_on`, `tested_by`, `configures` |
| Semantic | `related`, `similar_to` |

### Edge Weight Conventions
| Edge Type | Weight |
|---|---|
| `contains` | 1.0 |
| `inherits`, `implements` | 0.9 |
| `calls`, `exports` | 0.8 |
| `imports` | 0.7 |
| `depends_on` | 0.6 |
| `tested_by` | 0.5 |
| All others | 0.5 (default) |
