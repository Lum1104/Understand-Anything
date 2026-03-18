#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIST="$REPO_ROOT/understand-anything-plugin/dist-platforms/codex"

if [ ! -d "$DIST" ]; then
  echo "Error: Platform build output not found."
  echo "Run 'cd understand-anything-plugin && pnpm run build:platforms' first."
  exit 1
fi

SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/understand-anything"
mkdir -p "$SKILL_DIR"
cp -r "$DIST"/* "$SKILL_DIR/"
echo "Understand-Anything installed to $SKILL_DIR"
echo "Restart Codex to load the new skills."
