import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getMermaidTheme } from "../themes/mermaid-theme.js";
import { onThemeChange } from "../themes/theme-engine.js";

function PanZoomScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input")) return;
    const el = ref.current;
    if (!el) return;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag.current || !ref.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    ref.current.scrollLeft = drag.current.scrollLeft - dx;
    ref.current.scrollTop = drag.current.scrollTop - dy;
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    if (ref.current) ref.current.style.cursor = "grab";
  };

  return (
    <div
      ref={ref}
      className="h-full w-full overflow-auto p-4 select-none"
      style={{ cursor: "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      {children}
    </div>
  );
}

type RenderState =
  | { kind: "loading" }
  | { kind: "ok"; svg: string }
  | { kind: "err"; msg: string }
  | { kind: "chunk-err" };

interface Props {
  source: string;
}

export function MermaidRenderer({ source }: Props) {
  const [state, setState] = useState<RenderState>({ kind: "loading" });
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => onThemeChange(() => setThemeVersion((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      let mermaid;
      try {
        mermaid = (await import("mermaid")).default;
      } catch {
        if (!cancelled) setState({ kind: "chunk-err" });
        return;
      }
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: getMermaidTheme() as unknown as Record<string, string>,
        flowchart: {
          padding: 8,
          nodeSpacing: 32,
          rankSpacing: 40,
          curve: "basis",
          htmlLabels: true,
          useMaxWidth: false,
        },
      });
      try {
        const id = `m-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, source);
        if (!cancelled) setState({ kind: "ok", svg });
      } catch (err) {
        if (!cancelled) setState({ kind: "err", msg: String((err as Error)?.message ?? err) });
        console.warn("[mermaid-parse-error]", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, themeVersion]);

  if (state.kind === "loading") {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
        <span className="text-sm">Loading diagram…</span>
      </div>
    );
  }

  if (state.kind === "chunk-err") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
        <p className="text-sm text-[var(--color-text-primary)]">
          ⚠ Failed to load diagram library
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Check your network and retry.
        </p>
        <button
          className="mt-2 px-3 py-1 rounded border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
          onClick={() => {
            setState({ kind: "loading" });
            setThemeVersion((v) => v + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.kind === "err") {
    return (
      <div className="flex flex-col gap-2 p-3 overflow-auto h-full">
        <p className="text-xs text-[var(--color-accent)]">
          ⚠ Diagram render failed. Showing source instead.
        </p>
        <pre className="flex-1 overflow-auto text-xs font-mono p-2 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded">
          {source}
        </pre>
        <button
          className="self-end px-3 py-1 rounded border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 text-xs"
          onClick={() => navigator.clipboard?.writeText(source)}
        >
          Copy source
        </button>
      </div>
    );
  }

  return (
    <PanZoomScroll>
      <div
        className="inline-block"
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    </PanZoomScroll>
  );
}
