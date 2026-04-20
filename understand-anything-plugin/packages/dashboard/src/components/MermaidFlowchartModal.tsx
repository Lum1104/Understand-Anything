import { useEffect } from "react";
import { createPortal } from "react-dom";
import pako from "pako";
import { useDashboardStore } from "../store.js";
import { MermaidRenderer } from "./MermaidRenderer.js";

function toPakoBase64(source: string): string {
  const data = pako.deflate(new TextEncoder().encode(source), { level: 9 });
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildLiveUrl(source: string): string {
  const state = {
    code: source,
    mermaid: { theme: "dark" },
    autoSync: true,
    updateDiagram: true,
  };
  const encoded = toPakoBase64(JSON.stringify(state));
  return `https://mermaid.live/edit#pako:${encoded}`;
}

export function MermaidFlowchartModal() {
  const open = useDashboardStore((s) => s.mermaidModalOpen);
  const nodeId = useDashboardStore((s) => s.mermaidPopupNodeId);
  const graph = useDashboardStore((s) => s.domainGraph);
  const close = useDashboardStore((s) => s.closeMermaidModal);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || !nodeId || !graph) return null;
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node?.domainMeta?.mermaid) return null;

  const source = node.domainMeta.mermaid;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-label={`Enlarged flowchart for ${node.name}`}
    >
      <div
        data-testid="mermaid-modal-backdrop"
        className="absolute inset-0 bg-black/80"
      />
      <div className="relative w-[90vw] h-[90vh] max-w-6xl rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-elevated)] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-subtle)]">
          <span className="text-base font-medium text-[var(--color-text-primary)] truncate">
            {node.name}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Copy source"
              className="px-3 py-1 rounded border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 text-xs"
              onClick={() => navigator.clipboard?.writeText(source)}
            >
              📋 Copy source
            </button>
            <a
              aria-label="Open in Mermaid Live"
              className="px-3 py-1 rounded border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 text-xs"
              href={buildLiveUrl(source)}
              target="_blank"
              rel="noopener noreferrer"
            >
              🔗 Open in Mermaid Live
            </a>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)]/10"
            >
              ✕
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-[var(--color-root)]">
          <MermaidRenderer source={source} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
