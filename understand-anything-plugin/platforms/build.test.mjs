import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..');
const DIST = join(PLUGIN_ROOT, 'dist-platforms');

const PLATFORMS = ['codex', 'openclaw', 'opencode', 'cursor'];
const SKILL_NAMES = [
  'understand',
  'understand-chat',
  'understand-dashboard',
  'understand-diff',
  'understand-explain',
  'understand-onboard',
];
const AGENT_NAMES = [
  'architecture-analyzer',
  'file-analyzer',
  'graph-reviewer',
  'project-scanner',
  'tour-builder',
];

beforeAll(async () => {
  await build();
});

afterAll(() => {
  if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all file paths under a directory. */
function walk(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('build.mjs', () => {
  it('creates output directories for all platforms', () => {
    for (const p of PLATFORMS) {
      expect(existsSync(join(DIST, p))).toBe(true);
    }
  });

  it('generates 6 skill files per platform', () => {
    for (const p of PLATFORMS) {
      const skillsDir = join(DIST, p, 'skills');
      const dirs = readdirSync(skillsDir).filter(d =>
        existsSync(join(skillsDir, d, 'SKILL.md')),
      );
      // Every platform must have at least the 6 core skills
      for (const name of SKILL_NAMES) {
        expect(dirs).toContain(name);
      }
    }
  });

  it('resolves all template markers', () => {
    const markerRe = /\{\{[A-Z_]+\}\}/g;
    const allFiles = walk(DIST);
    const issues = [];

    for (const f of allFiles) {
      if (!f.endsWith('.md') && !f.endsWith('.json')) continue;
      const content = readFileSync(f, 'utf-8');
      const matches = content.match(markerRe);
      if (matches) {
        issues.push({ file: f.slice(DIST.length + 1), markers: [...new Set(matches)] });
      }
    }

    expect(issues).toEqual([]);
  });

  it('generates valid YAML frontmatter', () => {
    for (const p of PLATFORMS) {
      for (const s of SKILL_NAMES) {
        const content = readFileSync(join(DIST, p, 'skills', s, 'SKILL.md'), 'utf-8');
        expect(content.startsWith('---\n')).toBe(true);
        expect(content).toContain('name:');
        expect(content).toContain('description:');
      }
    }
  });

  it('generates AGENTS.md for Codex', () => {
    const agentsMd = join(DIST, 'codex', 'AGENTS.md');
    expect(existsSync(agentsMd)).toBe(true);
    const content = readFileSync(agentsMd, 'utf-8');
    for (const name of AGENT_NAMES) {
      expect(content).toContain(name);
    }
  });

  it('generates agent skills for OpenClaw', () => {
    for (const name of AGENT_NAMES) {
      const skillDir = join(DIST, 'openclaw', 'skills', `ua-${name}`);
      expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true);
    }
  });

  it('generates agent .md files for OpenCode and Cursor', () => {
    for (const p of ['opencode', 'cursor']) {
      const agentsDir = join(DIST, p, 'agents');
      for (const name of AGENT_NAMES) {
        expect(existsSync(join(agentsDir, `${name}.md`))).toBe(true);
      }
    }
  });

  it('generates .cursor-plugin/plugin.json for Cursor', () => {
    const manifestPath = join(DIST, 'cursor', '.cursor-plugin', 'plugin.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest).toHaveProperty('name');
    expect(manifest.skills).toHaveLength(SKILL_NAMES.length);
    expect(manifest.agents).toHaveLength(AGENT_NAMES.length);
  });
});
