import { useState } from "react";
import { useDashboardStore } from "../store";
export default function ReadingPanel() {
  const graph = useDashboardStore((s) => s.graph);
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const navigateToNode = useDashboardStore((s) => s.navigateToNode);
  const [expanded, setExpanded] = useState(false);

  // Only render for knowledge graphs with an article node selected
  if (graph?.kind !== "knowledge" || !selectedNodeId) return null;

  const node = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  if (!node || node.type !== "article") return null;

  const meta = node.knowledgeMeta;
  const allEdges = graph.edges;

  // Backlinks: edges where this node is the target
  const backlinks = allEdges
    .filter((e) => e.target === node.id)
    .map((e) => {
      const sourceNode = graph.nodes.find((n) => n.id === e.source);
      return { id: e.source, name: sourceNode?.name ?? e.source, node: sourceNode };
    });

  const panelHeight = expanded ? "70vh" : "45vh";

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border-subtle animate-slide-up z-20"
      style={{ height: panelHeight }}
    >
      <div className="h-full flex flex-col">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-elevated border-b border-border-subtle shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded text-node-article border border-node-article/30 bg-node-article/10">
            Reading
          </span>
          <span className="text-sm font-serif text-text-primary truncate">
            {node.name}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {/* Expand/collapse toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-text-muted hover:text-text-primary transition-colors"
              title={expanded ? "Collapse panel" : "Expand panel"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {expanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                )}
              </svg>
            </button>
            {/* Close button */}
            <button
              onClick={() => useDashboardStore.getState().selectNode(null)}
              className="text-text-muted hover:text-text-primary transition-colors"
              title="Close reading panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-auto p-6">
            <h1 className="text-2xl font-serif text-text-primary mb-4">{node.name}</h1>

            {/* Tags */}
            {node.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] glass text-text-secondary px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Summary / article content */}
            <div className="mb-6">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {node.summary}
              </p>
            </div>

            {/* Frontmatter metadata card */}
            {meta?.frontmatter && Object.keys(meta.frontmatter).length > 0 && (
              <div className="mb-4">
                <h4 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
                  Metadata
                </h4>
                <div className="bg-elevated rounded-lg border border-border-subtle p-4 space-y-2">
                  {Object.entries(meta.frontmatter).map(([key, value]) => (
                    <div key={key} className="flex gap-3 text-xs">
                      <span className="text-text-muted font-mono shrink-0 min-w-[80px]">{key}</span>
                      <span className="text-text-secondary break-all">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar: backlinks */}
          {backlinks.length > 0 && (
            <div className="w-[200px] shrink-0 border-l border-border-subtle overflow-auto p-4">
              <h4 className="text-[10px] font-semibold text-gold uppercase tracking-wider mb-3">
                Backlinks ({backlinks.length})
              </h4>
              <div className="space-y-1.5">
                {backlinks.map((link, i) => (
                  <button
                    key={`${link.id}-${i}`}
                    type="button"
                    onClick={() => navigateToNode(link.id)}
                    className="block w-full text-left px-2 py-1.5 rounded bg-elevated hover:bg-gold/10 text-[11px] text-text-secondary hover:text-gold transition-colors truncate"
                    title={link.name}
                  >
                    {link.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
