---
name: understand
description: Generate or update an Understand Anything knowledge graph for a project
---

Use the Understand Anything workflow via its existing skill, but treat this command's CLI-style arguments as the skill's `$ARGUMENTS`.

## Argument forwarding

- Everything after `:understand` is the arguments string.
- While following the underlying skill workflow, interpret `$ARGUMENTS` as that string.

Examples:
- `:understand`
- `:understand --full`
- `:understand --review`
- `:understand ../other-repo --language ja`

## Execute

1. Ensure Understand Anything is installed (the universal plugin root should exist):
   - `$HOME/.understand-anything-plugin`

2. Read and follow the workflow in:
   - `$HOME/.understand-anything-plugin/skills/understand/SKILL.md`

3. When the workflow references helper scripts (e.g. `compute-batches.mjs`, `merge-batch-graphs.py`), prefer running them from the same directory as that `SKILL.md` file (the scripts live alongside it).
