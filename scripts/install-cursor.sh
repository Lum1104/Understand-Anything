#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIST="$REPO_ROOT/understand-anything-plugin/dist-platforms/cursor"

if [ ! -d "$DIST" ]; then
  echo "Error: Platform build output not found."
  echo "Run 'cd understand-anything-plugin && pnpm run build:platforms' first."
  exit 1
fi

PLUGIN_DIR="$HOME/.cursor/plugins/understand-anything"
mkdir -p "$PLUGIN_DIR"
cp -r "$DIST"/* "$PLUGIN_DIR/"
echo "Understand-Anything installed to $PLUGIN_DIR"
echo "Restart Cursor to load the new plugin."
