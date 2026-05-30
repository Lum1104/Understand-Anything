import { describe, expect, it } from "vitest";
import {
  hasControlCharacters,
  isSafeGraphId,
  isSafeRelativePath,
  isSensitiveFilePath,
} from "./safety.js";
import { validateGraph } from "./schema.js";

describe("safety policy", () => {
  it("rejects control characters in paths and graph IDs", () => {
    expect(hasControlCharacters("src/evil\nfile.ts")).toBe(true);
    expect(isSafeRelativePath("src/evil\rfile.ts")).toBe(false);
    expect(isSafeGraphId("file:src/app.ts\nignore")).toBe(false);
  });

  it("detects sensitive paths", () => {
    for (const path of [
      ".env",
      ".env.production",
      "certs/private.key",
      "certs/site.pem",
      "credentials.json",
      "secrets/token.txt",
      "data/prod.sqlite",
      "backups/prod-dump.sql",
    ]) {
      expect(isSensitiveFilePath(path), path).toBe(true);
    }
    expect(isSensitiveFilePath("src/app.ts")).toBe(false);
  });

  it("drops graph nodes and edges with control characters in IDs or paths", () => {
    const result = validateGraph({
      version: "1.0.0",
      project: {
        name: "demo",
        languages: ["typescript"],
        frameworks: [],
        description: "demo",
        analyzedAt: "2026-01-01T00:00:00Z",
        gitCommitHash: "abc123",
      },
      nodes: [
        { id: "file:src/app.ts", type: "file", name: "app.ts", filePath: "src/app.ts", summary: "ok", tags: [], complexity: "simple" },
        { id: "file:bad\nnode", type: "file", name: "bad", filePath: "src/bad.ts", summary: "bad", tags: [], complexity: "simple" },
        { id: "file:bad-path", type: "file", name: "bad-path", filePath: "src/bad\npath.ts", summary: "bad", tags: [], complexity: "simple" },
      ],
      edges: [
        { source: "file:src/app.ts", target: "file:bad\ntarget", type: "imports", direction: "forward", weight: 1 },
      ],
      layers: [],
      tour: [],
    });

    expect(result.success).toBe(true);
    expect(result.data?.nodes.map((node) => node.id)).toEqual(["file:src/app.ts"]);
    expect(result.data?.edges).toEqual([]);
    expect(result.issues.some((issue) => issue.category === "invalid-node")).toBe(true);
    expect(result.issues.some((issue) => issue.category === "invalid-edge")).toBe(true);
  });
});
