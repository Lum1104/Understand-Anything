# Recipe: Phase 7 Intermediate Cleanup

> Cleans up `.understand-anything/intermediate/` while preserving `scan-result.json`. Referenced from `SKILL.md` Phase 7 step 4.

Clean up intermediate files, **preserving `scan-result.json`** so future incremental runs can skip Phase 1 SCAN (see issue #293):

```bash
# Preserve scan-result.json — Phase 1's deterministic file inventory.
# Future incremental runs (Phase 2 compute-batches.mjs --changed-files=…)
# need this inventory; without it, Phase 1 must re-dispatch and pay ~157k
# tokens / ~158s per incremental run.
INTER="$PROJECT_ROOT/.understand-anything/intermediate"
if [ -d "$INTER" ]; then
  find "$INTER" -mindepth 1 -maxdepth 1 -not -name 'scan-result.json' -exec rm -rf {} +
fi
rm -rf $PROJECT_ROOT/.understand-anything/tmp
```
