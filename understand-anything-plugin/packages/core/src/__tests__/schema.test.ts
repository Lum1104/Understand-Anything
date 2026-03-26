import { describe, it, expect } from "vitest";
import {
  validateGraph,
  normalizeGraph,
  NODE_TYPE_ALIASES,
  EDGE_TYPE_ALIASES,
} from "../schema.js";
import type { KnowledgeGraph } from "../types.js";

const validGraph: KnowledgeGraph = {
  version: "1.0.0",
  project: {
    name: "test-project",
    languages: ["typescript"],
    frameworks: ["vitest"],
    description: "A test project",
    analyzedAt: "2026-03-14T00:00:00.000Z",
    gitCommitHash: "abc123",
  },
  nodes: [
    {
      id: "node-1",
      type: "file",
      name: "index.ts",
      filePath: "src/index.ts",
      lineRange: [1, 50],
      summary: "Entry point",
      tags: ["entry"],
      complexity: "simple",
    },
  ],
  edges: [
    {
      source: "node-1",
      target: "node-2",
      type: "imports",
      direction: "forward",
      weight: 0.8,
    },
  ],
  layers: [
    {
      id: "layer-1",
      name: "Core",
      description: "Core layer",
      nodeIds: ["node-1"],
    },
  ],
  tour: [
    {
      order: 1,
      title: "Start here",
      description: "Begin with the entry point",
      nodeIds: ["node-1"],
    },
  ],
};

describe("schema validation", () => {
  it("validates a correct knowledge graph", () => {
    const result = validateGraph(validGraph);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.version).toBe("1.0.0");
    expect(result.errors).toBeUndefined();
  });

  it("rejects graph with missing required fields", () => {
    const incomplete = {
      version: "1.0.0",
      // missing project, nodes, edges, layers, tour
    };

    const result = validateGraph(incomplete);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('falls back unknown node type "invalid_type" to "concept"', () => {
    const graph = structuredClone(validGraph);
    (graph.nodes[0] as any).type = "invalid_type";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.nodes[0].type).toBe("concept");
  });

  it('falls back unknown edge type "not_a_real_edge_type" to "related"', () => {
    const graph = structuredClone(validGraph);
    (graph.edges[0] as any).type = "not_a_real_edge_type";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.edges[0].type).toBe("related");
  });

  it("rejects weight out of range (>1)", () => {
    const graph = structuredClone(validGraph);
    graph.edges[0].weight = 1.5;

    const result = validateGraph(graph);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("rejects weight out of range (<0)", () => {
    const graph = structuredClone(validGraph);
    graph.edges[0].weight = -0.1;

    const result = validateGraph(graph);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('normalizes "func" node type to "function"', () => {
    const graph = structuredClone(validGraph);
    (graph.nodes[0] as any).type = "func";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.nodes[0].type).toBe("function");
  });

  it('normalizes "fn" node type to "function"', () => {
    const graph = structuredClone(validGraph);
    (graph.nodes[0] as any).type = "fn";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.nodes[0].type).toBe("function");
  });

  it('normalizes "method" node type to "function"', () => {
    const graph = structuredClone(validGraph);
    (graph.nodes[0] as any).type = "method";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.nodes[0].type).toBe("function");
  });

  it('normalizes "interface" node type to "class"', () => {
    const graph = structuredClone(validGraph);
    (graph.nodes[0] as any).type = "interface";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.nodes[0].type).toBe("class");
  });

  it('normalizes "struct" node type to "class"', () => {
    const graph = structuredClone(validGraph);
    (graph.nodes[0] as any).type = "struct";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.nodes[0].type).toBe("class");
  });

  it("normalizes multiple aliased node types in one graph", () => {
    const graph = structuredClone(validGraph);
    (graph.nodes[0] as any).type = "func";
    graph.nodes.push({
      id: "node-2",
      type: "file" as any,
      name: "utils.ts",
      filePath: "src/utils.ts",
      lineRange: [1, 30],
      summary: "Utility helpers",
      tags: ["utils"],
      complexity: "simple",
    });
    (graph.nodes[1] as any).type = "pkg";
    graph.nodes.push({
      id: "node-3",
      type: "file" as any,
      name: "MyClass.ts",
      filePath: "src/MyClass.ts",
      lineRange: [1, 80],
      summary: "A class",
      tags: ["class"],
      complexity: "moderate",
    });
    (graph.nodes[2] as any).type = "struct";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.nodes[0].type).toBe("function");
    expect(result.data!.nodes[1].type).toBe("module");
    expect(result.data!.nodes[2].type).toBe("class");
  });

  it('normalizes "extends" edge type to "inherits"', () => {
    const graph = structuredClone(validGraph);
    (graph.edges[0] as any).type = "extends";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.edges[0].type).toBe("inherits");
  });

  it('normalizes "invokes" edge type to "calls"', () => {
    const graph = structuredClone(validGraph);
    (graph.edges[0] as any).type = "invokes";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.edges[0].type).toBe("calls");
  });

  it('normalizes "relates_to" edge type to "related"', () => {
    const graph = structuredClone(validGraph);
    (graph.edges[0] as any).type = "relates_to";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.edges[0].type).toBe("related");
  });

  it('normalizes "uses" edge type to "depends_on"', () => {
    const graph = structuredClone(validGraph);
    (graph.edges[0] as any).type = "uses";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.edges[0].type).toBe("depends_on");
  });

  it('normalizes "tests" edge type to "tested_by"', () => {
    const graph = structuredClone(validGraph);
    (graph.edges[0] as any).type = "tests";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.edges[0].type).toBe("tested_by");
  });

  it('falls back unknown edge type "totally_bogus" to "related"', () => {
    const graph = structuredClone(validGraph);
    (graph.edges[0] as any).type = "totally_bogus";

    const result = validateGraph(graph);
    expect(result.success).toBe(true);
    expect(result.data!.edges[0].type).toBe("related");
  });

  it("NODE_TYPE_ALIASES values are never alias keys (no chains)", () => {
    for (const [alias, target] of Object.entries(NODE_TYPE_ALIASES)) {
      expect(
        NODE_TYPE_ALIASES,
        `chain detected: ${alias} → ${target} → ${NODE_TYPE_ALIASES[target]}`,
      ).not.toHaveProperty(target);
    }
  });

  it("EDGE_TYPE_ALIASES values are never alias keys (no chains)", () => {
    for (const [alias, target] of Object.entries(EDGE_TYPE_ALIASES)) {
      expect(
        EDGE_TYPE_ALIASES,
        `chain detected: ${alias} → ${target} → ${EDGE_TYPE_ALIASES[target]}`,
      ).not.toHaveProperty(target);
    }
  });
});
