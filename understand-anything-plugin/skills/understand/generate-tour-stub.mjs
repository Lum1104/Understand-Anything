#!/usr/bin/env node
/**
 * generate-tour-stub.mjs
 *
 * Deterministic stub tour generator for caveman mode.
 * Replaces the LLM tour-builder agent with a fast, zero-token heuristic
 * that creates a 5-7 step tour from README, entry point, and key directories.
 *
 * Usage:
 *   node generate-tour-stub.mjs <assembled-graph.json> <layers.json> <output-tour.json> [entry-point]
 *
 * Input:
 *   - assembled-graph.json with { nodes: [...], edges: [...] }
 *   - layers.json — array of layer objects from assign-layers-simple.mjs
 *   - Optional entry point file path (e.g., "src/index.ts")
 *
 * Output: tour.json — array of { order, title, description, nodeIds }
 *
 * Exit code: 0 on success; non-zero on error.
 */

import { readFileSync, writeFileSync } from 'node:fs';

// File-level node types
const FILE_LEVEL_TYPES = new Set([
  'file', 'config', 'document', 'service', 'pipeline',
  'table', 'schema', 'resource', 'endpoint',
]);

function main() {
  const [,, graphPath, layersPath, outputPath, entryPoint] = process.argv;
  if (!graphPath || !layersPath || !outputPath) {
    process.stderr.write(
      'Usage: node generate-tour-stub.mjs <assembled-graph.json> <layers.json> <output-tour.json> [entry-point]\n',
    );
    process.exit(1);
  }

  const graph = JSON.parse(readFileSync(graphPath, 'utf-8'));
  const layers = JSON.parse(readFileSync(layersPath, 'utf-8'));
  const nodes = graph.nodes || [];

  // Build a lookup: filePath -> nodeId
  const pathToId = new Map();
  for (const n of nodes) {
    if (FILE_LEVEL_TYPES.has(n.type) && n.filePath) {
      pathToId.set(n.filePath, n.id);
    }
  }

  const tour = [];
  let order = 1;

  // Step 1: README
  const readmeId = pathToId.get('README.md') || pathToId.get('readme.md') || pathToId.get('README.rst');
  if (readmeId) {
    tour.push({
      order: order++,
      title: 'Project Overview',
      description: "Start with the README to understand the project's purpose, setup instructions, and high-level architecture.",
      nodeIds: [readmeId],
    });
  }

  // Step 2: Entry point
  if (entryPoint) {
    const entryId = pathToId.get(entryPoint);
    if (entryId) {
      tour.push({
        order: order++,
        title: 'Application Entry Point',
        description: `This is where the application boots. Trace the startup sequence from ${entryPoint} to understand initialization flow.`,
        nodeIds: [entryId],
      });
    }
  }

  // Step 3: Configuration (pick the most important config files)
  const configLayer = layers.find(l => l.id === 'layer:config');
  if (configLayer && configLayer.nodeIds.length > 0) {
    // Prioritize well-known configs
    const priorityConfigs = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml'];
    const picked = [];
    for (const name of priorityConfigs) {
      const id = configLayer.nodeIds.find(nid => nid.endsWith(name));
      if (id) { picked.push(id); break; }
    }
    if (picked.length === 0 && configLayer.nodeIds.length > 0) {
      picked.push(configLayer.nodeIds[0]);
    }
    if (picked.length > 0) {
      tour.push({
        order: order++,
        title: 'Project Configuration',
        description: 'Review the project configuration to understand dependencies, build settings, and project metadata.',
        nodeIds: picked.slice(0, 3),
      });
    }
  }

  // Step 4: Core/Business logic or API layer
  const apiLayer = layers.find(l => l.id === 'layer:api');
  const serviceLayer = layers.find(l => l.id === 'layer:services');
  const coreLayer = layers.find(l => l.id === 'layer:core');

  const logicLayer = apiLayer || serviceLayer || coreLayer;
  if (logicLayer && logicLayer.nodeIds.length > 0) {
    tour.push({
      order: order++,
      title: logicLayer.name,
      description: `Explore the ${logicLayer.name.toLowerCase()} layer to understand the main functionality of the project.`,
      nodeIds: logicLayer.nodeIds.slice(0, 5),
    });
  }

  // Step 5: Data layer (if exists and not already covered)
  const dataLayer = layers.find(l => l.id === 'layer:data');
  if (dataLayer && dataLayer.nodeIds.length > 0) {
    tour.push({
      order: order++,
      title: 'Data & Models',
      description: 'Understand the data structures, database schemas, and models that power the application.',
      nodeIds: dataLayer.nodeIds.slice(0, 5),
    });
  }

  // Step 6: Infrastructure (if exists)
  const infraLayer = layers.find(l => l.id === 'layer:infra');
  if (infraLayer && infraLayer.nodeIds.length > 0) {
    tour.push({
      order: order++,
      title: 'Infrastructure & Deployment',
      description: 'Review the deployment setup, CI/CD pipelines, and infrastructure configuration.',
      nodeIds: infraLayer.nodeIds.slice(0, 3),
    });
  }

  // Step 7: Testing (if exists)
  const testLayer = layers.find(l => l.id === 'layer:testing');
  if (testLayer && testLayer.nodeIds.length > 0) {
    tour.push({
      order: order++,
      title: 'Test Suite',
      description: 'Explore the test suite to understand quality assurance practices and how the codebase is verified.',
      nodeIds: testLayer.nodeIds.slice(0, 3),
    });
  }

  // Fallback: if we ended up with fewer than 3 steps, add remaining layers
  if (tour.length < 3) {
    for (const layer of layers) {
      if (tour.length >= 7) break;
      const alreadyUsed = tour.some(t => t.nodeIds.some(id => layer.nodeIds.includes(id)));
      if (!alreadyUsed && layer.nodeIds.length > 0) {
        tour.push({
          order: order++,
          title: layer.name,
          description: layer.description,
          nodeIds: layer.nodeIds.slice(0, 5),
        });
      }
    }
  }

  writeFileSync(outputPath, JSON.stringify(tour, null, 2));
  process.stdout.write(`Tour generated: ${tour.length} steps\n`);
}

main();
