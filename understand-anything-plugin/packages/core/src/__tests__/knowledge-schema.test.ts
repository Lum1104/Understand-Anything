import { describe, it, expect } from "vitest";
import { validateGraph } from "../schema";
import type { KnowledgeGraph } from "../types";

describe("knowledge graph schema validation", () => {
  const minimalKnowledgeGraph: KnowledgeGraph = {
    version: "1.0",
    kind: "knowledge",
    project: {
      name: "Test KB",
      languages: [],
      frameworks: [],
      description: "A test knowledge base",
      analyzedAt: new Date().toISOString(),
      gitCommitHash: "abc123",
    },
    nodes: [
      {
        id: "article:test-note",
        type: "article",
        name: "Test Note",
        summary: "A test article node",
        tags: ["test"],
        complexity: "simple",
      },
      {
        id: "entity:karpathy",
        type: "entity",
        name: "Andrej Karpathy",
        summary: "AI researcher",
        tags: ["person", "ai"],
        complexity: "simple",
      },
      {
        id: "topic:pkm",
        type: "topic",
        name: "Personal Knowledge Management",
        summary: "Tools and methods for managing personal knowledge",
        tags: ["knowledge", "productivity"],
        complexity: "moderate",
      },
    ],
    edges: [
      {
        source: "article:test-note",
        target: "entity:karpathy",
        type: "authored_by",
        direction: "forward",
        weight: 0.8,
      },
      {
        source: "article:test-note",
        target: "topic:pkm",
        type: "categorized_under",
        direction: "forward",
        weight: 0.7,
      },
    ],
    layers: [
      {
        id: "layer:pkm",
        name: "PKM",
        description: "Personal Knowledge Management topic cluster",
        nodeIds: ["article:test-note", "topic:pkm"],
      },
    ],
    tour: [],
  };

  it("validates a minimal knowledge graph", () => {
    const result = validateGraph(minimalKnowledgeGraph);
    const fatals = result.issues.filter((i) => i.level === "fatal");
    expect(fatals).toHaveLength(0);
  });

  it("preserves kind field through validation", () => {
    const result = validateGraph(minimalKnowledgeGraph);
    expect(result.data!.kind).toBe("knowledge");
  });

  it("accepts all knowledge node types", () => {
    const graph = {
      ...minimalKnowledgeGraph,
      nodes: [
        ...minimalKnowledgeGraph.nodes,
        { id: "claim:rag-bad", type: "claim" as const, name: "RAG loses context", summary: "An assertion", tags: ["claim"], complexity: "simple" as const },
        { id: "source:paper1", type: "source" as const, name: "Attention paper", summary: "A source", tags: ["paper"], complexity: "simple" as const },
      ],
    };
    const result = validateGraph(graph);
    const fatals = result.issues.filter((i) => i.level === "fatal");
    expect(fatals).toHaveLength(0);
  });

  it("accepts all knowledge edge types", () => {
    const graph = {
      ...minimalKnowledgeGraph,
      nodes: [
        ...minimalKnowledgeGraph.nodes,
        { id: "claim:c1", type: "claim" as const, name: "Claim 1", summary: "c1", tags: [], complexity: "simple" as const },
        { id: "claim:c2", type: "claim" as const, name: "Claim 2", summary: "c2", tags: [], complexity: "simple" as const },
        { id: "source:s1", type: "source" as const, name: "Source 1", summary: "s1", tags: [], complexity: "simple" as const },
        { id: "article:a2", type: "article" as const, name: "Article 2", summary: "a2", tags: [], complexity: "simple" as const },
      ],
      edges: [
        ...minimalKnowledgeGraph.edges,
        { source: "article:test-note", target: "source:s1", type: "cites" as const, direction: "forward" as const, weight: 0.7 },
        { source: "claim:c1", target: "claim:c2", type: "contradicts" as const, direction: "forward" as const, weight: 0.6 },
        { source: "article:a2", target: "article:test-note", type: "builds_on" as const, direction: "forward" as const, weight: 0.7 },
        { source: "entity:karpathy", target: "topic:pkm", type: "exemplifies" as const, direction: "forward" as const, weight: 0.5 },
      ],
    };
    const result = validateGraph(graph);
    const fatals = result.issues.filter((i) => i.level === "fatal");
    expect(fatals).toHaveLength(0);
  });

  it("resolves knowledge node type aliases", () => {
    const graph = {
      ...minimalKnowledgeGraph,
      nodes: [
        { id: "note:n1", type: "note" as any, name: "A Note", summary: "note alias", tags: [], complexity: "simple" },
        { id: "person:p1", type: "person" as any, name: "A Person", summary: "person alias", tags: [], complexity: "simple" },
      ],
      edges: [],
      layers: [],
    };
    const result = validateGraph(graph);
    const noteNode = result.data!.nodes.find((n) => n.id === "note:n1");
    const personNode = result.data!.nodes.find((n) => n.id === "person:p1");
    expect(noteNode?.type).toBe("article");
    expect(personNode?.type).toBe("entity");
  });

  it("resolves knowledge edge type aliases", () => {
    const graph = {
      ...minimalKnowledgeGraph,
      edges: [
        { source: "article:test-note", target: "entity:karpathy", type: "written_by" as any, direction: "forward", weight: 0.8 },
      ],
    };
    const result = validateGraph(graph);
    const edge = result.data!.edges.find((e) => e.source === "article:test-note" && e.target === "entity:karpathy");
    expect(edge?.type).toBe("authored_by");
  });

  it("validates knowledgeMeta fields", () => {
    const graph = {
      ...minimalKnowledgeGraph,
      nodes: [
        {
          id: "article:with-meta",
          type: "article" as const,
          name: "Article with meta",
          summary: "Has knowledge metadata",
          tags: ["test"],
          complexity: "simple" as const,
          knowledgeMeta: {
            format: "obsidian" as const,
            wikilinks: ["[[other-note]]", "[[another]]"],
            backlinks: ["article:from-here"],
            frontmatter: { title: "My Note", tags: ["ai"] },
            sourceUrl: "https://example.com",
            confidence: 0.85,
          },
        },
      ],
      edges: [],
      layers: [],
    };
    const result = validateGraph(graph);
    const fatals = result.issues.filter((i) => i.level === "fatal");
    expect(fatals).toHaveLength(0);
    const node = result.data!.nodes.find((n) => n.id === "article:with-meta");
    expect(node?.knowledgeMeta?.format).toBe("obsidian");
    expect(node?.knowledgeMeta?.confidence).toBe(0.85);
  });
});
