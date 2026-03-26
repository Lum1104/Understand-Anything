import { z } from "zod";

// Edge types (18 values across 5 categories)
export const EdgeTypeSchema = z.enum([
  "imports", "exports", "contains", "inherits", "implements",  // Structural
  "calls", "subscribes", "publishes", "middleware",             // Behavioral
  "reads_from", "writes_to", "transforms", "validates",        // Data flow
  "depends_on", "tested_by", "configures",                     // Dependencies
  "related", "similar_to",                                      // Semantic
]);

// Aliases that LLMs commonly generate instead of canonical node types
export const NODE_TYPE_ALIASES: Record<string, string> = {
  func: "function",
  fn: "function",
  method: "function",
  procedure: "function",
  subroutine: "function",
  callback: "function",
  handler: "function",
  hook: "function",
  interface: "class",
  struct: "class",
  enum: "class",
  trait: "class",
  type: "class",
  protocol: "class",
  mixin: "class",
  component: "class",
  mod: "module",
  pkg: "module",
  package: "module",
  namespace: "module",
  library: "module",
  crate: "module",
  variable: "concept",
  constant: "concept",
  config: "concept",
  configuration: "concept",
  resource: "concept",
  service: "concept",
  endpoint: "concept",
  route: "concept",
  schema: "concept",
  model: "concept",
  entity: "concept",
  test: "concept",
  fixture: "concept",
  utility: "concept",
  helper: "concept",
  decorator: "concept",
  annotation: "concept",
  middleware: "concept",
  plugin: "concept",
  script: "file",
  template: "file",
  stylesheet: "file",
  asset: "file",
};

// Aliases that LLMs commonly generate instead of canonical edge types
export const EDGE_TYPE_ALIASES: Record<string, string> = {
  extends: "inherits",
  invokes: "calls",
  invoke: "calls",
  uses: "depends_on",
  requires: "depends_on",
  references: "depends_on",
  depends: "depends_on",
  dependency: "depends_on",
  relates_to: "related",
  related_to: "related",
  associated: "related",
  associated_with: "related",
  similar: "similar_to",
  resembles: "similar_to",
  import: "imports",
  export: "exports",
  contain: "contains",
  has: "contains",
  owns: "contains",
  includes: "contains",
  publish: "publishes",
  emits: "publishes",
  fires: "publishes",
  subscribe: "subscribes",
  listens: "subscribes",
  handles: "subscribes",
  reads: "reads_from",
  writes: "writes_to",
  tests: "tested_by",
  test: "tested_by",
  verifies: "tested_by",
  config: "configures",
  configure: "configures",
  transform: "transforms",
  validate: "validates",
  validates_input: "validates",
  inherits_from: "inherits",
  implements_interface: "implements",
};

// Aliases for edge direction values LLMs sometimes generate
export const DIRECTION_ALIASES: Record<string, string> = {
  "bi-directional": "bidirectional",
  both: "bidirectional",
  mutual: "bidirectional",
  "two-way": "bidirectional",
  incoming: "backward",
  outgoing: "forward",
  "one-way": "forward",
  unidirectional: "forward",
};

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["file", "function", "class", "module", "concept"]),
  name: z.string(),
  filePath: z.string().optional(),
  lineRange: z.tuple([z.number(), z.number()]).optional(),
  summary: z.string(),
  tags: z.array(z.string()),
  complexity: z.enum(["simple", "moderate", "complex"]),
  languageNotes: z.string().optional(),
});

export const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: EdgeTypeSchema,
  direction: z.enum(["forward", "backward", "bidirectional"]),
  description: z.string().optional(),
  weight: z.number().min(0).max(1),
});

export const LayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  nodeIds: z.array(z.string()),
});

export const TourStepSchema = z.object({
  order: z.number(),
  title: z.string(),
  description: z.string(),
  nodeIds: z.array(z.string()),
  languageLesson: z.string().optional(),
});

export const ProjectMetaSchema = z.object({
  name: z.string(),
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  description: z.string(),
  analyzedAt: z.string(),
  gitCommitHash: z.string(),
});

export const KnowledgeGraphSchema = z.object({
  version: z.string(),
  project: ProjectMetaSchema,
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  layers: z.array(LayerSchema),
  tour: z.array(TourStepSchema),
});

export interface ValidationResult {
  success: boolean;
  data?: z.infer<typeof KnowledgeGraphSchema>;
  errors?: string[];
}

const VALID_NODE_TYPES = new Set(["file", "function", "class", "module", "concept"]);
const VALID_EDGE_DIRECTIONS = new Set(["forward", "backward", "bidirectional"]);

export function normalizeGraph(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;

  const d = data as Record<string, unknown>;
  const result = { ...d };

  if (Array.isArray(d.nodes)) {
    result.nodes = (d.nodes as any[]).map((node) => {
      if (typeof node !== "object" || node === null || typeof node.type !== "string") {
        return node;
      }
      const t = node.type.toLowerCase();
      if (VALID_NODE_TYPES.has(t)) {
        return { ...node, type: t };
      }
      if (t in NODE_TYPE_ALIASES) {
        return { ...node, type: NODE_TYPE_ALIASES[t] };
      }
      // Fallback: unknown node types become "concept" so the graph still loads
      return { ...node, type: "concept" };
    });
  }

  if (Array.isArray(d.edges)) {
    result.edges = (d.edges as any[]).map((edge) => {
      if (typeof edge !== "object" || edge === null) return edge;
      const patched = { ...edge };

      // Normalize edge type
      if (typeof edge.type === "string") {
        const t = edge.type.toLowerCase();
        if (t in EDGE_TYPE_ALIASES) {
          patched.type = EDGE_TYPE_ALIASES[t];
        } else if (!EdgeTypeSchema.safeParse(t).success) {
          // Unknown edge type falls back to "related"
          patched.type = "related";
        }
      }

      // Normalize direction
      if (typeof edge.direction === "string") {
        const dir = edge.direction.toLowerCase();
        if (VALID_EDGE_DIRECTIONS.has(dir)) {
          patched.direction = dir;
        } else if (dir in DIRECTION_ALIASES) {
          patched.direction = DIRECTION_ALIASES[dir];
        } else {
          patched.direction = "forward";
        }
      }

      return patched;
    });
  }

  return result;
}

export function validateGraph(data: unknown): ValidationResult {
  const result = KnowledgeGraphSchema.safeParse(normalizeGraph(data));

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { success: false, errors };
}
