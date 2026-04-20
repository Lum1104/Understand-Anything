import { describe, it, expect } from "vitest";
import { validateGraph } from "../schema.js";

function graphWith(domainMeta: Record<string, unknown>) {
  return {
    version: "1.0.0",
    project: {
      name: "test-project",
      languages: ["typescript"],
      frameworks: [],
      description: "A test project",
      analyzedAt: "2026-01-01T00:00:00.000Z",
      gitCommitHash: "abc123",
    },
    nodes: [
      {
        id: "d1",
        type: "domain",
        name: "Checkout",
        summary: "checkout domain",
        tags: [],
        complexity: "simple",
        domainMeta,
      },
    ],
    edges: [],
    layers: [],
    tour: [],
  };
}

describe("DomainMeta.mermaid schema", () => {
  it("accepts a valid mermaid source string", () => {
    const result = validateGraph(
      graphWith({ mermaid: "flowchart TD\n  A --> B" }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a graph with no mermaid field", () => {
    const result = validateGraph(graphWith({ entities: ["Order"] }));
    expect(result.success).toBe(true);
  });

  it("rejects an empty mermaid string", () => {
    const result = validateGraph(graphWith({ mermaid: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects a non-string mermaid value", () => {
    const result = validateGraph(graphWith({ mermaid: 42 as unknown as string }));
    expect(result.success).toBe(false);
  });
});
