#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIST="$REPO_ROOT/understand-anything-plugin/dist-platforms/openclaw"

if [ ! -d "$DIST" ]; then
  echo "Error: Platform build output not found."
  echo "Run 'cd understand-anything-plugin && pnpm run build:platforms' first."
  exit 1
fi

TARGET_DIR="$HOME/.openclaw/skills"
mkdir -p "$TARGET_DIR"
cp -r "$DIST"/skills/* "$TARGET_DIR/"
echo "Understand-Anything installed to $TARGET_DIR"
echo "Skills available: @understand, @understand-chat, @understand-dashboard, @understand-diff, @understand-explain, @understand-onboard"
