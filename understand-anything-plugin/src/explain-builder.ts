import { renderUntrustedDataBlock, UNTRUSTED_DATA_INSTRUCTION } from "@understand-anything/core";
import type {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  Layer,
} from "@understand-anything/core";

export interface ExplainContext {
  projectName: string;
  path: string;
  targetNode: GraphNode | null;
  childNodes: GraphNode[];
  connectedNodes: GraphNode[];
  relevantEdges: GraphEdge[];
  layer: Layer | null;
}

/**
 * Build a context for explaining a specific file or function.
 * Supports file paths ("src/auth.ts") and path:function ("src/auth.ts:login").
 */
export function buildExplainContext(
  graph: KnowledgeGraph,
  path: string,
): ExplainContext {
  const { nodes, edges, layers } = graph;

  let targetNode: GraphNode | null = null;

  // Check for path:function format (e.g. "src/auth.ts:login")
  const colonIdx = path.lastIndexOf(":");
  if (colonIdx > 0 && !path.includes("://")) {
    const filePath = path.slice(0, colonIdx);
    const funcName = path.slice(colonIdx + 1);
    targetNode =
      nodes.find(
        (n) => n.filePath === filePath && n.name === funcName,
      ) ?? null;
  }

  // Fall back to file path match
  if (!targetNode) {
    targetNode = nodes.find((n) => n.filePath === path) ?? null;
  }

  if (!targetNode) {
    return {
      projectName: graph.project.name,
      path,
      targetNode: null,
      childNodes: [],
      connectedNodes: [],
      relevantEdges: [],
      layer: null,
    };
  }

  // Find child nodes (contained by this node via "contains" edges)
  const childNodes = nodes.filter((n) =>
    edges.some(
      (e) =>
        e.source === targetNode!.id &&
        e.target === n.id &&
        e.type === "contains",
    ),
  );

  const allRelatedIds = new Set([
    targetNode.id,
    ...childNodes.map((n) => n.id),
  ]);

  // Find connected nodes (1-hop neighbors, excluding children and self)
  const connectedIds = new Set<string>();
  const relevantEdges: GraphEdge[] = [];

  for (const edge of edges) {
    if (allRelatedIds.has(edge.source) || allRelatedIds.has(edge.target)) {
      relevantEdges.push(edge);
      if (allRelatedIds.has(edge.source) && !allRelatedIds.has(edge.target)) {
        connectedIds.add(edge.target);
      }
      if (allRelatedIds.has(edge.target) && !allRelatedIds.has(edge.source)) {
        connectedIds.add(edge.source);
      }
    }
  }

  const connectedNodes = nodes.filter((n) => connectedIds.has(n.id));

  const layer =
    layers.find((l) => l.nodeIds.includes(targetNode!.id)) ?? null;

  return {
    projectName: graph.project.name,
    path,
    targetNode,
    childNodes,
    connectedNodes,
    relevantEdges,
    layer,
  };
}

/**
 * Format the explain context as a structured prompt for LLM consumption.
 */
export function formatExplainPrompt(ctx: ExplainContext): string {
  if (!ctx.targetNode) {
    return [
      `# Component Not Found`,
      ``,
      `The requested component was not found in the knowledge graph.`,
      ``,
      UNTRUSTED_DATA_INSTRUCTION,
      renderUntrustedDataBlock("requested component path", {
        projectName: ctx.projectName,
        path: ctx.path,
      }),
      ``,
      `Possible reasons:`,
      `- The file hasn't been analyzed yet — try running /understand first`,
      `- The path may be different in the graph — check the exact file path`,
      `- The file may have been deleted or renamed since the last analysis`,
    ].join("\n");
  }

  const { targetNode, childNodes, connectedNodes, relevantEdges, layer } = ctx;
  const dataLines: string[] = [];

  dataLines.push(`# Deep Dive: ${targetNode.name}`);
  dataLines.push("");
  dataLines.push(
    `**Type:** ${targetNode.type} | **Complexity:** ${targetNode.complexity}`,
  );
  if (targetNode.filePath)
    dataLines.push(`**File:** \`${targetNode.filePath}\``);
  if (targetNode.lineRange)
    dataLines.push(
      `**Lines:** ${targetNode.lineRange[0]}-${targetNode.lineRange[1]}`,
    );
  dataLines.push("");
  dataLines.push(`**Summary:** ${targetNode.summary}`);
  dataLines.push("");

  if (layer) {
    dataLines.push(`## Architectural Layer: ${layer.name}`);
    dataLines.push(layer.description);
    dataLines.push("");
  }

  if (childNodes.length > 0) {
    dataLines.push("## Internal Components");
    for (const child of childNodes) {
      dataLines.push(`- **${child.name}** (${child.type}): ${child.summary}`);
    }
    dataLines.push("");
  }

  if (connectedNodes.length > 0) {
    dataLines.push("## Connected Components");
    for (const node of connectedNodes) {
      dataLines.push(`- **${node.name}** (${node.type}): ${node.summary}`);
    }
    dataLines.push("");
  }

  if (relevantEdges.length > 0) {
    const nodeMap = new Map(
      [...[targetNode], ...childNodes, ...connectedNodes].map((n) => [
        n.id,
        n,
      ]),
    );
    dataLines.push("## Relationships");
    for (const edge of relevantEdges) {
      if (edge.type === "contains") continue;
      const src = nodeMap.get(edge.source)?.name ?? edge.source;
      const tgt = nodeMap.get(edge.target)?.name ?? edge.target;
      const desc = edge.description ? ` — ${edge.description}` : "";
      dataLines.push(`- ${src} --[${edge.type}]--> ${tgt}${desc}`);
    }
    dataLines.push("");
  }

  if (targetNode.languageNotes) {
    dataLines.push("## Language Notes");
    dataLines.push(targetNode.languageNotes);
    dataLines.push("");
  }

  return [
    "# Deep Dive Request",
    "",
    UNTRUSTED_DATA_INSTRUCTION,
    renderUntrustedDataBlock("component graph context", dataLines.join("\n")),
    "",
    "## Trusted Instructions",
    "Provide a thorough explanation of this component:",
    "1. What it does and why it exists in the project",
    "2. How data flows through it (inputs, processing, outputs)",
    "3. How it interacts with connected components",
    "4. Any patterns, idioms, or design decisions worth noting",
    "5. Potential gotchas or areas of complexity",
    "",
  ].join("\n");
}
