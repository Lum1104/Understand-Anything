---
name: understand-book
description: Convert an EPUB book into a chapter-aware wiki scaffold, LLM-ready analysis batches, optional LLM analysis results, and root knowledge graph for the dashboard.
argument-hint: [book.epub] [--language <lang>] [--output <dir>] [--chunk-size <chars>] [--batch-size <chunks>] [--llm-provider deepseek|local-command]
---

# /understand-book

Analyze an EPUB book by converting it into a deterministic Karpathy-style wiki, reusing the existing knowledge graph parser/merger, and saving a dashboard-ready graph.

## Instructions

### Phase 1: Resolve arguments

1. Parse `$ARGUMENTS`:
   - First non-flag token: EPUB input path.
   - `--language <lang>`: optional output language, defaults to EPUB metadata or `unknown`.
   - `--output <dir>`: optional output directory, defaults to `.understand-book`.
   - `--chunk-size <chars>`: optional max characters per deterministic chunk, defaults to `6000`.
   - `--batch-size <chunks>`: optional max chunks per analysis batch, defaults to `8`.
2. If no EPUB path is provided, ask the user for one.
3. Resolve relative paths against the current working directory.
4. Verify the input exists and ends with `.epub`.

### Phase 2: Run deterministic book pipeline

Run the bundled pipeline script:

```bash
python3 <SKILL_DIR>/run-understand-book.py <EPUB_PATH> --output <OUTPUT_DIR> --language <LANGUAGE> --chunk-size 6000 --batch-size 8
```

It performs:

```text
EPUB
  → wiki scaffold
  → deterministic chunks
  → LLM-ready analysis-batch JSON files
  → understand-knowledge parse
  → understand-knowledge merge
  → <OUTPUT_DIR>/.understand-anything/knowledge-graph.json
  → <OUTPUT_DIR>/.understand-anything/meta.json
  → <OUTPUT_DIR>/book-report.md
```

Expected progress output:

```text
[understand-book] input: ...
[understand-book] output: ...
[1/6] Convert EPUB to wiki scaffold...
[1/6] Manifest ready: N chapters, M assets
[2/6] Write deterministic chapter chunks...
[3/6] Write LLM-ready analysis batches...
[4/6] Parse wiki scaffold...
[5/6] Merge knowledge graph...
[6/6] Save root graph and metadata...
Done.
```

### Phase 3: Optional LLM batch analysis

The deterministic pipeline stops after writing `analysis-batches/*.json`. To run LLM analysis, use the adapter runner.

DeepSeek example:

```bash
DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" python3 <SKILL_DIR>/llm-adapters/run-analysis-batches.py \
  <OUTPUT_DIR>/.understand-anything/intermediate/analysis-batches-manifest.json \
  --provider deepseek \
  --model deepseek-v4-flash
```

Local command example for tests or private models:

```bash
python3 <SKILL_DIR>/llm-adapters/run-analysis-batches.py \
  <OUTPUT_DIR>/.understand-anything/intermediate/analysis-batches-manifest.json \
  --provider local-command \
  --command "python3 my-batch-analyzer.py" \
  --model local-json-analyzer
```

Adapter contract:

```text
input:  analysis-batch-XXX.json on stdin for local-command, or DeepSeek chat completion payload
output: <OUTPUT_DIR>/.understand-anything/intermediate/analysis-results/analysis-batch-XXX.result.json
        <OUTPUT_DIR>/.understand-anything/intermediate/analysis-results-manifest.json
```

Then synthesize analysis results into a human report and graph overlay:

```bash
python3 <SKILL_DIR>/llm-adapters/synthesize-analysis-results.py \
  <OUTPUT_DIR>/.understand-anything/intermediate/analysis-results-manifest.json \
  --graph <OUTPUT_DIR>/.understand-anything/knowledge-graph.json \
  --output-dir <OUTPUT_DIR>
```

Synthesis outputs:

```text
<OUTPUT_DIR>/book-analysis.md
<OUTPUT_DIR>/.understand-anything/intermediate/analysis-synthesis.json
<OUTPUT_DIR>/.understand-anything/knowledge-graph.enriched.json
```

Do not write API keys into repo files. Use environment variables only.

### Phase 4: Verify output

Check these files exist:

```text
<OUTPUT_DIR>/raw/<book.epub>
<OUTPUT_DIR>/wiki/index.md
<OUTPUT_DIR>/wiki/chapters/ch01.md
<OUTPUT_DIR>/.understand-anything/intermediate/book-manifest.json
<OUTPUT_DIR>/.understand-anything/intermediate/chunks-manifest.json
<OUTPUT_DIR>/.understand-anything/intermediate/chunks/ch01-c001.md
<OUTPUT_DIR>/.understand-anything/intermediate/analysis-batches-manifest.json
<OUTPUT_DIR>/.understand-anything/intermediate/analysis-batches/analysis-batch-001.json
<OUTPUT_DIR>/.understand-anything/knowledge-graph.json
<OUTPUT_DIR>/.understand-anything/meta.json
<OUTPUT_DIR>/book-report.md
```

If validation fails, report the exact `ERR_*` message from the script and stop.

### Phase 5: Open dashboard

Run:

```text
/understand-dashboard <OUTPUT_DIR>
```

## Notes

- EPUB only. Do not accept PDF/DOCX/OCR yet.
- The deterministic path uses Python stdlib only: zip, XML, HTML parsing, JSON, subprocess.
- This pipeline produces a structural book graph plus deterministic LLM-ready `analysis-batches/*.json`. It still does not call an LLM.
- Evidence comes from generated chapter text in EPUB spine order, then from stable chunk files with `evidence_anchor`.
- Chunk and analysis-batch cache files are parsed and schema-validated before reuse; invalid cache is rebuilt instead of trusted blindly.
