#!/usr/bin/env node
/**
 * assign-layers-simple.mjs
 *
 * Deterministic directory-pattern-based layer assignment for caveman mode.
 * Replaces the LLM architecture-analyzer agent with a fast, zero-token
 * heuristic that groups files by top-level directory and known patterns.
 *
 * Usage:
 *   node assign-layers-simple.mjs <assembled-graph.json> <output-layers.json>
 *
 * Input:  assembled-graph.json with { nodes: [...], edges: [...] }
 * Output: layers.json — array of { id, name, description, nodeIds }
 *
 * Exit code: 0 on success; non-zero on error.
 */

import { readFileSync, writeFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Directory-pattern → layer mapping
// Order matters: first match wins. Patterns are matched against the first
// path segment(s) of each file's relative path.
// ---------------------------------------------------------------------------
const LAYER_RULES = [
  {
    id: 'layer:api',
    name: 'API & Routes',
    description: 'API endpoints, route handlers, and controllers.',
    patterns: [/^(src\/)?(routes|api|controllers|handlers|endpoints|pages\/api)\b/i],
  },
  {
    id: 'layer:ui',
    name: 'UI & Components',
    description: 'Frontend components, views, layouts, and templates.',
    patterns: [/^(src\/)?(components|views|pages|layouts|templates|screens|widgets|ui)\b/i],
  },
  {
    id: 'layer:services',
    name: 'Business Logic',
    description: 'Services, use cases, and core business logic.',
    patterns: [/^(src\/)?(services|usecases|use-cases|domain|core|business|logic|lib)\b/i],
  },
  {
    id: 'layer:data',
    name: 'Data & Models',
    description: 'Data models, database access, repositories, and schemas.',
    patterns: [/^(src\/)?(models|entities|schemas|prisma|database|db|repositories|repo|data|orm|migrations?)\b/i],
  },
  {
    id: 'layer:utils',
    name: 'Utilities & Helpers',
    description: 'Shared utilities, helpers, constants, and type definitions.',
    patterns: [/^(src\/)?(utils|helpers|common|shared|constants|types|typings|interfaces|enums)\b/i],
  },
  {
    id: 'layer:middleware',
    name: 'Middleware & Plugins',
    description: 'Middleware, interceptors, guards, and plugin hooks.',
    patterns: [/^(src\/)?(middleware|middlewares|interceptors|guards|plugins|hooks)\b/i],
  },
  {
    id: 'layer:testing',
    name: 'Testing',
    description: 'Test suites, fixtures, and test utilities.',
    patterns: [/^(src\/)?(__tests__|tests?|spec|fixtures|testdata|test-utils|cypress|e2e|playwright)\b/i],
  },
  {
    id: 'layer:infra',
    name: 'Infrastructure & CI/CD',
    description: 'Deployment configs, Docker, CI/CD pipelines, and infrastructure-as-code.',
    patterns: [/^(\.github|\.gitlab|\.circleci|k8s|kubernetes|infra|infrastructure|deploy|terraform|ansible|helm)\b/i],
  },
  {
    id: 'layer:config',
    name: 'Configuration',
    description: 'Project configuration files at the root level.',
    patterns: [/^[^/]*\.(json|yaml|yml|toml|ini|cfg|env|env\.example)$/i, /^\.(?!github|gitlab|circleci)/],
  },
  {
    id: 'layer:docs',
    name: 'Documentation',
    description: 'Project documentation, guides, and READMEs.',
    patterns: [/^(docs|documentation|guides|wiki|READMEs?)\b/i, /^README/i, /^CONTRIBUTING/i, /^CHANGELOG/i],
  },
];

// File-level node types that should be assigned to layers
const FILE_LEVEL_TYPES = new Set([
  'file', 'config', 'document', 'service', 'pipeline',
  'table', 'schema', 'resource', 'endpoint',
]);

function main() {
  const [,, graphPath, outputPath] = process.argv;
  if (!graphPath || !outputPath) {
    process.stderr.write('Usage: node assign-layers-simple.mjs <assembled-graph.json> <output-layers.json>\n');
    process.exit(1);
  }

  const graph = JSON.parse(readFileSync(graphPath, 'utf-8'));
  const nodes = graph.nodes || [];

  // Collect file-level nodes
  const fileNodes = nodes.filter(n => FILE_LEVEL_TYPES.has(n.type) && n.filePath);

  // Assign each node to a layer
  const layerBuckets = new Map(); // layerId -> Set<nodeId>
  for (const rule of LAYER_RULES) {
    layerBuckets.set(rule.id, new Set());
  }
  layerBuckets.set('layer:core', new Set()); // catch-all

  for (const node of fileNodes) {
    const filePath = node.filePath;
    let assigned = false;

    // Check tag-based overrides first
    const tags = node.tags || [];
    if (tags.includes('test') || tags.includes('testing')) {
      layerBuckets.get('layer:testing').add(node.id);
      assigned = true;
    }

    if (!assigned) {
      // Match against directory patterns
      for (const rule of LAYER_RULES) {
        if (rule.patterns.some(p => p.test(filePath))) {
          layerBuckets.get(rule.id).add(node.id);
          assigned = true;
          break;
        }
      }
    }

    // Also catch infra node types regardless of path
    if (!assigned && (node.type === 'service' || node.type === 'pipeline' || node.type === 'resource')) {
      layerBuckets.get('layer:infra').add(node.id);
      assigned = true;
    }

    if (!assigned && node.type === 'document') {
      layerBuckets.get('layer:docs').add(node.id);
      assigned = true;
    }

    if (!assigned && node.type === 'config') {
      layerBuckets.get('layer:config').add(node.id);
      assigned = true;
    }

    if (!assigned && (node.type === 'table' || node.type === 'schema' || node.type === 'endpoint')) {
      layerBuckets.get('layer:data').add(node.id);
      assigned = true;
    }

    // Catch-all
    if (!assigned) {
      layerBuckets.get('layer:core').add(node.id);
    }
  }

  // Build layers array, only include non-empty layers
  const layers = [];
  for (const rule of LAYER_RULES) {
    const nodeIds = layerBuckets.get(rule.id);
    if (nodeIds.size > 0) {
      layers.push({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        nodeIds: [...nodeIds],
      });
    }
  }

  // Add catch-all if it has nodes
  const coreNodes = layerBuckets.get('layer:core');
  if (coreNodes.size > 0) {
    layers.push({
      id: 'layer:core',
      name: 'Core',
      description: 'Core application source files.',
      nodeIds: [...coreNodes],
    });
  }

  writeFileSync(outputPath, JSON.stringify(layers, null, 2));
  process.stdout.write(`Layers assigned: ${layers.length} layers, ${fileNodes.length} files\n`);
}

main();
