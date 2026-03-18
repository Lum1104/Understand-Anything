#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIST="$REPO_ROOT/understand-anything-plugin/dist-platforms/opencode"

if [ ! -d "$DIST" ]; then
  echo "Error: Platform build output not found."
  echo "Run 'cd understand-anything-plugin && pnpm run build:platforms' first."
  exit 1
fi

SKILL_DIR="$HOME/.config/opencode/skills"
mkdir -p "$SKILL_DIR"
cp -r "$DIST"/skills/* "$SKILL_DIR/"

if [ -d "$DIST/agents" ]; then
  AGENT_DIR="$HOME/.config/opencode/agents"
  mkdir -p "$AGENT_DIR"
  cp -r "$DIST"/agents/* "$AGENT_DIR/"
fi

echo "Understand-Anything installed to $SKILL_DIR"
echo "Skills available: /understand, /understand-chat, /understand-dashboard, /understand-diff, /understand-explain, /understand-onboard"
