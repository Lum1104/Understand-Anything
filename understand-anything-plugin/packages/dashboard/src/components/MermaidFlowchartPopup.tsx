import { useEffect, useRef, useState } from "react";
import { useDashboardStore } from "../store.js";
import { MermaidRenderer } from "./MermaidRenderer.js";
import { useMermaidPopupPosition } from "../hooks/useMermaidPopupPosition.js";

const POPUP_W = 480;
const POPUP_H = 260;

export function MermaidFlowchartPopup() {
  const nodeId = useDashboardStore((s) => s.mermaidPopupNodeId);
  const graph = useDashboardStore((s) => s.domainGraph);
  const closePopup = useDashboardStore((s) => s.closeMermaidPopup);
  const openModal = useDashboardStore((s) => s.openMermaidModal);

  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const update = () =>
      setBounds({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nodeId]);

  const position = useMermaidPopupPosition(POPUP_W, POPUP_H, bounds);

  if (!nodeId || !graph) return null;
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const mermaidSource = node.domainMeta?.mermaid;

  return (
    <div
      ref={containerRef}
      className="absolute z-40 flex flex-col rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-elevated)] shadow-2xl"
      style={{
        width: POPUP_W,
        height: POPUP_H,
        left: position.x,
        bottom: position.y,
        animation: "mermaid-popup-slide-up 300ms ease-out",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Flowchart for ${node.name}`}
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-subtle)]">
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {node.name}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Enlarge"
            disabled={!mermaidSource}
            title={mermaidSource ? "Enlarge" : "Nothing to enlarge"}
            onClick={openModal}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <EnlargeIcon />
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={closePopup}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)]/10"
          >
            <CloseIcon />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto">
        {mermaidSource ? (
          <MermaidRenderer source={mermaidSource} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
      <p className="text-sm text-[var(--color-text-primary)]">
        No detailed diagram yet
      </p>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Re-run{" "}
        <code className="font-mono text-[var(--color-accent)]">
          /understand --full
        </code>{" "}
        to generate the flowchart.
      </p>
    </div>
  );
}

function EnlargeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2h4v4" />
      <path d="M6 14H2v-4" />
      <path d="M14 2L9 7" />
      <path d="M2 14l5-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l8 8" />
      <path d="M12 4l-8 8" />
    </svg>
  );
}
