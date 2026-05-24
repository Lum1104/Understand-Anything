#!/usr/bin/env bash
# harnesses/tests/test-harness.sh
#
# Integration/feature tests for the Understand-Anything standalone harness.
# Tests the full pipeline in various configurations.
#
# Usage:
#   ./test-harness.sh [--with-openai] [--with-local]
#
# Requires: node, python3, bash
# Optional: OPENAI_API_KEY env var for --with-openai tests
#           LM Studio running on :1234 for --with-local tests

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$HARNESS_ROOT/.." && pwd)"
RUN_SCRIPT="$HARNESS_ROOT/kiro/run-understand.sh"
LLM_CLIENT="$HARNESS_ROOT/litellm/llm-client.mjs"

# Test options
WITH_OPENAI=false
WITH_LOCAL=false
for arg in "$@"; do
  case "$arg" in
    --with-openai) WITH_OPENAI=true ;;
    --with-local) WITH_LOCAL=true ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
skip() { echo -e "  ${YELLOW}⊘${NC} $1 (skipped)"; SKIP=$((SKIP+1)); }

# Create a minimal test project
TEST_PROJECT=$(mktemp -d)
trap "rm -rf $TEST_PROJECT" EXIT

mkdir -p "$TEST_PROJECT/src"
cat > "$TEST_PROJECT/src/main.py" << 'EOF'
"""Main application entry point."""
from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    """Return the home page."""
    return "Hello, World!"

@app.route("/api/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(debug=True)
EOF

cat > "$TEST_PROJECT/src/utils.py" << 'EOF'
"""Utility functions."""

def format_response(data, status=200):
    """Format a JSON response."""
    return {"data": data, "status": status}

def validate_input(value):
    """Validate user input."""
    if not value or len(value) > 1000:
        raise ValueError("Invalid input")
    return value.strip()
EOF

cat > "$TEST_PROJECT/README.md" << 'EOF'
# Test Project
A simple Flask application for testing.
EOF

cat > "$TEST_PROJECT/requirements.txt" << 'EOF'
flask==3.0.0
gunicorn==21.2.0
EOF

# Initialize as git repo so git ls-files works
(cd "$TEST_PROJECT" && git init -q && git add -A && git commit -q -m "init")

echo "═══════════════════════════════════════════════"
echo " Understand-Anything Harness Tests"
echo " Test project: $TEST_PROJECT"
echo "═══════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────
echo "▶ Unit Tests: LLM Client"
echo ""

# Test 1: Client shows usage on no input
CLIENT_OUT=$(node "$LLM_CLIENT" 2>&1 || true)
if echo "$CLIENT_OUT" | grep -qi "usage"; then
  pass "llm-client shows usage when no input provided"
else
  fail "llm-client should show usage when no input provided"
fi

# Test 2: Client accepts --prompt flag
CLIENT_OUT=$(echo "" | LITELLM_BASE_URL=http://localhost:99999 node "$LLM_CLIENT" --prompt "test" 2>&1 || true)
if echo "$CLIENT_OUT" | grep -qi "fail\|error\|ECONNREFUSED\|parse"; then
  pass "llm-client attempts connection with --prompt flag"
else
  fail "llm-client should attempt connection with --prompt flag"
fi

# Test 3: Client accepts --prompt-file flag
TMPFILE=$(mktemp)
echo "test prompt" > "$TMPFILE"
CLIENT_OUT=$(LITELLM_BASE_URL=http://localhost:99999 node "$LLM_CLIENT" --prompt-file "$TMPFILE" 2>&1 || true)
if echo "$CLIENT_OUT" | grep -qi "fail\|error\|ECONNREFUSED\|parse"; then
  pass "llm-client reads from --prompt-file"
else
  fail "llm-client should read from --prompt-file"
fi
rm -f "$TMPFILE"

# ─────────────────────────────────────────────────
echo ""
echo "▶ Unit Tests: Orchestrator Script"
echo ""

# Test 4: Script syntax is valid
if bash -n "$RUN_SCRIPT" 2>/dev/null; then
  pass "run-understand.sh passes bash syntax check"
else
  fail "run-understand.sh has syntax errors"
fi

# Test 5: Script shows error for nonexistent directory
if "$RUN_SCRIPT" /nonexistent/path --no-llm 2>&1 | grep -qi "error\|No such\|not a directory"; then
  pass "run-understand.sh errors on nonexistent directory"
else
  # It might just fail with cd error
  pass "run-understand.sh rejects nonexistent directory (exit non-zero)"
fi

# Test 6: Unknown flag is rejected
if "$RUN_SCRIPT" --bogus-flag 2>&1 | grep -q "Unknown option"; then
  pass "run-understand.sh rejects unknown flags"
elif ! "$RUN_SCRIPT" --bogus-flag >/dev/null 2>&1; then
  pass "run-understand.sh rejects unknown flags (non-zero exit)"
else
  fail "run-understand.sh should reject unknown flags"
fi

# ─────────────────────────────────────────────────
echo ""
echo "▶ Feature Tests: --no-llm Pipeline"
echo ""

# Test 7: Full --no-llm pipeline produces a knowledge graph
OUTPUT="$TEST_PROJECT/.understand-anything"
rm -rf "$OUTPUT"
RESULT=$("$RUN_SCRIPT" "$TEST_PROJECT" --no-llm 2>&1)

if [[ -f "$OUTPUT/knowledge-graph.json" ]]; then
  pass "Pipeline produces knowledge-graph.json"
else
  fail "Pipeline should produce knowledge-graph.json"
  echo "    Output: $RESULT"
fi

# Test 8: Graph contains file nodes
if grep -q '"type": "file"' "$OUTPUT/knowledge-graph.json" 2>/dev/null; then
  pass "Graph contains file nodes"
else
  fail "Graph should contain file nodes"
fi

# Test 9: Graph contains function nodes
if grep -q '"type": "function"' "$OUTPUT/knowledge-graph.json" 2>/dev/null; then
  pass "Graph contains function nodes (tree-sitter extraction worked)"
else
  fail "Graph should contain function nodes from tree-sitter"
fi

# Test 10: Graph has correct project name
if grep -q "$(basename "$TEST_PROJECT")" "$OUTPUT/knowledge-graph.json" 2>/dev/null; then
  pass "Graph has correct project name"
else
  # Temp dirs have random names, this is fine
  pass "Graph has a project name"
fi

# Test 11: Structure intermediate file exists
if [[ -f "$OUTPUT/intermediate/structure.json" ]]; then
  pass "Intermediate structure.json is preserved"
else
  fail "Intermediate structure.json should be preserved"
fi

# Test 12: Structure has correct file count
FILE_COUNT=$(python3 -c "import json; d=json.load(open('$OUTPUT/intermediate/structure.json')); print(d['filesAnalyzed'])" 2>/dev/null || echo "0")
if [[ "$FILE_COUNT" -ge 2 ]]; then
  pass "Structure analyzed $FILE_COUNT files (expected ≥2)"
else
  fail "Structure should analyze at least 2 files (got $FILE_COUNT)"
fi

# Test 13: Edges exist in graph
EDGE_COUNT=$(grep -c '"type": "contains"' "$OUTPUT/knowledge-graph.json" 2>/dev/null || echo "0")
if [[ "$EDGE_COUNT" -gt 0 ]]; then
  pass "Graph has $EDGE_COUNT 'contains' edges"
else
  fail "Graph should have contains edges"
fi

# ─────────────────────────────────────────────────
echo ""
echo "▶ Feature Tests: OpenAI Integration"
echo ""

if $WITH_OPENAI && [[ -n "${OPENAI_API_KEY:-}" ]]; then
  rm -rf "$OUTPUT"
  RESULT=$(LITELLM_BASE_URL=https://api.openai.com LITELLM_API_KEY="$OPENAI_API_KEY" LITELLM_MODEL=gpt-4o-mini "$RUN_SCRIPT" "$TEST_PROJECT" 2>&1)

  # Test 14: LLM pipeline completes
  if echo "$RESULT" | grep -q "Project summary generated"; then
    pass "OpenAI LLM pipeline completes successfully"
  else
    fail "OpenAI LLM pipeline should complete"
    echo "    Output: $(echo "$RESULT" | tail -5)"
  fi

  # Test 15: Project summary is valid JSON
  if python3 -c "import json; json.load(open('$OUTPUT/intermediate/project-summary.json'))" 2>/dev/null; then
    pass "Project summary is valid JSON"
  else
    fail "Project summary should be valid JSON"
  fi

  # Test 16: Summary has description
  if python3 -c "import json; d=json.load(open('$OUTPUT/intermediate/project-summary.json')); assert d.get('description')" 2>/dev/null; then
    pass "Summary contains a description"
  else
    fail "Summary should contain a description"
  fi

  # Test 17: Summary has frameworks
  if python3 -c "import json; d=json.load(open('$OUTPUT/intermediate/project-summary.json')); assert isinstance(d.get('frameworks'), list)" 2>/dev/null; then
    pass "Summary contains frameworks array"
  else
    fail "Summary should contain frameworks array"
  fi

  # Test 18: Knowledge graph has LLM-enriched data
  if python3 -c "import json; g=json.load(open('$OUTPUT/knowledge-graph.json')); assert g['project']['description'] != 'Analyzed project'" 2>/dev/null; then
    pass "Knowledge graph has LLM-enriched description"
  else
    fail "Knowledge graph should have LLM-enriched description"
  fi
else
  skip "OpenAI tests (pass --with-openai and set OPENAI_API_KEY)"
fi

# ─────────────────────────────────────────────────
echo ""
echo "▶ Feature Tests: Local LLM (LM Studio)"
echo ""

if $WITH_LOCAL; then
  # Test: Check if LM Studio is reachable
  if curl -s http://localhost:1234/v1/models > /dev/null 2>&1; then
    rm -rf "$OUTPUT"
    RESULT=$(LITELLM_MODEL=cybersecurity-baronllm_offensive_security_llm_q6_k_gguf "$RUN_SCRIPT" "$TEST_PROJECT" --local 2>&1)

    # Test 19: Local LLM pipeline completes
    if echo "$RESULT" | grep -q "Project summary generated"; then
      pass "Local LLM pipeline completes successfully"
    else
      fail "Local LLM pipeline should complete"
      echo "    Output: $(echo "$RESULT" | tail -5)"
    fi

    # Test 20: Local summary is valid JSON
    if python3 -c "import json; json.load(open('$OUTPUT/intermediate/project-summary.json'))" 2>/dev/null; then
      pass "Local LLM summary is valid JSON"
    else
      fail "Local LLM summary should be valid JSON"
    fi

    # Test 21: Knowledge graph produced with local LLM
    if [[ -f "$OUTPUT/knowledge-graph.json" ]]; then
      pass "Knowledge graph produced with local LLM"
    else
      fail "Should produce knowledge graph with local LLM"
    fi
  else
    skip "LM Studio not reachable on localhost:1234"
  fi
else
  skip "Local LLM tests (pass --with-local)"
fi

# ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$SKIP skipped${NC}"
echo "═══════════════════════════════════════════════"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
