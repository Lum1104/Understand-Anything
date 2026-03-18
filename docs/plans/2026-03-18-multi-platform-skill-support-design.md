# Multi-Platform Skill Support Design

**Date**: 2026-03-18
**Status**: Approved
**Goal**: Make Understand-Anything skills discoverable and usable across multiple AI coding platforms beyond Claude Code.

## Target Platforms (Priority Order)

| # | Platform | Install Location | Status |
|---|----------|-----------------|--------|
| 1 | **Codex** | `${CODEX_HOME:-$HOME/.codex}/skills/understand-anything/` | New |
| 2 | **OpenClaw** | `~/.openclaw/skills/understand-anything/` | New |
| 3 | **OpenCode** | `~/.config/opencode/skills/understand-anything/` | New |
| 4 | **Cursor** | `.cursor-plugin/` with `plugin.json` manifest | New |
| - | **Claude Code** | Plugin marketplace | Already supported |

## Architecture: Template-Based Generation

### Single Source of Truth

Each skill has ONE source template in `skills/<name>/SKILL.md`. A build script + platform config generates platform-specific variants automatically.

```
skills/understand/SKILL.md  ──build──►  dist-platforms/codex/skills/understand/SKILL.md
  (with {{MARKERS}})                    dist-platforms/openclaw/skills/understand/SKILL.md
                                        dist-platforms/opencode/skills/understand/SKILL.md
                                        dist-platforms/cursor/skills/understand/SKILL.md
```

### Template Markers

Source SKILL.md files use `{{MARKER}}` placeholders for platform-variable content:

| Marker | Purpose | Example Values |
|--------|---------|---------------|
| `{{EXTRA_FRONTMATTER}}` | Additional YAML frontmatter fields | OpenCode: `license: MIT\ncompatibility: opencode` |
| `{{TOOL_BASH}}` | Shell/command execution tool name | Claude Code: `Bash`, Codex: `shell` |
| `{{TOOL_READ}}` | File read tool name | Claude Code: `Read`, Codex: `read_file` |
| `{{TOOL_GLOB}}` | File search tool name | Claude Code: `Glob`, Codex: `list_dir` |
| `{{TOOL_GREP}}` | Content search tool name | Claude Code: `Grep`, Codex: `grep` |
| `{{TOOL_WRITE}}` | File write tool name | Claude Code: `Write`, Codex: `write_file` |
| `{{AGENT_DISPATCH_BLOCK}}` | How to invoke sub-agents | Platform-specific multi-line block |

### Platform Config

`platforms/platform-config.json` defines all variable values per platform:

```json
{
  "codex": {
    "skillDir": "${CODEX_HOME:-$HOME/.codex}/skills/understand-anything",
    "extraFrontmatter": "",
    "tools": {
      "TOOL_BASH": "shell",
      "TOOL_READ": "read_file",
      "TOOL_GLOB": "list_dir",
      "TOOL_GREP": "grep",
      "TOOL_WRITE": "write_file"
    },
    "agentDispatchBlock": "Use Codex collaborative mode to dispatch sub-agents...",
    "agentFormat": "AGENTS.md"
  },
  "openclaw": {
    "skillDir": "~/.openclaw/skills/understand-anything",
    "extraFrontmatter": "version: 1.0.5",
    "tools": {
      "TOOL_BASH": "Bash",
      "TOOL_READ": "Read",
      "TOOL_GLOB": "Glob",
      "TOOL_GREP": "Grep",
      "TOOL_WRITE": "Write"
    },
    "agentDispatchBlock": "Invoke each agent as a skill using @agent-name syntax...",
    "agentFormat": "skills"
  },
  "opencode": {
    "skillDir": "~/.config/opencode/skills/understand-anything",
    "extraFrontmatter": "license: MIT\ncompatibility: opencode",
    "tools": {
      "TOOL_BASH": "Bash",
      "TOOL_READ": "Read",
      "TOOL_GLOB": "Glob",
      "TOOL_GREP": "Grep",
      "TOOL_WRITE": "Write"
    },
    "agentDispatchBlock": "Use the Agent tool to dispatch sub-agents...",
    "agentFormat": "agents"
  },
  "cursor": {
    "skillDir": "~/.cursor/plugins/understand-anything",
    "extraFrontmatter": "",
    "tools": {
      "TOOL_BASH": "Bash",
      "TOOL_READ": "Read",
      "TOOL_GLOB": "Glob",
      "TOOL_GREP": "Grep",
      "TOOL_WRITE": "Write"
    },
    "agentDispatchBlock": "Use the Agent tool to dispatch sub-agents...",
    "agentFormat": "agents"
  }
}
```

## Agent Definition Adaptations

Agents also need platform-specific formats:

| Platform | Agent Format | Output |
|----------|-------------|--------|
| Claude Code / Cursor | Individual `.md` files with frontmatter | `agents/<name>.md` |
| Codex | Single `AGENTS.md` with sections | Concatenated from all agent sources |
| OpenClaw | Each agent as a skill | `skills/ua-<agent-name>/SKILL.md` |
| OpenCode | Agent `.md` files | `agents/<name>.md` (similar to Claude Code) |

## File Structure

```
Understand-Anything/
├── scripts/
│   ├── install-codex.sh
│   ├── install-openclaw.sh
│   ├── install-opencode.sh
│   └── install-cursor.sh
├── understand-anything-plugin/
│   ├── skills/                          # Source templates (canonical)
│   │   ├── understand/SKILL.md
│   │   ├── understand-chat/SKILL.md
│   │   ├── understand-dashboard/SKILL.md
│   │   ├── understand-diff/SKILL.md
│   │   ├── understand-explain/SKILL.md
│   │   └── understand-onboard/SKILL.md
│   ├── agents/                          # Source agent definitions
│   │   ├── project-scanner.md
│   │   ├── file-analyzer.md
│   │   ├── architecture-analyzer.md
│   │   ├── tour-builder.md
│   │   └── graph-reviewer.md
│   ├── platforms/
│   │   ├── platform-config.json         # Platform variable definitions
│   │   └── build.mjs                    # Template processor script
│   ├── dist-platforms/                  # Generated output (gitignored)
│   │   ├── codex/
│   │   │   ├── skills/understand/SKILL.md
│   │   │   └── AGENTS.md
│   │   ├── openclaw/
│   │   │   ├── skills/understand/SKILL.md
│   │   │   └── skills/ua-project-scanner/SKILL.md
│   │   ├── opencode/
│   │   │   ├── skills/understand/SKILL.md
│   │   │   └── agents/project-scanner.md
│   │   └── cursor/
│   │       ├── .cursor-plugin/plugin.json
│   │       ├── skills/understand/SKILL.md
│   │       └── agents/project-scanner.md
│   └── package.json                     # Add "build:platforms" script
└── .gitignore                           # Add dist-platforms/
```

## Install Scripts

Each script is ~15 lines, copies from `dist-platforms/<platform>/`:

```bash
#!/bin/bash
# scripts/install-codex.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIST="$REPO_ROOT/understand-anything-plugin/dist-platforms/codex"

if [ ! -d "$DIST" ]; then
  echo "Error: Run 'pnpm run build:platforms' first."
  exit 1
fi

SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/understand-anything"
mkdir -p "$SKILL_DIR"
cp -r "$DIST"/* "$SKILL_DIR/"
echo "Understand-Anything skills installed to $SKILL_DIR"
```

## Build Script (`platforms/build.mjs`)

Node.js ESM script that:
1. Reads `platform-config.json`
2. For each platform, for each skill template:
   - Reads the source SKILL.md
   - Replaces all `{{MARKER}}` placeholders with platform values
   - Writes to `dist-platforms/<platform>/skills/<name>/SKILL.md`
3. For agents, generates the platform-appropriate format
4. For Cursor, generates `.cursor-plugin/plugin.json` manifest
5. Validates: no unresolved `{{...}}` markers remain in output
6. Reports file counts per platform

## Testing

- **Build verification**: `build.mjs` validates no `{{...}}` markers remain in output
- **File count check**: Each platform output has expected number of skill + agent files
- **Frontmatter validation**: Parse each generated SKILL.md for valid YAML frontmatter
- **Integration test**: Verify install scripts create correct directory structure in a temp dir

## Maintenance Model

**You maintain:**
- 6 source skill templates (`skills/*/SKILL.md`)
- 5 source agent definitions (`agents/*.md`)
- 1 platform config (`platforms/platform-config.json`)

**Auto-generated (never edit):**
- Everything in `dist-platforms/` (regenerated by `pnpm run build:platforms`)

**Workflow for skill updates:**
1. Edit source template
2. Run `pnpm run build:platforms`
3. Users re-run their platform's install script

## SKILL.md Frontmatter Reference (Per Platform)

| Field | Claude Code | Codex | OpenClaw | OpenCode | Cursor |
|-------|------------|-------|----------|----------|--------|
| `name` | Required | Required | Required | Required (strict kebab-case) | Required |
| `description` | Required | Required | Required | Required (max 1024 chars) | Required |
| `argument-hint` | Optional | N/A | N/A | N/A | N/A |
| `version` | N/A | N/A | Optional | N/A | N/A |
| `license` | N/A | N/A | N/A | Optional | N/A |
| `compatibility` | N/A | N/A | N/A | Optional | N/A |
| `metadata` | N/A | N/A | N/A | Optional (string map) | N/A |
