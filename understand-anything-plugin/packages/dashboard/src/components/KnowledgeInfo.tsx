import { useDashboardStore } from "../store";
import type { GraphNode } from "@understand-anything/core/types";

const typeBadgeColors: Record<string, string> = {
  article: "text-node-article border border-node-article/30 bg-node-article/10",
  entity: "text-node-entity border border-node-entity/30 bg-node-entity/10",
  topic: "text-node-topic border border-node-topic/30 bg-node-topic/10",
  claim: "text-node-claim border border-node-claim/30 bg-node-claim/10",
  source: "text-node-source border border-node-source/30 bg-node-source/10",
};

export default function KnowledgeInfo() {
  const graph = useDashboardStore((s) => s.graph);
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const nodeHistory = useDashboardStore((s) => s.nodeHistory);
  const goBackNode = useDashboardStore((s) => s.goBackNode);
  const navigateToNode = useDashboardStore((s) => s.navigateToNode);
  const navigateToHistoryIndex = useDashboardStore((s) => s.navigateToHistoryIndex);
  const setFocusNode = useDashboardStore((s) => s.setFocusNode);
  const focusNodeId = useDashboardStore((s) => s.focusNodeId);

  const node = graph?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const historyNodes = nodeHistory.map((id) => {
    const n = graph?.nodes.find((gn) => gn.id === id);
    return { id, name: n?.name ?? id };
  });

  if (!node) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface">
        <p className="text-text-muted text-sm">Select a node to see details</p>
      </div>
    );
  }

  const allEdges = graph?.edges ?? [];

  // Backlinks: edges where this node is the target
  const backlinks = allEdges
    .filter((e) => e.target === node.id)
    .map((e) => {
      const sourceNode = graph?.nodes.find((n) => n.id === e.source);
      return { id: e.source, name: sourceNode?.name ?? e.source, type: e.type, node: sourceNode };
    });

  // Outgoing links: edges where this node is the source
  const outgoing = allEdges
    .filter((e) => e.source === node.id)
    .map((e) => {
      const targetNode = graph?.nodes.find((n) => n.id === e.target);
      return { id: e.target, name: targetNode?.name ?? e.target, type: e.type, node: targetNode };
    });

  const typeBadge = typeBadgeColors[node.type] ?? typeBadgeColors.article;
  const meta = node.knowledgeMeta;

  return (
    <div className="h-full w-full overflow-auto p-5 animate-fade-slide-in">
      {/* Navigation history trail */}
      {historyNodes.length > 0 && (
        <div className="mb-3 flex items-center gap-1 flex-wrap">
          <button
            onClick={goBackNode}
            className="text-[10px] font-semibold text-gold hover:text-gold-bright transition-colors flex items-center gap-1"
          >
            <span>&larr;</span>
            <span>Back</span>
          </button>
          <span className="text-text-muted text-[10px]">&vert;</span>
          {historyNodes.slice(-3).map((h, i, arr) => (
            <span key={`${h.id}-${i}`} className="flex items-center gap-1">
              <button
                onClick={() => {
                  const fullIdx = historyNodes.length - arr.length + i;
                  navigateToHistoryIndex(fullIdx);
                }}
                className="text-[10px] text-text-muted hover:text-gold transition-colors truncate max-w-[80px]"
                title={h.name}
              >
                {h.name}
              </button>
              {i < arr.length - 1 && (
                <span className="text-text-muted text-[10px]">&rsaquo;</span>
              )}
            </span>
          ))}
          <span className="text-text-muted text-[10px]">&rsaquo;</span>
          <span className="text-[10px] text-text-primary font-medium truncate max-w-[80px]">
            {node.name}
          </span>
        </div>
      )}

      {/* Type badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${typeBadge}`}
        >
          {node.type}
        </span>
        {/* Entity sub-type tags */}
        {node.type === "entity" && node.tags.length > 0 && (
          <div className="flex gap-1">
            {node.tags
              .filter((t) => ["person", "tool", "paper", "org"].includes(t.toLowerCase()))
              .map((t) => (
                <span
                  key={t}
                  className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded text-accent-dim border border-accent-dim/30 bg-accent-dim/10"
                >
                  {t}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-serif text-text-primary">{node.name}</h2>
        <button
          onClick={() => setFocusNode(focusNodeId === node.id ? null : node.id)}
          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
            focusNodeId === node.id
              ? "bg-gold/20 text-gold border border-gold/40"
              : "text-text-muted border border-border-subtle hover:text-gold hover:border-gold/30"
          }`}
        >
          {focusNodeId === node.id ? "Unfocus" : "Focus"}
        </button>
      </div>

      {/* Summary */}
      <p className="text-sm text-text-secondary mb-4 leading-relaxed">
        {node.summary}
      </p>

      {/* Source URL (for source nodes) */}
      {node.type === "source" && meta?.sourceUrl && (
        <div className="mb-4">
          <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
            Source URL
          </h3>
          <a
            href={meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gold hover:text-gold-bright underline underline-offset-2 break-all transition-colors"
          >
            {meta.sourceUrl}
          </a>
        </div>
      )}

      {/* Confidence score bar (for claim nodes) */}
      {node.type === "claim" && meta?.confidence != null && (
        <div className="mb-4">
          <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
            Confidence
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden border border-border-subtle">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(meta.confidence * 100)}%`,
                  backgroundColor:
                    meta.confidence >= 0.7
                      ? "var(--color-node-function)"
                      : meta.confidence >= 0.4
                        ? "var(--color-accent-dim)"
                        : "#c97070",
                }}
              />
            </div>
            <span className="text-[11px] text-text-secondary font-mono tabular-nums">
              {Math.round(meta.confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Frontmatter (for article nodes) */}
      {node.type === "article" && meta?.frontmatter && Object.keys(meta.frontmatter).length > 0 && (
        <div className="mb-4">
          <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
            Frontmatter
          </h3>
          <div className="bg-elevated rounded-lg border border-border-subtle p-3 space-y-1.5">
            {Object.entries(meta.frontmatter).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[11px]">
                <span className="text-text-muted font-mono shrink-0">{key}:</span>
                <span className="text-text-secondary break-all">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {node.tags.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] glass text-text-secondary px-2.5 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-2">
            Backlinks ({backlinks.length})
          </h3>
          <div className="space-y-1.5">
            {backlinks.map((link, i) => {
              const linkTypeBadge = link.node
                ? typeBadgeColors[link.node.type] ?? typeBadgeColors.article
                : typeBadgeColors.article;
              return (
                <div
                  key={`${link.id}-${i}`}
                  className="text-xs bg-elevated rounded-lg px-3 py-2 border border-border-subtle flex items-center gap-2 cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors"
                  onClick={() => navigateToNode(link.id)}
                >
                  <span className="text-gold font-mono">&larr;</span>
                  {link.node && (
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${linkTypeBadge}`}>
                      {link.node.type}
                    </span>
                  )}
                  <span className="text-text-primary truncate">{link.name}</span>
                  <span className="text-text-muted text-[10px] ml-auto shrink-0">{link.type.replace(/_/g, " ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outgoing links */}
      {outgoing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-2">
            Outgoing Links ({outgoing.length})
          </h3>
          <div className="space-y-1.5">
            {outgoing.map((link, i) => {
              const linkTypeBadge = link.node
                ? typeBadgeColors[link.node.type] ?? typeBadgeColors.article
                : typeBadgeColors.article;
              return (
                <div
                  key={`${link.id}-${i}`}
                  className="text-xs bg-elevated rounded-lg px-3 py-2 border border-border-subtle flex items-center gap-2 cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors"
                  onClick={() => navigateToNode(link.id)}
                >
                  <span className="text-gold font-mono">&rarr;</span>
                  {link.node && (
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${linkTypeBadge}`}>
                      {link.node.type}
                    </span>
                  )}
                  <span className="text-text-primary truncate">{link.name}</span>
                  <span className="text-text-muted text-[10px] ml-auto shrink-0">{link.type.replace(/_/g, " ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Type-specific: articles referencing this entity */}
      {node.type === "entity" && (() => {
        const referencingArticles = allEdges
          .filter((e) => (e.target === node.id || e.source === node.id) && e.type !== "related")
          .map((e) => {
            const otherId = e.source === node.id ? e.target : e.source;
            return graph?.nodes.find((n) => n.id === otherId);
          })
          .filter((n): n is GraphNode => n !== undefined && n.type === "article");
        if (referencingArticles.length === 0) return null;
        return (
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
              Referenced In ({referencingArticles.length})
            </h3>
            <div className="space-y-1">
              {referencingArticles.map((a) => (
                <div
                  key={a.id}
                  className="text-xs bg-elevated rounded-lg px-3 py-2 border border-border-subtle cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors"
                  onClick={() => navigateToNode(a.id)}
                >
                  <span className="text-text-primary">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Type-specific: related entities (for entity nodes) */}
      {node.type === "entity" && (() => {
        const relatedEntities = allEdges
          .filter((e) =>
            (e.source === node.id || e.target === node.id) &&
            (e.type === "related" || e.type === "similar_to"),
          )
          .map((e) => {
            const otherId = e.source === node.id ? e.target : e.source;
            return graph?.nodes.find((n) => n.id === otherId);
          })
          .filter((n): n is GraphNode => n !== undefined && n.type === "entity");
        if (relatedEntities.length === 0) return null;
        return (
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
              Related Entities ({relatedEntities.length})
            </h3>
            <div className="space-y-1">
              {relatedEntities.map((e) => (
                <div
                  key={e.id}
                  className="text-xs bg-elevated rounded-lg px-3 py-2 border border-border-subtle cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors"
                  onClick={() => navigateToNode(e.id)}
                >
                  <span className="text-text-primary">{e.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Type-specific: articles under topic */}
      {node.type === "topic" && (() => {
        const categorizedArticles = allEdges
          .filter((e) => e.type === "categorized_under" && e.target === node.id)
          .map((e) => graph?.nodes.find((n) => n.id === e.source))
          .filter((n): n is GraphNode => n !== undefined);
        if (categorizedArticles.length === 0) return null;
        return (
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
              Articles ({categorizedArticles.length})
            </h3>
            <div className="space-y-1">
              {categorizedArticles.map((a) => (
                <div
                  key={a.id}
                  className="text-xs bg-elevated rounded-lg px-3 py-2 border border-border-subtle cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors"
                  onClick={() => navigateToNode(a.id)}
                >
                  <span className="text-text-primary">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Type-specific: contradicting claims */}
      {node.type === "claim" && (() => {
        const contradictions = allEdges
          .filter((e) =>
            e.type === "contradicts" &&
            (e.source === node.id || e.target === node.id),
          )
          .map((e) => {
            const otherId = e.source === node.id ? e.target : e.source;
            return graph?.nodes.find((n) => n.id === otherId);
          })
          .filter((n): n is GraphNode => n !== undefined);
        if (contradictions.length === 0) return null;
        return (
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2 text-[#c97070]">
              Contradicting Claims ({contradictions.length})
            </h3>
            <div className="space-y-1">
              {contradictions.map((c) => (
                <div
                  key={c.id}
                  className="text-xs bg-elevated rounded-lg px-3 py-2 border border-[#c97070]/30 cursor-pointer hover:border-[#c97070]/60 hover:bg-[#c97070]/5 transition-colors"
                  onClick={() => navigateToNode(c.id)}
                >
                  <span className="text-text-primary">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Type-specific: supporting articles for claims */}
      {node.type === "claim" && (() => {
        const supporting = allEdges
          .filter((e) =>
            (e.type === "cites" || e.type === "builds_on" || e.type === "exemplifies") &&
            (e.source === node.id || e.target === node.id),
          )
          .map((e) => {
            const otherId = e.source === node.id ? e.target : e.source;
            return graph?.nodes.find((n) => n.id === otherId);
          })
          .filter((n): n is GraphNode => n !== undefined && n.type === "article");
        if (supporting.length === 0) return null;
        return (
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
              Supporting Articles ({supporting.length})
            </h3>
            <div className="space-y-1">
              {supporting.map((a) => (
                <div
                  key={a.id}
                  className="text-xs bg-elevated rounded-lg px-3 py-2 border border-border-subtle cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors"
                  onClick={() => navigateToNode(a.id)}
                >
                  <span className="text-text-primary">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Type-specific: articles citing this source */}
      {node.type === "source" && (() => {
        const citingArticles = allEdges
          .filter((e) => e.type === "cites" && e.target === node.id)
          .map((e) => graph?.nodes.find((n) => n.id === e.source))
          .filter((n): n is GraphNode => n !== undefined);
        if (citingArticles.length === 0) return null;
        return (
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
              Cited By ({citingArticles.length})
            </h3>
            <div className="space-y-1">
              {citingArticles.map((a) => (
                <div
                  key={a.id}
                  className="text-xs bg-elevated rounded-lg px-3 py-2 border border-border-subtle cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors"
                  onClick={() => navigateToNode(a.id)}
                >
                  <span className="text-text-primary">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
