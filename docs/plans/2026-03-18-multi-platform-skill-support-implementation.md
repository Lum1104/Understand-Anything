# Multi-Platform Skill Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Understand-Anything skills installable on Codex, OpenClaw, OpenCode, and Cursor via template-based generation and per-platform install scripts.

**Architecture:** Source SKILL.md files use `{{MARKER}}` placeholders. A Node.js build script (`platforms/build.mjs`) reads `platform-config.json` and generates platform-specific variants in `dist-platforms/`. Per-platform install scripts copy generated files to the correct location.

**Tech Stack:** Node.js ESM for build script, Bash for install scripts, YAML frontmatter + Markdown for skills.

**Design Doc:** `docs/plans/2026-03-18-multi-platform-skill-support-design.md`

---

### Task 1: Add `dist-platforms/` to .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add gitignore entry**

Add `dist-platforms/` to the existing `.gitignore`:

```
# After existing entries:
dist-platforms/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add dist-platforms/ to gitignore for multi-platform build output"
```

---

### Task 2: Create platform-config.json

**Files:**
- Create: `understand-anything-plugin/platforms/platform-config.json`

**Step 1: Write the platform config**

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
      "TOOL_WRITE": "write_file",
      "TOOL_AGENT": "codex --collab"
    },
    "agentDispatch": {
      "method": "codex-collab",
      "instruction": "Use Codex collaborative mode (`codex --collab`) to dispatch this as a sub-task. Pass the full prompt below to the collaborative agent.",
      "concurrentNote": "Dispatch up to 3 collaborative agents concurrently when processing file batches."
    },
    "agentFormat": "AGENTS.md",
    "agentFrontmatter": false
  },
  "openclaw": {
    "skillDir": "~/.openclaw/skills/understand-anything",
    "extraFrontmatter": "version: 1.0.5",
    "tools": {
      "TOOL_BASH": "Bash",
      "TOOL_READ": "Read",
      "TOOL_GLOB": "Glob",
      "TOOL_GREP": "Grep",
      "TOOL_WRITE": "Write",
      "TOOL_AGENT": "@agent-name"
    },
    "agentDispatch": {
      "method": "skill-invocation",
      "instruction": "Invoke the agent as a skill using `@ua-{agent-name}`. The agent skill will handle the analysis and write results to the intermediate directory.",
      "concurrentNote": "Invoke up to 3 agent skills concurrently when processing file batches."
    },
    "agentFormat": "skills",
    "agentFrontmatter": true,
    "agentSkillPrefix": "ua-"
  },
  "opencode": {
    "skillDir": "~/.config/opencode/skills/understand-anything",
    "extraFrontmatter": "license: MIT\ncompatibility: opencode",
    "tools": {
      "TOOL_BASH": "Bash",
      "TOOL_READ": "Read",
      "TOOL_GLOB": "Glob",
      "TOOL_GREP": "Grep",
      "TOOL_WRITE": "Write",
      "TOOL_AGENT": "Agent"
    },
    "agentDispatch": {
      "method": "agent-tool",
      "instruction": "Use the Agent tool to dispatch a sub-agent with the prompt below. The agent definition is in the `agents/` directory.",
      "concurrentNote": "Dispatch up to 3 agents concurrently when processing file batches."
    },
    "agentFormat": "agents",
    "agentFrontmatter": true
  },
  "cursor": {
    "skillDir": "~/.cursor/plugins/understand-anything",
    "extraFrontmatter": "",
    "tools": {
      "TOOL_BASH": "Bash",
      "TOOL_READ": "Read",
      "TOOL_GLOB": "Glob",
      "TOOL_GREP": "Grep",
      "TOOL_WRITE": "Write",
      "TOOL_AGENT": "Agent"
    },
    "agentDispatch": {
      "method": "agent-tool",
      "instruction": "Use the Agent tool to dispatch a sub-agent with the prompt below. The agent definition is in the `agents/` directory.",
      "concurrentNote": "Dispatch up to 3 agents concurrently when processing file batches."
    },
    "agentFormat": "agents",
    "agentFrontmatter": true,
    "cursorManifest": true
  }
}
```

**Step 2: Commit**

```bash
git add understand-anything-plugin/platforms/platform-config.json
git commit -m "feat: add platform-config.json with Codex, OpenClaw, OpenCode, Cursor definitions"
```

---

### Task 3: Add template markers to `understand/SKILL.md`

This is the most complex skill — it dispatches all 5 agents.

**Files:**
- Modify: `understand-anything-plugin/skills/understand/SKILL.md`

**Step 1: Read the current file carefully**

Read `understand-anything-plugin/skills/understand/SKILL.md` in full.

**Step 2: Add `{{EXTRA_FRONTMATTER}}` to the YAML frontmatter block**

In the frontmatter section, add `{{EXTRA_FRONTMATTER}}` as the last line before `---`:

```yaml
---
name: understand
description: Analyze a codebase to produce an interactive knowledge graph for understanding architecture, components, and relationships
argument-hint: [options]
{{EXTRA_FRONTMATTER}}
---
```

**Step 3: Replace agent dispatch sections with `{{AGENT_DISPATCH_*}}` markers**

For each agent dispatch in the skill body, wrap the dispatch instructions in a marker block. The existing agent dispatch instructions should be replaced with:

- Phase 1 (project-scanner): Replace the dispatch instruction paragraph with `{{AGENT_DISPATCH_PROJECT_SCANNER}}`
- Phase 2 (file-analyzer): Replace the dispatch instruction paragraph with `{{AGENT_DISPATCH_FILE_ANALYZER}}`
- Phase 4 (architecture-analyzer): Replace with `{{AGENT_DISPATCH_ARCHITECTURE_ANALYZER}}`
- Phase 5 (tour-builder): Replace with `{{AGENT_DISPATCH_TOUR_BUILDER}}`
- Phase 6 (graph-reviewer): Replace with `{{AGENT_DISPATCH_GRAPH_REVIEWER}}`

Each marker replaces ONLY the dispatch mechanism text (e.g., "Dispatch the `project-scanner` agent with the following prompt..." or "Use the Agent tool to..."), NOT the prompt content itself. The prompt content (what the agent should do) stays unchanged.

**Step 4: Replace tool name references**

Search for explicit tool name references in the skill body and replace:
- References to `Bash` tool → `{{TOOL_BASH}}`
- References to `Read` tool → `{{TOOL_READ}}`
- References to `Glob` tool → `{{TOOL_GLOB}}`
- References to `Grep` tool → `{{TOOL_GREP}}`
- References to `Write` tool → `{{TOOL_WRITE}}`

Note: Only replace when the word refers to the TOOL NAME (e.g., "Use `Read` to..." or "Use the Read tool"). Do NOT replace bash code snippets or general English words.

**Step 5: Verify the file still makes sense for Claude Code**

Read the modified file. The `{{MARKERS}}` should be in places where the build script will substitute platform-specific values. For Claude Code, the markers will resolve to the original values.

**Step 6: Commit**

```bash
git add understand-anything-plugin/skills/understand/SKILL.md
git commit -m "feat: add template markers to understand skill for multi-platform support"
```

---

### Task 4: Add template markers to the other 5 skills

These skills do NOT dispatch agents — they only use tools directly. Changes are simpler.

**Files:**
- Modify: `understand-anything-plugin/skills/understand-chat/SKILL.md`
- Modify: `understand-anything-plugin/skills/understand-dashboard/SKILL.md`
- Modify: `understand-anything-plugin/skills/understand-diff/SKILL.md`
- Modify: `understand-anything-plugin/skills/understand-explain/SKILL.md`
- Modify: `understand-anything-plugin/skills/understand-onboard/SKILL.md`

**Step 1: Read all 5 files**

Read each file in full.

**Step 2: For each file, add `{{EXTRA_FRONTMATTER}}` to frontmatter**

Same pattern as Task 3 Step 2 — add `{{EXTRA_FRONTMATTER}}` as the last line before the closing `---`.

**Step 3: For each file, replace tool name references**

Same pattern as Task 3 Step 4 — replace tool name references with `{{TOOL_*}}` markers.

These skills have no agent dispatch, so no `{{AGENT_DISPATCH_*}}` markers are needed.

**Step 4: Commit**

```bash
git add understand-anything-plugin/skills/
git commit -m "feat: add template markers to all secondary skills for multi-platform support"
```

---

### Task 5: Add template markers to agent definitions

**Files:**
- Modify: `understand-anything-plugin/agents/project-scanner.md`
- Modify: `understand-anything-plugin/agents/file-analyzer.md`
- Modify: `understand-anything-plugin/agents/architecture-analyzer.md`
- Modify: `understand-anything-plugin/agents/tour-builder.md`
- Modify: `understand-anything-plugin/agents/graph-reviewer.md`

**Step 1: Read all 5 agent files**

Read each file in full.

**Step 2: For each agent, add `{{EXTRA_FRONTMATTER}}` and `{{AGENT_TOOLS}}` markers**

The agent frontmatter currently has `tools: Bash, Glob, Grep, Read, Write`. Replace the tools line:

```yaml
---
name: project-scanner
description: Scans a project directory...
tools: {{AGENT_TOOLS}}
model: {{AGENT_MODEL}}
{{EXTRA_FRONTMATTER}}
---
```

**Step 3: Replace tool name references in agent bodies**

Same as skills — replace explicit tool references with `{{TOOL_*}}` markers.

**Step 4: Commit**

```bash
git add understand-anything-plugin/agents/
git commit -m "feat: add template markers to all agent definitions for multi-platform support"
```

---

### Task 6: Create the build script (`platforms/build.mjs`)

**Files:**
- Create: `understand-anything-plugin/platforms/build.mjs`

**Step 1: Write the failing test**

Create `understand-anything-plugin/platforms/build.test.mjs`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pluginRoot = join(__dirname, '..');
const distDir = join(pluginRoot, 'dist-platforms');

describe('build:platforms', () => {
  beforeAll(() => {
    // Clean previous output
    if (existsSync(distDir)) rmSync(distDir, { recursive: true });
    // Run the build
    execSync('node platforms/build.mjs', { cwd: pluginRoot, stdio: 'pipe' });
  });

  afterAll(() => {
    // Clean up
    if (existsSync(distDir)) rmSync(distDir, { recursive: true });
  });

  it('creates output directories for all platforms', () => {
    for (const platform of ['codex', 'openclaw', 'opencode', 'cursor']) {
      expect(existsSync(join(distDir, platform))).toBe(true);
    }
  });

  it('generates 6 skill files per platform', () => {
    const expectedSkills = [
      'understand', 'understand-chat', 'understand-dashboard',
      'understand-diff', 'understand-explain', 'understand-onboard'
    ];
    for (const platform of ['codex', 'openclaw', 'opencode', 'cursor']) {
      for (const skill of expectedSkills) {
        const skillPath = join(distDir, platform, 'skills', skill, 'SKILL.md');
        expect(existsSync(skillPath), `Missing ${platform}/${skill}/SKILL.md`).toBe(true);
      }
    }
  });

  it('resolves all template markers (no {{...}} in output)', () => {
    const markerRegex = /\{\{[A-Z_]+\}\}/g;
    for (const platform of ['codex', 'openclaw', 'opencode', 'cursor']) {
      const skillsDir = join(distDir, platform, 'skills');
      if (!existsSync(skillsDir)) continue;
      for (const skillName of readdirSync(skillsDir)) {
        const content = readFileSync(join(skillsDir, skillName, 'SKILL.md'), 'utf8');
        const matches = content.match(markerRegex);
        expect(matches, `Unresolved markers in ${platform}/${skillName}: ${matches}`).toBeNull();
      }
    }
  });

  it('generates valid YAML frontmatter', () => {
    for (const platform of ['codex', 'openclaw', 'opencode', 'cursor']) {
      const skillsDir = join(distDir, platform, 'skills');
      if (!existsSync(skillsDir)) continue;
      for (const skillName of readdirSync(skillsDir)) {
        const content = readFileSync(join(skillsDir, skillName, 'SKILL.md'), 'utf8');
        expect(content.startsWith('---\n'), `${platform}/${skillName} missing frontmatter`).toBe(true);
        const endIdx = content.indexOf('\n---\n', 4);
        expect(endIdx, `${platform}/${skillName} unclosed frontmatter`).toBeGreaterThan(0);
        const fm = content.slice(4, endIdx);
        expect(fm).toContain('name:');
        expect(fm).toContain('description:');
      }
    }
  });

  it('generates AGENTS.md for Codex', () => {
    expect(existsSync(join(distDir, 'codex', 'AGENTS.md'))).toBe(true);
  });

  it('generates agent skills for OpenClaw', () => {
    const agents = ['project-scanner', 'file-analyzer', 'architecture-analyzer', 'tour-builder', 'graph-reviewer'];
    for (const agent of agents) {
      const path = join(distDir, 'openclaw', 'skills', `ua-${agent}`, 'SKILL.md');
      expect(existsSync(path), `Missing OpenClaw agent skill: ua-${agent}`).toBe(true);
    }
  });

  it('generates agent .md files for OpenCode and Cursor', () => {
    const agents = ['project-scanner', 'file-analyzer', 'architecture-analyzer', 'tour-builder', 'graph-reviewer'];
    for (const platform of ['opencode', 'cursor']) {
      for (const agent of agents) {
        const path = join(distDir, platform, 'agents', `${agent}.md`);
        expect(existsSync(path), `Missing ${platform}/agents/${agent}.md`).toBe(true);
      }
    }
  });

  it('generates .cursor-plugin/plugin.json for Cursor', () => {
    const manifestPath = join(distDir, 'cursor', '.cursor-plugin', 'plugin.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe('understand-anything');
    expect(manifest.skills).toBeDefined();
  });
});
```

**Step 2: Run the test to verify it fails**

```bash
cd understand-anything-plugin && npx vitest run platforms/build.test.mjs
```

Expected: FAIL — `build.mjs` does not exist yet.

**Step 3: Write the build script**

Create `understand-anything-plugin/platforms/build.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Multi-platform skill generator.
 * Reads source skill/agent templates, applies platform-specific substitutions,
 * and writes output to dist-platforms/<platform>/.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pluginRoot = join(__dirname, '..');
const skillsDir = join(pluginRoot, 'skills');
const agentsDir = join(pluginRoot, 'agents');
const distDir = join(pluginRoot, 'dist-platforms');
const config = JSON.parse(readFileSync(join(__dirname, 'platform-config.json'), 'utf8'));

// Clean previous output
if (existsSync(distDir)) rmSync(distDir, { recursive: true });

// Discover source skills
const skillNames = readdirSync(skillsDir).filter(name => {
  const skillFile = join(skillsDir, name, 'SKILL.md');
  return existsSync(skillFile);
});

// Discover source agents
const agentFiles = readdirSync(agentsDir).filter(f => f.endsWith('.md'));

// Build agent dispatch blocks per platform per agent
function buildAgentDispatchBlock(platformKey, agentName, platformConfig) {
  const dispatch = platformConfig.agentDispatch;
  return `${dispatch.instruction}\n\nAgent: \`${agentName}\``;
}

// Build concurrent dispatch note
function buildConcurrentNote(platformConfig) {
  return platformConfig.agentDispatch.concurrentNote;
}

// Replace all template markers in content
function applyTemplate(content, platformKey, platformConfig) {
  let result = content;

  // Replace {{EXTRA_FRONTMATTER}}
  const extra = platformConfig.extraFrontmatter || '';
  if (extra) {
    result = result.replace(/\{\{EXTRA_FRONTMATTER\}\}\n/g, extra + '\n');
  } else {
    result = result.replace(/\{\{EXTRA_FRONTMATTER\}\}\n/g, '');
  }

  // Replace tool markers
  for (const [marker, value] of Object.entries(platformConfig.tools)) {
    result = result.replace(new RegExp(`\\{\\{${marker}\\}\\}`, 'g'), value);
  }

  // Replace agent dispatch markers
  const agentNames = ['project-scanner', 'file-analyzer', 'architecture-analyzer', 'tour-builder', 'graph-reviewer'];
  for (const agentName of agentNames) {
    const markerName = `AGENT_DISPATCH_${agentName.toUpperCase().replace(/-/g, '_')}`;
    const block = buildAgentDispatchBlock(platformKey, agentName, platformConfig);
    result = result.replace(new RegExp(`\\{\\{${markerName}\\}\\}`, 'g'), block);
  }

  // Replace concurrent note
  result = result.replace(/\{\{AGENT_CONCURRENT_NOTE\}\}/g, buildConcurrentNote(platformConfig));

  // Replace agent tools marker
  const toolsList = Object.entries(platformConfig.tools)
    .filter(([k]) => k.startsWith('TOOL_') && k !== 'TOOL_AGENT')
    .map(([, v]) => v)
    .join(', ');
  result = result.replace(/\{\{AGENT_TOOLS\}\}/g, toolsList);

  // Replace agent model marker (keep original model)
  // Models are platform-agnostic, so just restore the original value
  result = result.replace(/\{\{AGENT_MODEL\}\}/g, (match) => match);

  return result;
}

// Process agent model - read from source and preserve
function getAgentModel(agentContent) {
  const modelMatch = agentContent.match(/^model:\s*(.+)$/m);
  return modelMatch ? modelMatch[1].trim() : 'sonnet';
}

// Generate skills for each platform
for (const [platformKey, platformConfig] of Object.entries(config)) {
  console.log(`Building platform: ${platformKey}`);
  const platformDir = join(distDir, platformKey);

  // Generate skills
  for (const skillName of skillNames) {
    const srcPath = join(skillsDir, skillName, 'SKILL.md');
    const content = readFileSync(srcPath, 'utf8');
    const output = applyTemplate(content, platformKey, platformConfig);

    const outPath = join(platformDir, 'skills', skillName, 'SKILL.md');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, output, 'utf8');
  }

  // Generate agents based on platform format
  if (platformConfig.agentFormat === 'AGENTS.md') {
    // Codex: concatenate all agents into single AGENTS.md
    let agentsMd = '# Understand-Anything Agents\n\n';
    for (const agentFile of agentFiles) {
      const content = readFileSync(join(agentsDir, agentFile), 'utf8');
      const model = getAgentModel(content);
      // Strip frontmatter for AGENTS.md format
      const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1].trim() : content;
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : agentFile.replace('.md', '');
      agentsMd += `## ${name}\n\n**Model:** ${model}\n\n${applyTemplate(body, platformKey, platformConfig)}\n\n---\n\n`;
    }
    const outPath = join(platformDir, 'AGENTS.md');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, agentsMd, 'utf8');

  } else if (platformConfig.agentFormat === 'skills') {
    // OpenClaw: each agent becomes a skill
    const prefix = platformConfig.agentSkillPrefix || 'ua-';
    for (const agentFile of agentFiles) {
      const content = readFileSync(join(agentsDir, agentFile), 'utf8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : agentFile.replace('.md', '');
      const desc = descMatch ? descMatch[1].trim() : '';

      const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1].trim() : content;

      let skillContent = `---\nname: ${prefix}${name}\ndescription: ${desc}\n`;
      if (platformConfig.extraFrontmatter) {
        skillContent += platformConfig.extraFrontmatter + '\n';
      }
      skillContent += `---\n\n${applyTemplate(body, platformKey, platformConfig)}\n`;

      const outPath = join(platformDir, 'skills', `${prefix}${name}`, 'SKILL.md');
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, skillContent, 'utf8');
    }

  } else {
    // OpenCode/Cursor: individual agent .md files with frontmatter
    for (const agentFile of agentFiles) {
      const content = readFileSync(join(agentsDir, agentFile), 'utf8');
      const output = applyTemplate(content, platformKey, platformConfig);
      // Restore model value (was replaced with marker)
      const model = getAgentModel(content);
      const finalOutput = output.replace(/\{\{AGENT_MODEL\}\}/g, model);

      const outPath = join(platformDir, 'agents', agentFile);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, finalOutput, 'utf8');
    }
  }

  // Generate Cursor plugin manifest if needed
  if (platformConfig.cursorManifest) {
    const manifest = {
      name: 'understand-anything',
      description: 'AI-powered codebase understanding — analyze, visualize, and explain any project',
      skills: skillNames.map(name => `skills/${name}`),
      agents: agentFiles.map(f => `agents/${f}`)
    };
    const outPath = join(platformDir, '.cursor-plugin', 'plugin.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }

  // Summary
  const skillCount = skillNames.length;
  const agentCount = agentFiles.length;
  console.log(`  ${skillCount} skills, ${agentCount} agents generated`);
}

// Final validation: check for unresolved markers
let unresolvedCount = 0;
const markerRegex = /\{\{[A-Z_]+\}\}/g;

function validateDir(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      validateDir(fullPath);
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.json')) {
      const content = readFileSync(fullPath, 'utf8');
      const matches = content.match(markerRegex);
      if (matches) {
        console.error(`  ERROR: Unresolved markers in ${fullPath}: ${matches.join(', ')}`);
        unresolvedCount += matches.length;
      }
    }
  }
}

validateDir(distDir);
if (unresolvedCount > 0) {
  console.error(`\nBuild failed: ${unresolvedCount} unresolved template markers found.`);
  process.exit(1);
} else {
  console.log('\nBuild successful. All template markers resolved.');
}
```

**Step 4: Run the test to verify it passes**

```bash
cd understand-anything-plugin && npx vitest run platforms/build.test.mjs
```

Expected: PASS — all 8 test cases green.

**Step 5: Commit**

```bash
git add understand-anything-plugin/platforms/build.mjs understand-anything-plugin/platforms/build.test.mjs
git commit -m "feat: add multi-platform build script with template processing and validation"
```

---

### Task 7: Add `build:platforms` script to package.json

**Files:**
- Modify: `understand-anything-plugin/package.json`

**Step 1: Add the script entry**

Add `"build:platforms": "node platforms/build.mjs"` to the `"scripts"` section:

```json
{
  "scripts": {
    "build": "tsc",
    "build:platforms": "node platforms/build.mjs",
    "test": "vitest run"
  }
}
```

**Step 2: Test it works**

```bash
cd understand-anything-plugin && pnpm run build:platforms
```

Expected: Output shows 4 platforms built, all markers resolved.

**Step 3: Commit**

```bash
git add understand-anything-plugin/package.json
git commit -m "feat: add build:platforms script to package.json"
```

---

### Task 8: Create install scripts

**Files:**
- Create: `scripts/install-codex.sh`
- Create: `scripts/install-openclaw.sh`
- Create: `scripts/install-opencode.sh`
- Create: `scripts/install-cursor.sh`

**Step 1: Write install-codex.sh**

```bash
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
```

**Step 2: Write install-openclaw.sh**

```bash
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

SKILL_DIR="$HOME/.openclaw/skills/understand-anything"
mkdir -p "$SKILL_DIR"
cp -r "$DIST"/skills/* "$SKILL_DIR/../"
echo "Understand-Anything installed to $HOME/.openclaw/skills/"
echo "Skills available: @understand, @understand-chat, @understand-diff, @understand-explain, @understand-onboard"
```

**Step 3: Write install-opencode.sh**

```bash
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
echo "Skills available: /understand, /understand-chat, /understand-diff, /understand-explain, /understand-onboard"
```

**Step 4: Write install-cursor.sh**

```bash
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
```

**Step 5: Make all scripts executable**

```bash
chmod +x scripts/install-codex.sh scripts/install-openclaw.sh scripts/install-opencode.sh scripts/install-cursor.sh
```

**Step 6: Test one script in a temp directory**

```bash
CODEX_HOME=$(mktemp -d) bash scripts/install-codex.sh && ls -R "$CODEX_HOME/skills/understand-anything/"
```

Expected: Shows the skill directories and AGENTS.md.

**Step 7: Commit**

```bash
git add scripts/
git commit -m "feat: add per-platform install scripts for Codex, OpenClaw, OpenCode, Cursor"
```

---

### Task 9: Update README with multi-platform installation section

**Files:**
- Modify: `README.md`

**Step 1: Read the current README**

Read `README.md` to find the right place to add the installation section.

**Step 2: Add multi-platform installation section**

Add a "Multi-Platform Installation" section after the existing Claude Code installation instructions. Content:

```markdown
## Multi-Platform Installation

Understand-Anything works across multiple AI coding platforms. Claude Code is supported natively via the plugin marketplace. For other platforms, use the install scripts:

### Prerequisites

```bash
git clone https://github.com/Lum1104/Understand-Anything.git
cd Understand-Anything
pnpm install
cd understand-anything-plugin && pnpm run build:platforms && cd ..
```

### Codex

```bash
bash scripts/install-codex.sh
# Restart Codex, then use natural language: "Use understand-anything to analyze this codebase"
```

### OpenClaw

```bash
bash scripts/install-openclaw.sh
# In OpenClaw: @understand analyze this codebase
```

### OpenCode

```bash
bash scripts/install-opencode.sh
# In OpenCode: /understand
```

### Cursor

```bash
bash scripts/install-cursor.sh
# Restart Cursor to load the plugin
```

### Platform Compatibility

| Platform | Status | Agent Support |
|----------|--------|---------------|
| Claude Code | Native (marketplace) | Full |
| Codex | Install script | Via collab mode |
| OpenClaw | Install script | Via agent skills |
| OpenCode | Install script | Via Agent tool |
| Cursor | Install script | Via Agent tool |
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add multi-platform installation instructions"
```

---

### Task 10: End-to-end verification

**Step 1: Clean build**

```bash
cd understand-anything-plugin
rm -rf dist-platforms
pnpm run build:platforms
```

Expected: All 4 platforms built, no unresolved markers.

**Step 2: Run all tests**

```bash
pnpm --filter @understand-anything/skill test
```

Expected: All tests pass, including the new build tests.

**Step 3: Verify install scripts work**

```bash
# Test each script with temp directories
CODEX_HOME=$(mktemp -d) bash scripts/install-codex.sh
HOME_BACKUP=$HOME && HOME=$(mktemp -d) bash scripts/install-openclaw.sh
```

Expected: Files installed to correct locations.

**Step 4: Spot-check generated content**

Read a few generated files to verify quality:
```bash
cat understand-anything-plugin/dist-platforms/codex/skills/understand/SKILL.md | head -20
cat understand-anything-plugin/dist-platforms/openclaw/skills/ua-project-scanner/SKILL.md | head -20
cat understand-anything-plugin/dist-platforms/cursor/.cursor-plugin/plugin.json
```

Expected: Valid frontmatter, correct tool names, no markers.

**Step 5: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: address issues found during end-to-end verification"
```
