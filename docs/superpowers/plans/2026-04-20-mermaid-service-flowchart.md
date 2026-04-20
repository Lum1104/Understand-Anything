# Mermaid Service Flowchart Popup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user clicks a `domain` node in the Domain graph, render a 480×260 slide-up popup showing a Mermaid flowchart of that domain's internal business logic, with a fullscreen modal for enlargement. Source is generated offline by the agent pipeline and persisted in the knowledge graph.

**Architecture:** Schema extension on `DomainMeta.mermaid` (optional string). Agent pipeline (`domain-analyzer` + `assemble-reviewer`) generates and validates the source. Dashboard lazily loads `mermaid` npm package on first popup open, renders via a shared `MermaidRenderer` component, with a 5-candidate collision-avoiding position hook for the popup. Fullscreen modal uses React Portal. No runtime LLM calls.

**Tech Stack:** TypeScript 5, React 19, Zustand 5, `mermaid` 10.x (lazy), Vitest 3, `@testing-library/react`, `jsdom`. Package layout: `packages/core` (schema), `packages/dashboard` (UI), `understand-anything-plugin/agents/*.md` (agent prompts), `understand-anything-plugin/scripts/*.mjs` (validation utilities).

**Reference spec:** [`docs/superpowers/specs/2026-04-20-mermaid-service-flowchart-design.md`](../specs/2026-04-20-mermaid-service-flowchart-design.md)

---

## File Structure

**Create:**
- `understand-anything-plugin/scripts/validate-mermaid.mjs` — Node CLI for dry-run Mermaid parsing
- `understand-anything-plugin/packages/dashboard/vitest.config.ts` — test runner config
- `understand-anything-plugin/packages/dashboard/src/test/setup.ts` — JSDOM test setup
- `understand-anything-plugin/packages/dashboard/src/themes/mermaid-theme.ts` — CSS-vars → Mermaid themeVariables
- `understand-anything-plugin/packages/dashboard/src/components/MermaidRenderer.tsx` — shared source→SVG renderer
- `understand-anything-plugin/packages/dashboard/src/components/MermaidFlowchartPopup.tsx` — 480×260 slide-up
- `understand-anything-plugin/packages/dashboard/src/components/MermaidFlowchartModal.tsx` — fullscreen modal
- `understand-anything-plugin/packages/dashboard/src/hooks/useMermaidPopupPosition.ts` — 5-candidate collision hook
- `understand-anything-plugin/packages/dashboard/src/components/__tests__/*.test.tsx` — component tests
- `understand-anything-plugin/packages/dashboard/src/hooks/__tests__/useMermaidPopupPosition.test.ts` — hook test
- `understand-anything-plugin/packages/core/src/__tests__/schema.mermaid.test.ts` — schema contract test

**Modify:**
- `understand-anything-plugin/packages/core/src/types.ts` — add `mermaid?: string` to `DomainMeta`
- `understand-anything-plugin/packages/core/src/schema.ts` — add `mermaid` to `DomainMetaSchema`
- `understand-anything-plugin/packages/dashboard/package.json` — add deps + test script
- `understand-anything-plugin/packages/dashboard/src/store.ts` — add `MermaidPopupSlice`
- `understand-anything-plugin/packages/dashboard/src/themes/theme-engine.ts` — emit change event
- `understand-anything-plugin/packages/dashboard/src/components/DomainClusterNode.tsx` — trigger popup on click
- `understand-anything-plugin/packages/dashboard/src/components/DomainGraphView.tsx` — mount popup + modal
- `understand-anything-plugin/agents/domain-analyzer.md` — Mermaid generation rules
- `understand-anything-plugin/agents/assemble-reviewer.md` — dry-run validation step

---

## Pre-flight Check

Before starting, run these commands from the project root and record the output.

- [ ] **Run:** `cd understand-anything-plugin && pnpm --filter @understand-anything/core test` — Expect: all passing, establishes baseline
- [ ] **Run:** `cd understand-anything-plugin && pnpm --filter @understand-anything/core build` — Expect: success
- [ ] **Run:** `git status --short` — Expect: clean working tree (or only the spec from brainstorming)

---

## Phase A: Core Schema Extension

### Task 1: Add `DomainMeta.mermaid` field to types and schema

**Files:**
- Create: `understand-anything-plugin/packages/core/src/__tests__/schema.mermaid.test.ts`
- Modify: `understand-anything-plugin/packages/core/src/types.ts` (interface `DomainMeta`, around line 30–50)
- Modify: `understand-anything-plugin/packages/core/src/schema.ts:353-359` (`DomainMetaSchema`)

- [ ] **Step 1: Write failing schema test**

Create `understand-anything-plugin/packages/core/src/__tests__/schema.mermaid.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateGraph } from "../schema.js";

function graphWith(domainMeta: Record<string, unknown>) {
  return {
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
```

- [ ] **Step 2: Run the test, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/core test -- schema.mermaid`
Expected: FAIL on "rejects an empty mermaid string" (current schema has no such field, so empty string passes via passthrough).

- [ ] **Step 3: Update TypeScript interface**

Open `understand-anything-plugin/packages/core/src/types.ts` and locate the `DomainMeta` interface. Add the `mermaid` field:

```typescript
export interface DomainMeta {
  entities?: string[];
  businessRules?: string[];
  crossDomainInteractions?: string[];
  entryPoint?: string;
  entryType?: "http" | "cli" | "event" | "cron" | "manual";
  mermaid?: string;
}
```

- [ ] **Step 4: Update Zod schema**

Open `understand-anything-plugin/packages/core/src/schema.ts:353-359` and add the `mermaid` field to `DomainMetaSchema`:

```typescript
const DomainMetaSchema = z.object({
  entities: z.array(z.string()).optional(),
  businessRules: z.array(z.string()).optional(),
  crossDomainInteractions: z.array(z.string()).optional(),
  entryPoint: z.string().optional(),
  entryType: z.enum(["http", "cli", "event", "cron", "manual"]).optional(),
  mermaid: z.string().min(1).optional(),
}).passthrough();
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/core test -- schema.mermaid`
Expected: PASS all 4 cases.

- [ ] **Step 6: Run the full core test suite, confirm no regressions**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/core test`
Expected: all passing.

- [ ] **Step 7: Commit**

```bash
git add understand-anything-plugin/packages/core/src/types.ts \
        understand-anything-plugin/packages/core/src/schema.ts \
        understand-anything-plugin/packages/core/src/__tests__/schema.mermaid.test.ts
git commit -m "feat(core): add optional DomainMeta.mermaid field to schema"
```

---

### Task 2: Verify `sanitizeGraph` preserves `mermaid` field

**Files:**
- Modify: `understand-anything-plugin/packages/core/src/__tests__/schema.mermaid.test.ts`

Context: The spec says `sanitizeGraph()` / `autoFixGraph()` must pass through the new field. Verify by test (no implementation change expected because of `.passthrough()`).

- [ ] **Step 1: Add a preservation test case**

Append to `schema.mermaid.test.ts`:

```typescript
import { sanitizeGraph } from "../schema.js";

describe("sanitizeGraph preserves mermaid", () => {
  it("keeps a valid mermaid source through sanitization", () => {
    const g = graphWith({ mermaid: "flowchart TD\n  A --> B" });
    const cleaned = sanitizeGraph(g as never);
    expect(cleaned.nodes[0].domainMeta?.mermaid).toBe("flowchart TD\n  A --> B");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/core test -- schema.mermaid`
Expected: PASS (no code change needed; `.passthrough()` preserves the field).

- [ ] **Step 3: Commit**

```bash
git add understand-anything-plugin/packages/core/src/__tests__/schema.mermaid.test.ts
git commit -m "test(core): verify sanitizeGraph preserves DomainMeta.mermaid"
```

---

## Phase B: Mermaid Validation Utility

### Task 3: Create `validate-mermaid.mjs` CLI

**Files:**
- Create: `understand-anything-plugin/scripts/validate-mermaid.mjs`

Context: Used by the `assemble-reviewer` agent to dry-run parse Mermaid sources before writing them to `knowledge-graph.json`. Reads JSON from stdin (`{ "id": "...", "source": "..." }` per line) and writes JSON to stdout (`{ "id": "...", "ok": true | false, "error": "..." }`).

- [ ] **Step 1: Add mermaid as a plugin-level devDependency**

Open `understand-anything-plugin/package.json` and add to `devDependencies` (or `dependencies` if devDependencies missing):

```json
"mermaid": "^10.9.0"
```

- [ ] **Step 2: Install the dependency**

Run: `cd understand-anything-plugin && pnpm install`
Expected: lockfile updated, `node_modules/mermaid` populated.

- [ ] **Step 3: Write the script**

Create `understand-anything-plugin/scripts/validate-mermaid.mjs`:

```javascript
#!/usr/bin/env node
// Reads JSONL on stdin: { "id": string, "source": string } per line.
// Writes JSONL on stdout: { "id": string, "ok": boolean, "error"?: string } per line.
// Exit code 0 regardless of parse failures — the caller inspects the output lines.

import { createInterface } from "node:readline";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false });

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ id: null, ok: false, error: `invalid-json: ${err.message}` }) + "\n",
    );
    continue;
  }
  const { id, source } = payload;
  try {
    await mermaid.parse(source);
    process.stdout.write(JSON.stringify({ id, ok: true }) + "\n");
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ id, ok: false, error: String(err?.message ?? err) }) + "\n",
    );
  }
}
```

Then make executable: `chmod +x understand-anything-plugin/scripts/validate-mermaid.mjs`.

- [ ] **Step 4: Manually test with a valid sample**

Run from project root:

```bash
echo '{"id":"d1","source":"flowchart TD\n  A --> B"}' | node understand-anything-plugin/scripts/validate-mermaid.mjs
```

Expected output: `{"id":"d1","ok":true}`

- [ ] **Step 5: Manually test with an invalid sample**

Run:

```bash
echo '{"id":"d2","source":"flowchart TD\n  A --> $$invalid"}' | node understand-anything-plugin/scripts/validate-mermaid.mjs
```

Expected output: `{"id":"d2","ok":false,"error":"..."}` (`ok` is `false`, `error` contains a parse message).

- [ ] **Step 6: Commit**

```bash
git add understand-anything-plugin/scripts/validate-mermaid.mjs \
        understand-anything-plugin/package.json \
        understand-anything-plugin/pnpm-lock.yaml
git commit -m "feat(plugin): add validate-mermaid.mjs dry-run parser script"
```

---

## Phase C: Agent Prompt Changes

### Task 4: Extend `domain-analyzer.md` with Mermaid generation rules

**Files:**
- Modify: `understand-anything-plugin/agents/domain-analyzer.md`

- [ ] **Step 1: Read the current file structure**

Open `understand-anything-plugin/agents/domain-analyzer.md` and identify:
- The section describing the intermediate JSON output shape (listing fields on `domain` nodes)
- A natural insertion point after the `domainMeta` description

- [ ] **Step 2: Append Mermaid generation rules to the agent prompt**

Insert a new section titled `### Mermaid flowchart generation` (placement: immediately after the `domainMeta` description; if no such section exists, place at the end of the "Output" / "Node types" section):

```markdown
### Mermaid flowchart generation

For each `domain` node you produce, also emit `domainMeta.mermaid` — a Mermaid `flowchart TD` source string representing the internal business logic of that domain. Rules:

- Each logical step or component in the domain is a flowchart node (e.g. "Cart Retrieval", "Currency Convert", "Payment Charge").
- Edges represent control or data flow between steps.
- **When an edge corresponds to an API call, label the arrow with the API** using `|METHOD /path|` syntax (e.g. `A -->|POST /charge| B`).
- Keep node labels concise (≤40 characters); use `[...]` for process nodes and `{...}` for decisions.
- Target 5–15 nodes per domain; if more, group related steps into Mermaid subgraphs.
- Output valid Mermaid syntax — it will be dry-run parsed by `scripts/validate-mermaid.mjs` before commit; invalid sources will be stripped.

Example:

\`\`\`
flowchart TD
  A[Cart Retrieval] -->|GET /cart| B[Product Lookup]
  B -->|GET /products/:id| C[Currency Convert]
  C -->|POST /currency/convert| D[Shipping Quote]
  D -->|POST /shipping/quote| E[Payment Charge]
  E -->|POST /charge| F[Email Confirmation]
\`\`\`

Emit the source as a JSON string (newlines escaped as `\n`). Place under the domain node's `domainMeta.mermaid`. Do NOT emit for `flow` or `step` nodes — only for `domain` nodes.
```

- [ ] **Step 3: Commit**

```bash
git add understand-anything-plugin/agents/domain-analyzer.md
git commit -m "feat(agents): instruct domain-analyzer to emit Mermaid flowcharts"
```

---

### Task 5: Extend `assemble-reviewer.md` with Mermaid dry-run step

**Files:**
- Modify: `understand-anything-plugin/agents/assemble-reviewer.md`

- [ ] **Step 1: Add a validation step**

Open `understand-anything-plugin/agents/assemble-reviewer.md` and append (after the existing schema validation step) a new step:

```markdown
### Step: Mermaid dry-run validation

After schema validation, for every node in the assembled graph with a non-empty `domainMeta.mermaid` field, dry-run-parse the source to ensure it is valid Mermaid syntax.

Implementation:

1. Collect all nodes with `domainMeta.mermaid` into a JSONL stream where each line is `{"id": "<node.id>", "source": "<mermaid source>"}`.
2. Pipe the stream to `node understand-anything-plugin/scripts/validate-mermaid.mjs`.
3. Read the JSONL output. For every line where `ok === false`:
   - Remove the `mermaid` field from that node in the assembled graph (do NOT abort the whole assembly).
   - Append a log line `[mermaid-invalid] <id>: <error>` to `.understand-anything/intermediate/mermaid-errors.log`.
4. Continue with remaining reviewer steps.

Example Bash invocation:

\`\`\`bash
jq -c '.nodes[] | select(.domainMeta.mermaid != null) | {id: .id, source: .domainMeta.mermaid}' \
  .understand-anything/intermediate/assembled-graph.json \
  | node understand-anything-plugin/scripts/validate-mermaid.mjs \
  > .understand-anything/intermediate/mermaid-validation.jsonl
\`\`\`

Then process `mermaid-validation.jsonl` with a follow-up jq/node step to strip invalid entries and produce `mermaid-errors.log`.
```

- [ ] **Step 2: Commit**

```bash
git add understand-anything-plugin/agents/assemble-reviewer.md
git commit -m "feat(agents): assemble-reviewer dry-run validates Mermaid sources"
```

---

## Phase D: Dashboard Test Infrastructure + Mermaid Dependency

### Task 6: Add Vitest + testing-library to dashboard

**Files:**
- Modify: `understand-anything-plugin/packages/dashboard/package.json`
- Create: `understand-anything-plugin/packages/dashboard/vitest.config.ts`
- Create: `understand-anything-plugin/packages/dashboard/src/test/setup.ts`

Context: The dashboard currently has no test runner. We add Vitest + JSDOM + `@testing-library/react` for component and hook tests.

- [ ] **Step 1: Add dev dependencies to `packages/dashboard/package.json`**

Add to `devDependencies`:

```json
"vitest": "^3.1.0",
"jsdom": "^25.0.0",
"@testing-library/react": "^16.1.0",
"@testing-library/jest-dom": "^6.6.0",
"@testing-library/user-event": "^14.5.0",
"@vitest/ui": "^3.1.0",
"@vitejs/plugin-react": "^4.3.0"
```

Add to `dependencies`:

```json
"mermaid": "^10.9.0"
```

Add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Install**

Run: `cd understand-anything-plugin && pnpm install`
Expected: lockfile updated.

- [ ] **Step 3: Create Vitest config**

Create `understand-anything-plugin/packages/dashboard/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 4: Create test setup file**

Create `understand-anything-plugin/packages/dashboard/src/test/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      matches: false,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

if (!("randomUUID" in crypto)) {
  Object.defineProperty(crypto, "randomUUID", {
    value: () =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
  });
}
```

- [ ] **Step 5: Smoke test the setup**

Create `understand-anything-plugin/packages/dashboard/src/test/smoke.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("test infrastructure smoke", () => {
  it("renders and queries the DOM", () => {
    render(<div>hello world</div>);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test`
Expected: 1 test, PASS.

- [ ] **Step 7: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/package.json \
        understand-anything-plugin/packages/dashboard/vitest.config.ts \
        understand-anything-plugin/packages/dashboard/src/test/setup.ts \
        understand-anything-plugin/packages/dashboard/src/test/smoke.test.tsx \
        understand-anything-plugin/pnpm-lock.yaml
git commit -m "chore(dashboard): add Vitest + testing-library test infrastructure"
```

---

## Phase E: Theme Engine Event Emitter

### Task 7: Add `onThemeChange` subscription to theme-engine

**Files:**
- Modify: `understand-anything-plugin/packages/dashboard/src/themes/theme-engine.ts`

Context: Mermaid SVGs embed theme colors at render time. When the user switches themes, we need to re-render. Current `applyTheme()` only mutates CSS variables without notifying listeners.

- [ ] **Step 1: Write a failing test**

Create `understand-anything-plugin/packages/dashboard/src/themes/__tests__/theme-engine.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { applyTheme, onThemeChange } from "../theme-engine.js";

describe("theme-engine change subscribers", () => {
  it("calls registered listener after applyTheme", () => {
    const listener = vi.fn();
    const unsubscribe = onThemeChange(listener);
    applyTheme({ presetId: "dark-luxury", accentId: "gold" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    applyTheme({ presetId: "dark-luxury", accentId: "gold" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
```

Note: preset/accent IDs must match whatever is already defined in `presets.ts`. If `"dark-luxury"` / `"gold"` don't match, replace with real IDs found there.

- [ ] **Step 2: Run the test, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- theme-engine`
Expected: FAIL — `onThemeChange is not a function`.

- [ ] **Step 3: Extend theme-engine with a subscription list**

Open `understand-anything-plugin/packages/dashboard/src/themes/theme-engine.ts`. Before `applyTheme`, add a listener set and export an `onThemeChange` function:

```typescript
type ThemeChangeListener = () => void;
const themeChangeListeners = new Set<ThemeChangeListener>();

export function onThemeChange(listener: ThemeChangeListener): () => void {
  themeChangeListeners.add(listener);
  return () => themeChangeListeners.delete(listener);
}
```

At the end of the existing `applyTheme(config)` function body, append:

```typescript
for (const listener of themeChangeListeners) {
  try {
    listener();
  } catch (err) {
    console.error("[theme-engine] listener error:", err);
  }
}
```

- [ ] **Step 4: Run the test, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- theme-engine`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/themes/theme-engine.ts \
        understand-anything-plugin/packages/dashboard/src/themes/__tests__/theme-engine.test.ts
git commit -m "feat(dashboard): emit onThemeChange notifications from theme-engine"
```

---

### Task 8: Create `mermaid-theme.ts` helper

**Files:**
- Create: `understand-anything-plugin/packages/dashboard/src/themes/mermaid-theme.ts`
- Create: `understand-anything-plugin/packages/dashboard/src/themes/__tests__/mermaid-theme.test.ts`

- [ ] **Step 1: Write a failing test**

Create `understand-anything-plugin/packages/dashboard/src/themes/__tests__/mermaid-theme.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getMermaidTheme } from "../mermaid-theme.js";

describe("getMermaidTheme", () => {
  beforeEach(() => {
    const s = document.documentElement.style;
    s.setProperty("--color-elevated", "#121212");
    s.setProperty("--color-accent", "#d4a574");
    s.setProperty("--color-accent-dim", "#a88554");
    s.setProperty("--color-text-primary", "#f0e6d2");
    s.setProperty("--color-surface", "#161616");
    s.setProperty("--color-root", "#0a0a0a");
    s.setProperty("--font-sans", "'Inter', system-ui, sans-serif");
  });

  it("reads CSS variables into Mermaid themeVariables", () => {
    const theme = getMermaidTheme();
    expect(theme.background).toBe("#121212");
    expect(theme.primaryBorderColor).toBe("#d4a574");
    expect(theme.primaryColor).toBe("#a88554");
    expect(theme.fontFamily).toContain("Inter");
  });
});
```

- [ ] **Step 2: Run the test, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- mermaid-theme`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `understand-anything-plugin/packages/dashboard/src/themes/mermaid-theme.ts`:

```typescript
export interface MermaidThemeVariables {
  background: string;
  primaryColor: string;
  primaryBorderColor: string;
  primaryTextColor: string;
  lineColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  edgeLabelBackground: string;
  mainBkg: string;
  fontFamily: string;
  fontSize: string;
}

export function getMermaidTheme(): MermaidThemeVariables {
  const style = getComputedStyle(document.documentElement);
  const read = (v: string) => style.getPropertyValue(v).trim();
  return {
    background: read("--color-elevated"),
    primaryColor: read("--color-accent-dim"),
    primaryBorderColor: read("--color-accent"),
    primaryTextColor: read("--color-text-primary"),
    lineColor: read("--color-accent-dim"),
    secondaryColor: read("--color-surface"),
    tertiaryColor: read("--color-root"),
    edgeLabelBackground: read("--color-elevated"),
    mainBkg: read("--color-elevated"),
    fontFamily: read("--font-sans"),
    fontSize: "14px",
  };
}
```

- [ ] **Step 4: Run the test, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- mermaid-theme`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/themes/mermaid-theme.ts \
        understand-anything-plugin/packages/dashboard/src/themes/__tests__/mermaid-theme.test.ts
git commit -m "feat(dashboard): add mermaid-theme helper mapping CSS vars to Mermaid vars"
```

---

## Phase F: Store Extension

### Task 9: Add `MermaidPopupSlice` to the dashboard store

**Files:**
- Modify: `understand-anything-plugin/packages/dashboard/src/store.ts`

Context: Four new state fields + four actions, mirroring the existing `codeViewer` slice.

- [ ] **Step 1: Write a failing test**

Create `understand-anything-plugin/packages/dashboard/src/__tests__/store.mermaid.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useDashboardStore } from "../store.js";

describe("mermaid popup slice", () => {
  beforeEach(() => {
    useDashboardStore.setState({
      mermaidPopupNodeId: null,
      mermaidModalOpen: false,
    });
  });

  it("opens the popup with a node id", () => {
    useDashboardStore.getState().openMermaidPopup("d1");
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBe("d1");
  });

  it("closes the popup and the modal", () => {
    useDashboardStore.setState({
      mermaidPopupNodeId: "d1",
      mermaidModalOpen: true,
    });
    useDashboardStore.getState().closeMermaidPopup();
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBeNull();
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
  });

  it("opens and closes the modal independently", () => {
    useDashboardStore.setState({ mermaidPopupNodeId: "d1" });
    useDashboardStore.getState().openMermaidModal();
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(true);
    useDashboardStore.getState().closeMermaidModal();
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBe("d1");
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- store.mermaid`
Expected: FAIL — `openMermaidPopup is not a function`.

- [ ] **Step 3: Extend the store interface**

Open `understand-anything-plugin/packages/dashboard/src/store.ts`. In the `DashboardStore` interface, add:

```typescript
  mermaidPopupNodeId: string | null;
  mermaidModalOpen: boolean;
  openMermaidPopup: (nodeId: string) => void;
  closeMermaidPopup: () => void;
  openMermaidModal: () => void;
  closeMermaidModal: () => void;
```

In the `create((set) => ({ ... }))` body, add the initial state and actions (mirror the existing `codeViewer` pattern near lines 349–350):

```typescript
  mermaidPopupNodeId: null,
  mermaidModalOpen: false,
  openMermaidPopup: (nodeId) =>
    set({ mermaidPopupNodeId: nodeId, mermaidModalOpen: false }),
  closeMermaidPopup: () =>
    set({ mermaidPopupNodeId: null, mermaidModalOpen: false }),
  openMermaidModal: () => set({ mermaidModalOpen: true }),
  closeMermaidModal: () => set({ mermaidModalOpen: false }),
```

- [ ] **Step 4: Run the test, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- store.mermaid`
Expected: PASS all 3 cases.

- [ ] **Step 5: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/store.ts \
        understand-anything-plugin/packages/dashboard/src/__tests__/store.mermaid.test.ts
git commit -m "feat(dashboard): add MermaidPopupSlice to dashboard store"
```

---

## Phase G: MermaidRenderer Component

### Task 10: Implement `MermaidRenderer` with 3 render states

**Files:**
- Create: `understand-anything-plugin/packages/dashboard/src/components/MermaidRenderer.tsx`
- Create: `understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidRenderer.test.tsx`

- [ ] **Step 1: Write failing tests for all three states**

Create `understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidRenderer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MermaidRenderer } from "../MermaidRenderer.js";

vi.mock("mermaid", () => {
  return {
    default: {
      initialize: vi.fn(),
      render: vi.fn(async (id: string, source: string) => {
        if (source.includes("INVALID_SYNTAX")) throw new Error("Parse error near INVALID_SYNTAX");
        return { svg: `<svg data-id="${id}" data-source="${source}"></svg>` };
      }),
    },
  };
});

describe("MermaidRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders SVG for a valid source", async () => {
    render(<MermaidRenderer source="flowchart TD\n  A --> B" />);
    await waitFor(() =>
      expect(document.querySelector("svg[data-id]")).toBeInTheDocument(),
    );
  });

  it("falls back to <pre> on parse error with copy button", async () => {
    render(<MermaidRenderer source="flowchart TD\n  INVALID_SYNTAX" />);
    await waitFor(() =>
      expect(screen.getByText(/Diagram render failed/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /copy source/i })).toBeEnabled();
    expect(screen.getByText(/INVALID_SYNTAX/)).toBeInTheDocument();
  });

  it("copies source to clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(<MermaidRenderer source="flowchart TD\n  INVALID_SYNTAX" />);
    await waitFor(() => screen.getByRole("button", { name: /copy source/i }));
    await userEvent.click(screen.getByRole("button", { name: /copy source/i }));
    expect(writeText).toHaveBeenCalledWith("flowchart TD\n  INVALID_SYNTAX");
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- MermaidRenderer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `understand-anything-plugin/packages/dashboard/src/components/MermaidRenderer.tsx`:

```tsx
import { useEffect, useState } from "react";
import { getMermaidTheme } from "../themes/mermaid-theme.js";
import { onThemeChange } from "../themes/theme-engine.js";

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
    <div
      className="flex items-center justify-center h-full overflow-auto"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- MermaidRenderer`
Expected: PASS all 3 cases.

- [ ] **Step 5: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/components/MermaidRenderer.tsx \
        understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidRenderer.test.tsx
git commit -m "feat(dashboard): add MermaidRenderer component with fallbacks"
```

---

## Phase H: Collision-Detection Hook

### Task 11: Implement `useMermaidPopupPosition`

**Files:**
- Create: `understand-anything-plugin/packages/dashboard/src/hooks/useMermaidPopupPosition.ts`
- Create: `understand-anything-plugin/packages/dashboard/src/hooks/__tests__/useMermaidPopupPosition.test.ts`

- [ ] **Step 1: Write failing tests — create 3 separate files (different mocks per file)**

Because `vi.mock` is hoisted per-file, each collision scenario gets its own test file. Create all three:

**File 1: `hooks/__tests__/useMermaidPopupPosition.empty.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [],
    flowToScreenPosition: (p: { x: number; y: number }) => p,
  }),
}));

import { useMermaidPopupPosition } from "../useMermaidPopupPosition.js";

describe("useMermaidPopupPosition · no nodes", () => {
  it("returns bottom-center when no nodes present", () => {
    const { result } = renderHook(() =>
      useMermaidPopupPosition(480, 260, { width: 1200, height: 800 }),
    );
    expect(result.current.x).toBe((1200 - 480) / 2);
    expect(result.current.y).toBe(16);
  });
});
```

**File 2: `hooks/__tests__/useMermaidPopupPosition.collision.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// A node sits exactly at bottom-center (blocking candidate 0).
// It does NOT block candidate 1 (offset −80 left).
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [
      { id: "n1", position: { x: 380, y: 540 }, width: 440, height: 240 },
    ],
    flowToScreenPosition: (p: { x: number; y: number }) => p,
  }),
}));

import { useMermaidPopupPosition } from "../useMermaidPopupPosition.js";

describe("useMermaidPopupPosition · collision avoidance", () => {
  it("shifts left by 80px when bottom-center is occupied", () => {
    const { result } = renderHook(() =>
      useMermaidPopupPosition(480, 260, { width: 1200, height: 800 }),
    );
    expect(result.current.x).toBe((1200 - 480) / 2 - 80);
  });
});
```

**File 3: `hooks/__tests__/useMermaidPopupPosition.fallback.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// One enormous node covers the entire container — every candidate collides.
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [
      { id: "n1", position: { x: 0, y: 0 }, width: 1200, height: 800 },
    ],
    flowToScreenPosition: (p: { x: number; y: number }) => p,
  }),
}));

import { useMermaidPopupPosition } from "../useMermaidPopupPosition.js";

describe("useMermaidPopupPosition · full-collision fallback", () => {
  it("falls back to bottom-center when all candidates are occupied", () => {
    const { result } = renderHook(() =>
      useMermaidPopupPosition(480, 260, { width: 1200, height: 800 }),
    );
    expect(result.current.x).toBe((1200 - 480) / 2);
    expect(result.current.y).toBe(16);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- useMermaidPopupPosition`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `understand-anything-plugin/packages/dashboard/src/hooks/useMermaidPopupPosition.ts`:

```typescript
import { useMemo } from "react";
import { useReactFlow } from "@xyflow/react";

export interface PopupPosition {
  x: number;
  y: number;
}

export interface ContainerBounds {
  width: number;
  height: number;
}

const MARGIN = 16;
const HORIZONTAL_OFFSET = 80;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function aabbIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export function useMermaidPopupPosition(
  width: number,
  height: number,
  container: ContainerBounds,
): PopupPosition {
  const rf = useReactFlow();

  return useMemo(() => {
    const centerX = (container.width - width) / 2;
    const candidates: PopupPosition[] = [
      { x: centerX, y: MARGIN },
      { x: centerX - HORIZONTAL_OFFSET, y: MARGIN },
      { x: centerX + HORIZONTAL_OFFSET, y: MARGIN },
      { x: MARGIN, y: MARGIN },
      { x: container.width - width - MARGIN, y: MARGIN },
    ];

    const nodes = rf.getNodes();

    for (const c of candidates) {
      const popupRect: Rect = {
        left: c.x,
        right: c.x + width,
        top: container.height - c.y - height,
        bottom: container.height - c.y,
      };
      const hit = nodes.some((n) => {
        const topLeft = rf.flowToScreenPosition({
          x: n.position.x,
          y: n.position.y,
        });
        const bottomRight = rf.flowToScreenPosition({
          x: n.position.x + (n.width ?? 180),
          y: n.position.y + (n.height ?? 80),
        });
        return aabbIntersect(popupRect, {
          left: topLeft.x,
          top: topLeft.y,
          right: bottomRight.x,
          bottom: bottomRight.y,
        });
      });
      if (!hit) return c;
    }
    return candidates[0];
  }, [width, height, container.width, container.height, rf]);
}
```

- [ ] **Step 4: Run the tests, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- useMermaidPopupPosition`
Expected: all test files PASS.

- [ ] **Step 5: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/hooks/useMermaidPopupPosition.ts \
        understand-anything-plugin/packages/dashboard/src/hooks/__tests__/
git commit -m "feat(dashboard): add collision-avoiding popup position hook"
```

---

## Phase I: Popup Component

### Task 12: Implement `MermaidFlowchartPopup`

**Files:**
- Create: `understand-anything-plugin/packages/dashboard/src/components/MermaidFlowchartPopup.tsx`
- Create: `understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidFlowchartPopup.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidFlowchartPopup.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MermaidFlowchartPopup } from "../MermaidFlowchartPopup.js";
import { useDashboardStore } from "../../store.js";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: "<svg></svg>" })),
  },
}));

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [],
    flowToScreenPosition: (p: { x: number; y: number }) => p,
  }),
}));

function seedGraph(mermaidValue?: string) {
  useDashboardStore.setState({
    domainGraph: {
      nodes: [
        {
          id: "d1",
          type: "domain",
          name: "Checkout and Ordering",
          summary: "",
          tags: [],
          complexity: "simple",
          domainMeta: mermaidValue ? { mermaid: mermaidValue } : {},
        },
      ],
      edges: [],
    },
    mermaidPopupNodeId: "d1",
    mermaidModalOpen: false,
  });
}

describe("MermaidFlowchartPopup", () => {
  beforeEach(() => {
    seedGraph("flowchart TD\n  A --> B");
  });

  it("shows empty state and disables enlarge when no mermaid field", () => {
    seedGraph(undefined);
    render(<MermaidFlowchartPopup />);
    expect(screen.getByText(/No detailed diagram/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enlarge/i })).toBeDisabled();
  });

  it("shows node name in header", () => {
    render(<MermaidFlowchartPopup />);
    expect(screen.getByText("Checkout and Ordering")).toBeInTheDocument();
  });

  it("closes on X button", async () => {
    render(<MermaidFlowchartPopup />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBeNull();
  });

  it("opens modal on enlarge button", async () => {
    render(<MermaidFlowchartPopup />);
    await userEvent.click(screen.getByRole("button", { name: /enlarge/i }));
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(true);
  });

  it("Esc does NOT close the popup", async () => {
    render(<MermaidFlowchartPopup />);
    await userEvent.keyboard("{Escape}");
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBe("d1");
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- MermaidFlowchartPopup`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `understand-anything-plugin/packages/dashboard/src/components/MermaidFlowchartPopup.tsx`:

```tsx
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
            ⤢
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={closePopup}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)]/10"
          >
            ✕
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
```

- [ ] **Step 4: Add the slide-up keyframe to the dashboard CSS**

Open `understand-anything-plugin/packages/dashboard/src/index.css` and append at the end:

```css
@keyframes mermaid-popup-slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

- [ ] **Step 5: Run the tests, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- MermaidFlowchartPopup`
Expected: PASS all 5 cases.

- [ ] **Step 6: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/components/MermaidFlowchartPopup.tsx \
        understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidFlowchartPopup.test.tsx \
        understand-anything-plugin/packages/dashboard/src/index.css
git commit -m "feat(dashboard): add MermaidFlowchartPopup slide-up component"
```

---

## Phase J: Modal Component

### Task 13: Implement `MermaidFlowchartModal`

**Files:**
- Create: `understand-anything-plugin/packages/dashboard/src/components/MermaidFlowchartModal.tsx`
- Create: `understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidFlowchartModal.test.tsx`
- Modify: `understand-anything-plugin/packages/dashboard/package.json` — add `pako` for Mermaid Live URL encoding

- [ ] **Step 1: Add `pako` dependency**

Open `understand-anything-plugin/packages/dashboard/package.json` and add to `dependencies`:

```json
"pako": "^2.1.0"
```

And to `devDependencies`:

```json
"@types/pako": "^2.0.3"
```

Install: `cd understand-anything-plugin && pnpm install`

- [ ] **Step 2: Write failing tests**

Create `understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidFlowchartModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MermaidFlowchartModal } from "../MermaidFlowchartModal.js";
import { useDashboardStore } from "../../store.js";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: "<svg data-id='modal'></svg>" })),
  },
}));

function seed() {
  useDashboardStore.setState({
    domainGraph: {
      nodes: [
        {
          id: "d1",
          type: "domain",
          name: "Checkout and Ordering",
          summary: "",
          tags: [],
          complexity: "simple",
          domainMeta: { mermaid: "flowchart TD\n  A --> B" },
        },
      ],
      edges: [],
    },
    mermaidPopupNodeId: "d1",
    mermaidModalOpen: true,
  });
}

describe("MermaidFlowchartModal", () => {
  beforeEach(() => seed());

  it("closes on Esc", async () => {
    render(<MermaidFlowchartModal />);
    await userEvent.keyboard("{Escape}");
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
  });

  it("closes on X button", async () => {
    render(<MermaidFlowchartModal />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
  });

  it("does NOT close on backdrop click", async () => {
    render(<MermaidFlowchartModal />);
    await userEvent.click(screen.getByTestId("mermaid-modal-backdrop"));
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(true);
  });

  it("copies source via Copy button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(<MermaidFlowchartModal />);
    await userEvent.click(screen.getByRole("button", { name: /copy source/i }));
    expect(writeText).toHaveBeenCalledWith("flowchart TD\n  A --> B");
  });

  it("generates an Open-in-Mermaid-Live href with pako-encoded source", () => {
    render(<MermaidFlowchartModal />);
    const link = screen.getByRole("link", { name: /open in mermaid live/i });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("https://mermaid.live/edit#pako:")).toBe(true);
    expect(href.length).toBeGreaterThan(40);
  });

  it("renders nothing when modal is closed", () => {
    useDashboardStore.setState({ mermaidModalOpen: false });
    const { container } = render(<MermaidFlowchartModal />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 3: Run, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- MermaidFlowchartModal`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the modal**

Create `understand-anything-plugin/packages/dashboard/src/components/MermaidFlowchartModal.tsx`:

```tsx
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
```

- [ ] **Step 5: Run the tests, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- MermaidFlowchartModal`
Expected: PASS all 6 cases.

- [ ] **Step 6: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/components/MermaidFlowchartModal.tsx \
        understand-anything-plugin/packages/dashboard/src/components/__tests__/MermaidFlowchartModal.test.tsx \
        understand-anything-plugin/packages/dashboard/package.json \
        understand-anything-plugin/pnpm-lock.yaml
git commit -m "feat(dashboard): add MermaidFlowchartModal with Copy + Mermaid Live link"
```

---

## Phase K: Integration Wiring

### Task 14: Wire domain-node click → popup open

**Files:**
- Modify: `understand-anything-plugin/packages/dashboard/src/components/DomainClusterNode.tsx`

- [ ] **Step 1: Add `openMermaidPopup` to the click handler**

Open `understand-anything-plugin/packages/dashboard/src/components/DomainClusterNode.tsx`. Find the `selectNode` subscription block (around lines 18–20) and add:

```typescript
const openMermaidPopup = useDashboardStore((s) => s.openMermaidPopup);
```

Find the `onClick` handler (around line 30) and change it to:

```tsx
onClick={() => {
  selectNode(data.domainId);
  openMermaidPopup(data.domainId);
}}
```

- [ ] **Step 2: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/components/DomainClusterNode.tsx
git commit -m "feat(dashboard): open mermaid popup on domain node click"
```

---

### Task 15: Mount popup + modal inside `DomainGraphView`

**Files:**
- Modify: `understand-anything-plugin/packages/dashboard/src/components/DomainGraphView.tsx`

- [ ] **Step 1: Import the new components**

At the top of `DomainGraphView.tsx`, add imports:

```tsx
import { MermaidFlowchartPopup } from "./MermaidFlowchartPopup.js";
import { MermaidFlowchartModal } from "./MermaidFlowchartModal.js";
```

- [ ] **Step 2: Mount them inside the graph container**

Find the root JSX returned by `DomainGraphView` (likely a `<div>` wrapping the `<ReactFlow>` instance — must be `position: relative` for absolute-positioned popup to anchor correctly).

Ensure that outer div has `className="relative ..."` (add `relative` if missing). Immediately after the `<ReactFlow>` block, add:

```tsx
<MermaidFlowchartPopup />
<MermaidFlowchartModal />
```

Example resulting structure:

```tsx
return (
  <div className="relative w-full h-full">
    <ReactFlow ... />
    <MermaidFlowchartPopup />
    <MermaidFlowchartModal />
  </div>
);
```

- [ ] **Step 3: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/components/DomainGraphView.tsx
git commit -m "feat(dashboard): mount MermaidFlowchartPopup and Modal in DomainGraphView"
```

---

### Task 16: Close popup on view-mode switch

**Files:**
- Modify: `understand-anything-plugin/packages/dashboard/src/store.ts`
- Create/modify: `understand-anything-plugin/packages/dashboard/src/__tests__/store.mermaid.test.ts` (extend)

- [ ] **Step 1: Write a failing test for the view-switch behavior**

Append to `understand-anything-plugin/packages/dashboard/src/__tests__/store.mermaid.test.ts`:

```typescript
describe("mermaid popup closes on view switch", () => {
  it("clears popup when switching to structural view", () => {
    useDashboardStore.setState({
      mermaidPopupNodeId: "d1",
      mermaidModalOpen: true,
    });
    useDashboardStore.getState().setViewMode("structural");
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBeNull();
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
  });

  it("clears popup when switching to knowledge view", () => {
    useDashboardStore.setState({
      mermaidPopupNodeId: "d1",
      mermaidModalOpen: false,
    });
    useDashboardStore.getState().setViewMode("knowledge");
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBeNull();
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- store.mermaid`
Expected: FAIL on the two new cases.

- [ ] **Step 3: Modify `setViewMode` to close the popup**

In `store.ts`, locate the existing `setViewMode` action. **First read the current body** — it may already perform side-effects (e.g. resetting `selectedNodeId`, resetting filters). Preserve all of them.

Modify the action so that, when the new mode is not `"domain"`, mermaid popup state is reset. Example (preserve existing fields in the `set({...})` payload, just add two more):

```typescript
setViewMode: (mode) =>
  set((state) => {
    const nextMermaidPopupNodeId =
      mode === "domain" ? state.mermaidPopupNodeId : null;
    const nextMermaidModalOpen =
      mode === "domain" ? state.mermaidModalOpen : false;
    return {
      // ...all existing fields the original setViewMode returned...
      viewMode: mode,
      mermaidPopupNodeId: nextMermaidPopupNodeId,
      mermaidModalOpen: nextMermaidModalOpen,
    };
  }),
```

If the original was just `setViewMode: (mode) => set({ viewMode: mode })`, the full replacement is:

```typescript
setViewMode: (mode) =>
  set((state) => ({
    viewMode: mode,
    mermaidPopupNodeId: mode === "domain" ? state.mermaidPopupNodeId : null,
    mermaidModalOpen: mode === "domain" ? state.mermaidModalOpen : false,
  })),
```

- [ ] **Step 4: Run, confirm pass**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test -- store.mermaid`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add understand-anything-plugin/packages/dashboard/src/store.ts \
        understand-anything-plugin/packages/dashboard/src/__tests__/store.mermaid.test.ts
git commit -m "feat(dashboard): auto-close mermaid popup on non-domain view switch"
```

---

### Task 17: Verify lazy-chunk split in production build

**Files:**
- None (inspection only)

- [ ] **Step 1: Build the dashboard**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard build`
Expected: success.

- [ ] **Step 2: Inspect the output**

Run: `ls -la understand-anything-plugin/packages/dashboard/dist/assets/ | grep -i mermaid`
Expected: at least one JS chunk whose filename contains `mermaid` OR a chunk listed as a dynamic import in the build summary. The dashboard's main entry chunk should NOT contain the mermaid code.

If no such chunk appears, verify `vite.config.ts` does not force-inline dynamic imports; this is unlikely with defaults. If verification fails, investigate before proceeding.

- [ ] **Step 3: (Optional) Sanity check with a bundle analyzer**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard build -- --mode analyze` (if an analyzer is configured) — otherwise skip.

---

## Phase L: Full Test Suite + Lint

### Task 18: Run the complete test matrix + lint

- [ ] **Step 1: Core tests**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/core test`
Expected: all PASS.

- [ ] **Step 2: Dashboard tests**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/dashboard test`
Expected: all PASS.

- [ ] **Step 3: Lint**

Run: `cd understand-anything-plugin && pnpm lint`
Expected: no errors. Fix any new lint warnings inline before continuing.

- [ ] **Step 4: Type check (build everything)**

Run: `cd understand-anything-plugin && pnpm --filter @understand-anything/core build && pnpm --filter @understand-anything/dashboard build`
Expected: both succeed.

- [ ] **Step 5: If any step failed, fix and commit the fix separately**

Only continue once all four commands are green.

---

## Phase M: Manual Acceptance

### Task 19: Run the 11-step acceptance checklist

**Prerequisite:** A local clone of a suitable domain-rich sample project. The spec points at `microservices-demo`; use that or any project with at least 2–3 domain nodes.

- [ ] **Step 1:** Run `/understand --full` in the sample project. Expected: `knowledge-graph.json` written, domain nodes with non-empty `domainMeta.mermaid` where applicable.

- [ ] **Step 2:** Run `/understand-dashboard` → switch to Domain view.

- [ ] **Step 3:** Click on a domain node (e.g. "Checkout and Ordering"). Expected: popup slides up from the bottom-center of the graph area over 300 ms; header shows the node name; body renders a Mermaid SVG; API-call arrows show labels like `|POST /charge|`.

- [ ] **Step 4:** Verify the popup avoids nearby visible nodes (pan the graph so a node sits at the bottom-center first, then click a different domain node — popup should shift to one of the 5 candidate positions).

- [ ] **Step 5:** Click ⤢. Expected: fullscreen modal opens over a black/80 backdrop.

- [ ] **Step 6:** In the modal, click 📋 Copy source. Expected: Mermaid source in clipboard (paste into a text editor to verify).

- [ ] **Step 7:** In the modal, click 🔗 Open in Mermaid Live. Expected: new tab opens at `mermaid.live` with the source pre-loaded.

- [ ] **Step 8:** Press Esc. Expected: modal closes; popup remains open.

- [ ] **Step 9:** Click ✕ on the popup. Expected: popup closes.

- [ ] **Step 10:** Hand-edit `.understand-anything/knowledge-graph.json` — delete `domainMeta.mermaid` from one node, save, reload the dashboard. Click that node. Expected: empty state ("No detailed diagram yet…"); ⤢ is disabled.

- [ ] **Step 11:** Hand-edit `.understand-anything/knowledge-graph.json` — corrupt one node's `mermaid` source (e.g. replace with `"flowchart TD\n  --->>invalid"`), save, reload. Click that node. Expected: `<pre>` fallback with source shown, Copy source button available, console warn logged.

- [ ] **Step 12:** Switch to Structural view while popup is open. Expected: popup auto-closes.

- [ ] **Step 13:** Open DevTools → Network tab → fresh reload the dashboard → switch to Domain view but do NOT click any node. Expected: no network request for the `mermaid` chunk yet. Click a domain node. Expected: a network request for the `mermaid-*.js` chunk appears (lazy loading confirmed).

- [ ] **Step 14:** If any step fails, open an issue in the plan's scope (fix or document as known-limitation). Only close the plan once all 13 steps pass.

---

## Phase N: Release Versioning

### Task 20: Bump versions across all four files

**Reference:** `CLAUDE.md` §Versioning

**Files:**
- Modify: `understand-anything-plugin/package.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.cursor-plugin/plugin.json`

- [ ] **Step 1: Pick the next minor version**

Run: `node -p "require('./understand-anything-plugin/package.json').version"` → note the current version. The next version is `MAJOR.MINOR+1.0`.

- [ ] **Step 2: Update all four files to the new version**

Update the `version` field in each file to the next minor version. Example (if current is 1.5.0, new is 1.6.0):

```json
{ "version": "1.6.0" }
```

- [ ] **Step 3: Commit**

```bash
git add understand-anything-plugin/package.json \
        .claude-plugin/marketplace.json \
        .claude-plugin/plugin.json \
        .cursor-plugin/plugin.json
git commit -m "chore(release): bump version for Mermaid flowchart popup feature"
```

---

## Self-Review Checklist

Before handing off to execution, verify:

- [ ] Every spec requirement is implemented by at least one task:
  - Schema extension → Task 1
  - `sanitizeGraph` preserves field → Task 2
  - Agent Mermaid generation → Task 4
  - Assemble-reviewer dry-run validation → Tasks 3 + 5
  - Dashboard `mermaid` lazy import → Task 10
  - MermaidRenderer 3 states → Task 10
  - Popup 5-candidate collision avoidance → Task 11 + Task 12
  - Popup empty-state + disabled enlarge → Task 12
  - Popup slide-up animation → Task 12
  - Esc does NOT close popup → Task 12 test
  - Modal Copy + Open in Live + Esc + ✕ → Task 13
  - Backdrop-click does NOT close modal → Task 13 test
  - View switch closes popup → Task 16
  - Theme-change re-renders Mermaid → Task 7 + Task 10 (themeVersion)
  - Testing across 3 layers → Tasks 1, 9–13, 16
  - Manual acceptance checklist → Task 19
  - Version bump across 4 files → Task 20

- [ ] No placeholders ("TBD", "fill in"), no "similar to", no empty code blocks.

- [ ] Function / field names consistent throughout:
  - Store fields: `mermaidPopupNodeId`, `mermaidModalOpen`
  - Store actions: `openMermaidPopup`, `closeMermaidPopup`, `openMermaidModal`, `closeMermaidModal`
  - Schema field: `domainMeta.mermaid`

- [ ] All commit messages follow the project's conventional-commit style observed in `git log` (`feat(scope):`, `chore(scope):`, `test(scope):`, `docs(scope):`).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-20-mermaid-service-flowchart.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.

Which approach?
