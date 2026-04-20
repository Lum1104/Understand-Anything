# Mermaid Service Flowchart Popup — Design

**Date:** 2026-04-20
**Status:** Draft (pending implementation plan)
**Scope:** Understand-Anything dashboard · Domain view

---

## Summary

When a user clicks a `domain` node in the Domain graph, a small 480×260 popup slides up from the bottom-center of the graph area rendering a Mermaid flowchart of the domain's internal business logic. The popup has a fullscreen button and a close button in its top-right corner; the fullscreen modal supports source copy and an "Open in Mermaid Live" external link. Mermaid source is generated offline by the `domain-analyzer` agent and persisted to `knowledge-graph.json`. The dashboard is a pure renderer — no runtime LLM calls.

## Goals

- Let engineers drill from "where does this concept live" to "how does it actually work" without leaving the dashboard
- Make domain-level business logic reviewable in one glance (flowchart with API labels on edges)
- Zero runtime LLM cost: diagrams are generated offline and stored in the knowledge graph
- No regression to existing Domain / Structural / Knowledge views

## Non-Goals

- Flowcharts for `flow` or `step` node types (too granular; domain-level is the right abstraction)
- Flowcharts for Structural or Knowledge view nodes
- Multiple Mermaid diagram types (`sequenceDiagram`, `classDiagram`, etc.) — only `flowchart TD` in v1
- Runtime LLM regeneration of Mermaid from a "refresh" button
- Pan/zoom inside the fullscreen modal (rely on browser scroll + container `overflow: auto`)
- Visual regression testing infrastructure (Chromatic, Percy)

---

## Architecture & Data Flow

```
/understand-domain
   └─► domain-analyzer agent
         ├─ extracts business domains / flows / steps
         └─ for each domain node, emits Mermaid flowchart source
            (nodes = logical steps; arrows labeled with API calls where applicable)
         ▼
   .understand-anything/intermediate/domain-analysis.json
         ▼
   merge-batch-graphs.py  (existing; preserves unknown fields)
         ▼
   assemble-reviewer agent
         ├─ schema validation (incl. mermaid field non-empty string if present)
         └─ mermaid.parse() dry-run in Node — on error, delete field + log
         ▼
   graph-reviewer agent  (inline by default)
         ▼
   .understand-anything/knowledge-graph.json
       nodes[*].domainMeta.mermaid?: string
         ▼
Dashboard (packages/dashboard)
   └─ Domain view → user clicks domain node
         ▼
   MermaidFlowchartPopup (lazy-imports mermaid)
       ├─ on success:        render SVG
       ├─ on missing field:  empty state + "re-run /understand --full"
       └─ on parse failure:  <pre> source fallback + Copy button
```

**Invariants:**
- Dashboard imports from `core` only via browser-safe subpaths (`./schema`, `./types`, `./search`)
- `mermaid` npm package is lazy-imported on first popup open; excluded from main bundle
- No network requests at runtime except the user-initiated "Open in Mermaid Live" external link
- Structural and Knowledge views are untouched

---

## Schema & Data Model

### Node extension (`packages/core/src/types.ts`)

```typescript
export interface DomainMeta {
  entities?: string[];
  businessRules?: string[];
  crossDomainInteractions?: string[];
  entryPoint?: string;
  entryType?: "http" | "cli" | "event" | "cron" | "manual";
  mermaid?: string;   // NEW: Mermaid flowchart source for this domain
}
```

### Schema validation (`packages/core/src/schema.ts`)

Add to `DomainMetaSchema`:

```typescript
mermaid: z.string().min(1).optional()
```

- `optional` — historical data without the field must validate
- `min(1)` — if present, must not be an empty string
- `sanitizeGraph()` / `autoFixGraph()` need no changes (they pass optional fields through)

### Persisted shape

```json
{
  "id": "domain-checkout-ordering",
  "type": "domain",
  "name": "Checkout and Ordering",
  "summary": "...",
  "domainMeta": {
    "entities": ["Order", "OrderResult"],
    "businessRules": ["..."],
    "mermaid": "flowchart TD\n  A[Cart Retrieval] -->|GET /cart| B[Product Lookup]\n  ..."
  }
}
```

---

## Agent Changes

### `understand-anything-plugin/agents/domain-analyzer.md`

Append a Mermaid generation section to the agent prompt:

> For each `domain` node produced, also emit `domainMeta.mermaid` — a Mermaid `flowchart TD` source string representing the internal business logic of that domain. Rules:
> - Each logical step/component in the domain is a flowchart node (e.g. "Cart Retrieval", "Currency Convert", "Payment Charge")
> - Edges represent control/data flow between steps
> - **When an edge corresponds to an API call, label the arrow with the API** using `|METHOD /path|` syntax (e.g. `A -->|POST /charge| B`)
> - Keep node labels concise (≤40 chars); use `[...]` for process nodes, `{...}` for decisions
> - 5–15 nodes per domain; if more, group related steps into subgraphs
> - Output valid Mermaid syntax — will be dry-run parsed before commit

### `understand-anything-plugin/agents/assemble-reviewer.md`

Append a Mermaid validation step:

> After schema validation, for every node with `domainMeta.mermaid`, dry-run-parse the source. Implementation: the agent uses the Bash tool to run a small Node one-liner (`node -e "require('mermaid').parse(...)"`) or a dedicated script added at `understand-anything-plugin/scripts/validate-mermaid.mjs`. On parse error, **delete that node's `mermaid` field** (do not abort the whole assembly) and log `[mermaid-invalid] <node.id>: <error>` to `.understand-anything/intermediate/mermaid-errors.log`. Continue processing remaining nodes.

This guarantees `knowledge-graph.json` cannot carry broken Mermaid sources into the dashboard.

---

## Dashboard Implementation

### File layout

```
packages/dashboard/src/
  components/
    MermaidFlowchartPopup.tsx        NEW  (480×260 slide-up)
    MermaidFlowchartModal.tsx        NEW  (fullscreen modal)
    MermaidRenderer.tsx              NEW  (shared source-to-SVG)
    DomainClusterNode.tsx            EDIT (trigger popup on click)
    DomainGraphView.tsx              EDIT (mount popup portal)
  store.ts                           EDIT (popup + modal state)
  hooks/
    useMermaidPopupPosition.ts       NEW  (collision-avoiding position hook)
  themes/
    mermaid-theme.ts                 NEW  (CSS-vars → Mermaid themeVariables)
```

### Store extension (`store.ts`)

```typescript
interface MermaidPopupSlice {
  mermaidPopupNodeId: string | null;
  mermaidModalOpen: boolean;
  openMermaidPopup: (nodeId: string) => void;
  closeMermaidPopup: () => void;
  openMermaidModal: () => void;
  closeMermaidModal: () => void;
}
```

- Clicking a `domain` node calls both `selectNode(id)` (existing) and `openMermaidPopup(id)` (new)
- Rapid clicks between nodes replace `mermaidPopupNodeId` in place (no multiple popups)
- Switching view mode (`setViewMode`) auto-calls `closeMermaidPopup()`

### `MermaidFlowchartPopup.tsx`

Layout:

```
┌─────────────────────────────────────┐ 480 × 260
│ Checkout and Ordering       ⤢  ✕   │  header
├─────────────────────────────────────┤
│        [Mermaid SVG rendered]       │  body, overflow: auto
└─────────────────────────────────────┘
```

- Positioned via React Portal to a graph-container overlay div (fixed within container)
- Background `var(--color-elevated)`, border `1px solid var(--color-border-subtle)`, shadow `var(--shadow-xl)`
- Enter animation: `translateY(100%) → 0`, 300ms ease-out
- Body content comes from `<MermaidRenderer source={node.domainMeta.mermaid} />`
- ⤢ button → `openMermaidModal()`
- ✕ button → `closeMermaidPopup()`
- Esc does **not** close the popup (Esc only closes the modal — distinct behaviors)

### `useMermaidPopupPosition.ts`

Candidate position sequence:

1. Bottom-center
2. Bottom-center offset −80px horizontally
3. Bottom-center offset +80px horizontally
4. Bottom-left (`margin: 16`)
5. Bottom-right (`margin: 16`)

Pick the first candidate whose AABB does not intersect any visible node's on-screen bounding box (derived via `useReactFlow().flowToScreenPosition()`). If all candidates collide, fall back to bottom-center and accept overlap.

Viewport changes (pan/zoom) re-run the check, throttled to `requestAnimationFrame`.

### `MermaidRenderer.tsx`

```typescript
export function MermaidRenderer({ source }: { source: string }) {
  // state: loading | ok(svg) | err(message)
  useEffect(() => {
    const mermaid = (await import('mermaid')).default;   // LAZY
    mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: getMermaidTheme() });
    try {
      const id = `m-${crypto.randomUUID()}`;
      const { svg } = await mermaid.render(id, source);
      setState({ kind: 'ok', svg });
    } catch (e) {
      setState({ kind: 'err', msg: String(e) });
    }
  }, [source]);
  ...
}
```

- Lazy-import prevents the ~400KB mermaid dep from entering the main bundle
- Parse error → fallback to `<pre>` source + Copy button (see Error Handling)
- Chunk load error → retry button

### `MermaidFlowchartModal.tsx`

- Portal to `document.body`, full viewport, backdrop `rgba(0,0,0,0.8)`
- Contents: centered SVG (same renderer, re-rendered at larger container size), actions top-right
- Actions:
  - 📋 **Copy source** — `navigator.clipboard.writeText(source)`, toast on success
  - 🔗 **Open in Mermaid Live** — `https://mermaid.live/edit#pako:${pakoBase64(source)}` (deflate-base64url per Mermaid Live's format)
  - ✕ Close
- Close via Esc (keydown listener mounted while open) or ✕ button. No click-outside-to-close.
- Container `overflow: auto` lets large diagrams scroll; no pan/zoom library in v1

### Theme integration (`themes/mermaid-theme.ts`)

```typescript
export function getMermaidTheme() {
  const style = getComputedStyle(document.documentElement);
  const read = (v: string) => style.getPropertyValue(v).trim();
  return {
    background: read('--color-elevated'),
    primaryColor: read('--color-accent-dim'),
    primaryBorderColor: read('--color-accent'),
    primaryTextColor: read('--color-text-primary'),
    lineColor: read('--color-accent-dim'),
    secondaryColor: read('--color-surface'),
    tertiaryColor: read('--color-root'),
    edgeLabelBackground: read('--color-elevated'),
    mainBkg: read('--color-elevated'),
    fontFamily: read('--font-sans'),   // 复用现有 CSS 变量
    fontSize: '14px',
  };
}
```

- Subscribe to `theme-engine`'s change event; on change, bump a store version counter that `MermaidRenderer` uses as an effect dep → re-render with new theme
- Mermaid's fontFamily reads from the existing `--font-sans` CSS variable (Inter) rather than the serif header font; readability at small flowchart-node sizes is better with a sans-serif

---

## Error Handling

| Failure | Detection | User-facing behavior | Dev-facing signal |
|---|---|---|---|
| Node missing `mermaid` field | `node.domainMeta?.mermaid` is falsy | Popup opens; body shows "No detailed diagram yet. Re-run `/understand --full` to generate the flowchart." ⤢ button disabled with tooltip "Nothing to enlarge" | None |
| Mermaid parse error | `mermaid.render()` throws | "⚠ Diagram render failed. Showing source instead." + `<pre>` source + [Copy source] button | `console.warn("[mermaid-parse-error] " + err.message)` |
| `mermaid` chunk load error | `await import('mermaid')` throws `ChunkLoadError` | "⚠ Failed to load diagram library. Check your network and retry." + [Retry] button | Default Vite chunk-error behavior |

**Edge cases handled:**

- Rapid clicks across domain nodes → `mermaidPopupNodeId` replaced in place
- View switch while popup open → auto-close
- ReactFlow viewport changes → position recomputed, rAF-throttled
- Modal Esc listener → mounted only while modal is open
- Extremely long Mermaid source (>50KB) → trusted from agent pipeline; dashboard does not enforce a length cap
- Multiple dashboard tabs → each has its own Zustand store, no cross-tab coupling

---

## Testing Strategy

Three layers, all using Vitest (existing setup).

### Schema contract (`packages/core/tests/schema.mermaid.test.ts`)

- Valid graph with `domainMeta.mermaid` — passes
- Empty string `mermaid` — rejected
- Missing `mermaid` — passes (optional)
- `sanitizeGraph()` preserves the field

### Component tests (`packages/dashboard/src/components/__tests__/`)

**`MermaidRenderer.test.tsx`**
- Valid source → rendered SVG in DOM
- Invalid source (mocked `mermaid.render` rejection) → `<pre>` + Copy button
- Mocked `import('mermaid')` throwing `ChunkLoadError` → Retry UI

**`MermaidFlowchartPopup.test.tsx`**
- No `domainMeta.mermaid` → empty-state text + ⤢ disabled
- Header shows `node.name`
- Esc keydown does **not** close the popup (only the modal)

### Hook test (`hooks/__tests__/useMermaidPopupPosition.test.ts`)

- No nodes → bottom-center returned
- Only bottom-center occupied → returns offset −80
- All five candidates occupied → falls back to bottom-center
- `useReactFlow` viewport change triggers recomputation

### Deliberately out of scope

- Visual correctness of mermaid-rendered SVGs (trust mermaid.js)
- LLM output quality (handled by agent prompt + assemble-reviewer dry-run)
- Screenshot / visual regression (no existing infra in project)

### Manual acceptance (run once before shipping)

1. Run `/understand --full` on `microservices-demo` sample
2. Open `/understand-dashboard`, switch to Domain view
3. Click "Checkout and Ordering" → popup slides up from bottom-center
4. Verify flowchart renders, API labels visible on arrows
5. Click ⤢ → modal opens; verify Copy source + Open in Mermaid Live work
6. Press Esc → modal closes, popup remains
7. Click ✕ on popup → popup closes
8. Hand-edit knowledge-graph.json to remove `mermaid` from one domain → reload → verify empty state
9. Hand-edit knowledge-graph.json to corrupt Mermaid syntax → reload → verify `<pre>` fallback
10. Switch to Structural view while popup open → verify popup auto-closes
11. Inspect Vite build output → verify `mermaid` is in a lazy chunk, not main

---

## Open questions

None at design freeze.

## Rollout

- Ship in a single release (no feature flag) — additive to existing Domain view
- Version bump across all four files per `CLAUDE.md` versioning section
- Bump is a minor version (new feature, no breaking change)
- No migration needed: missing `mermaid` fields on existing graphs fall back gracefully

## References

- Issue: inline in brainstorming transcript (2026-04-20)
- Related source files enumerated in "Dashboard Implementation" above
- `CLAUDE.md` §Gotchas: browser-safe imports from `core`
- `CLAUDE.md` §Versioning: four files to sync
