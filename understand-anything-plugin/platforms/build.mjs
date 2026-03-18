#!/usr/bin/env node

/**
 * Multi-platform build script for Understand Anything.
 *
 * Reads platform-config.json, processes skill/agent templates with
 * {{MARKER}} placeholders, and generates platform-specific output
 * in dist-platforms/.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLUGIN_ROOT = resolve(__dirname, '..');
const DIST_ROOT = join(PLUGIN_ROOT, 'dist-platforms');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJSON(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Discover all skill directories (those containing SKILL.md).
 * Returns an array of { name, templatePath }.
 */
function discoverSkills() {
  const skillsDir = join(PLUGIN_ROOT, 'skills');
  return readdirSync(skillsDir)
    .filter(name => {
      const p = join(skillsDir, name, 'SKILL.md');
      return existsSync(p);
    })
    .sort()
    .map(name => ({
      name,
      templatePath: join(skillsDir, name, 'SKILL.md'),
    }));
}

/**
 * Discover all agent definition files (*.md in agents/).
 * Returns an array of { name, templatePath }.
 */
function discoverAgents() {
  const agentsDir = join(PLUGIN_ROOT, 'agents');
  return readdirSync(agentsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => ({
      name: f.replace(/\.md$/, ''),
      templatePath: join(agentsDir, f),
    }));
}

/**
 * Map agent marker suffix to the canonical agent name.
 * e.g. "PROJECT_SCANNER" -> "project-scanner"
 */
function markerToAgentName(suffix) {
  return suffix.toLowerCase().replace(/_/g, '-');
}

/**
 * Strip YAML frontmatter (lines between leading --- delimiters) from markdown.
 */
function stripFrontmatter(content) {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('---', 3);
  if (end === -1) return content;
  // skip past the closing --- and the newline after it
  let rest = content.slice(end + 3);
  if (rest.startsWith('\n')) rest = rest.slice(1);
  return rest;
}

/**
 * Replace all known markers in a skill template for a given platform config.
 */
function processSkillTemplate(template, platformCfg) {
  let out = template;

  // {{EXTRA_FRONTMATTER}}
  if (platformCfg.extraFrontmatter) {
    out = out.replace(/{{EXTRA_FRONTMATTER}}/g, platformCfg.extraFrontmatter);
  } else {
    // Remove the entire line containing the marker (avoid blank lines in frontmatter)
    out = out.replace(/^.*\{\{EXTRA_FRONTMATTER\}\}.*\n?/gm, '');
  }

  // {{AGENT_DISPATCH_*}}
  const dispatchRe = /\{\{AGENT_DISPATCH_([A-Z_]+)\}\}/g;
  out = out.replace(dispatchRe, (_match, suffix) => {
    const agentName = markerToAgentName(suffix);
    const instruction = platformCfg.agentDispatch.instruction;
    return `Dispatch the **${agentName}** agent with this prompt:\n\n${instruction}`;
  });

  // {{AGENT_CONCURRENT_NOTE}}
  out = out.replace(
    /\{\{AGENT_CONCURRENT_NOTE\}\}/g,
    platformCfg.agentDispatch.concurrentNote,
  );

  return out;
}

/**
 * Replace agent-specific markers in an agent template.
 */
function processAgentTemplate(template, platformCfg, sharedCfg, agentName) {
  let out = template;

  // {{AGENT_TOOLS}}
  const tools = sharedCfg.agentToolSets[agentName] || '';
  out = out.replace(/\{\{AGENT_TOOLS\}\}/g, tools);

  // {{AGENT_MODEL}}
  const model = sharedCfg.agentModels[agentName] || '';
  out = out.replace(/\{\{AGENT_MODEL\}\}/g, model);

  // {{EXTRA_FRONTMATTER}}
  if (platformCfg.extraFrontmatter) {
    out = out.replace(/\{\{EXTRA_FRONTMATTER\}\}/g, platformCfg.extraFrontmatter);
  } else {
    out = out.replace(/^.*\{\{EXTRA_FRONTMATTER\}\}.*\n?/gm, '');
  }

  return out;
}

// ---------------------------------------------------------------------------
// Agent format generators
// ---------------------------------------------------------------------------

/**
 * Codex format: concatenate all agents into a single AGENTS.md.
 */
function generateAgentsMd(agents, platformCfg, sharedCfg, outDir) {
  const sections = agents.map(agent => {
    const raw = readFileSync(agent.templatePath, 'utf-8');
    const body = stripFrontmatter(raw);
    const model = sharedCfg.agentModels[agent.name] || 'unknown';
    return `## Agent: ${agent.name}\n\n**Model:** ${model}\n\n${body.trim()}`;
  });

  const content = `# Understand Anything — Agents\n\n${sections.join('\n\n---\n\n')}\n`;
  const filePath = join(outDir, 'AGENTS.md');
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * OpenClaw format: convert each agent into a skill-formatted SKILL.md.
 */
function generateAgentSkills(agents, platformCfg, sharedCfg, outDir) {
  const prefix = platformCfg.agentSkillPrefix || '';

  for (const agent of agents) {
    const raw = readFileSync(agent.templatePath, 'utf-8');
    const body = stripFrontmatter(raw);
    const skillName = `${prefix}${agent.name}`;
    const tools = sharedCfg.agentToolSets[agent.name] || '';
    const model = sharedCfg.agentModels[agent.name] || '';

    const frontmatterLines = [
      '---',
      `name: ${skillName}`,
      `description: Agent — ${agent.name}`,
      `tools: ${tools}`,
      `model: ${model}`,
    ];
    if (platformCfg.extraFrontmatter) {
      frontmatterLines.push(platformCfg.extraFrontmatter);
    }
    frontmatterLines.push('---');

    const content = frontmatterLines.join('\n') + '\n\n' + body.trim() + '\n';
    const dir = join(outDir, 'skills', skillName);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), content, 'utf-8');
  }
}

/**
 * Standard agents format: copy agent .md files with markers replaced.
 */
function generateAgentFiles(agents, platformCfg, sharedCfg, outDir) {
  const agentsOutDir = join(outDir, 'agents');
  mkdirSync(agentsOutDir, { recursive: true });

  for (const agent of agents) {
    const raw = readFileSync(agent.templatePath, 'utf-8');
    const processed = processAgentTemplate(raw, platformCfg, sharedCfg, agent.name);
    writeFileSync(join(agentsOutDir, `${agent.name}.md`), processed, 'utf-8');
  }
}

// ---------------------------------------------------------------------------
// Cursor manifest
// ---------------------------------------------------------------------------

function generateCursorManifest(skills, agents, outDir) {
  const manifest = {
    name: 'understand-anything',
    description: 'Analyze codebases to produce interactive knowledge-graph dashboards',
    skills: skills.map(s => ({
      name: s.name,
      path: `skills/${s.name}/SKILL.md`,
    })),
    agents: agents.map(a => ({
      name: a.name,
      path: `agents/${a.name}.md`,
    })),
  };

  const dir = join(outDir, '.cursor-plugin');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Validation: scan for leftover markers
// ---------------------------------------------------------------------------

function scanForLeftoverMarkers(dir) {
  const issues = [];
  const markerRe = /\{\{[A-Z_]+\}\}/g;

  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (full.endsWith('.md') || full.endsWith('.json')) {
        const content = readFileSync(full, 'utf-8');
        const matches = content.match(markerRe);
        if (matches) {
          const rel = full.slice(DIST_ROOT.length + 1);
          issues.push({ file: rel, markers: [...new Set(matches)] });
        }
      }
    }
  }

  if (existsSync(dir)) walk(dir);
  return issues;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function build() {
  const config = readJSON(join(__dirname, 'platform-config.json'));
  const sharedCfg = config._shared;
  const skills = discoverSkills();
  const agents = discoverAgents();
  const platforms = Object.keys(config).filter(k => k !== '_shared');

  // Clean output
  if (existsSync(DIST_ROOT)) {
    rmSync(DIST_ROOT, { recursive: true, force: true });
  }

  const summary = [];

  for (const platformName of platforms) {
    const platformCfg = config[platformName];
    const outDir = join(DIST_ROOT, platformName);
    mkdirSync(outDir, { recursive: true });

    let agentCount = agents.length;

    // --- Skills ---
    for (const skill of skills) {
      const template = readFileSync(skill.templatePath, 'utf-8');
      const processed = processSkillTemplate(template, platformCfg);
      const skillOutDir = join(outDir, 'skills', skill.name);
      mkdirSync(skillOutDir, { recursive: true });
      writeFileSync(join(skillOutDir, 'SKILL.md'), processed, 'utf-8');
    }

    // --- Agents ---
    switch (platformCfg.agentFormat) {
      case 'AGENTS.md':
        generateAgentsMd(agents, platformCfg, sharedCfg, outDir);
        break;
      case 'skills':
        generateAgentSkills(agents, platformCfg, sharedCfg, outDir);
        break;
      case 'agents':
        generateAgentFiles(agents, platformCfg, sharedCfg, outDir);
        break;
      default:
        console.warn(`Unknown agentFormat "${platformCfg.agentFormat}" for platform "${platformName}"`);
    }

    // --- Cursor manifest ---
    if (platformCfg.cursorManifest) {
      generateCursorManifest(skills, agents, outDir);
    }

    summary.push({ platform: platformName, skills: skills.length, agents: agentCount });
  }

  // --- Validation ---
  const issues = scanForLeftoverMarkers(DIST_ROOT);
  if (issues.length > 0) {
    console.error('\nERROR: Unresolved template markers found in output:\n');
    for (const issue of issues) {
      console.error(`  ${issue.file}: ${issue.markers.join(', ')}`);
    }
    process.exit(1);
  }

  // --- Summary ---
  console.log('\nBuild complete:\n');
  console.log('  Platform          Skills  Agents');
  console.log('  ────────────────  ──────  ──────');
  for (const s of summary) {
    console.log(`  ${s.platform.padEnd(18)}${String(s.skills).padStart(6)}  ${String(s.agents).padStart(6)}`);
  }
  console.log('');

  return { summary, issues };
}

// Run when executed directly
const isMain = process.argv[1] && resolve(process.argv[1]) === __filename;
if (isMain) {
  build();
}
