import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// Container is offset from viewport origin by (500, 200). The node's viewport
// rect spans (500..1340, 200..1000) — which, after subtracting the offset,
// covers the entire popup container (0..840, 0..800) and should collide with
// every candidate → bottom-center fallback.
//
// Pre-fix (bug): the hook would compare the viewport rect directly against
// container-local popup rects, so the node would appear to sit at (500..1340)
// while candidates sit in (0..1200). Candidate 1 (left-shift to x=280, i.e.
// popup spans 280..760 local) would look "free" and be selected incorrectly.
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [
      { id: "n1", position: { x: 500, y: 200 }, width: 840, height: 800 },
    ],
    flowToScreenPosition: (p: { x: number; y: number }) => p,
  }),
  useStore: () => ({ x: 0, y: 0, zoom: 1 }),
}));

import { useMermaidPopupPosition } from "../useMermaidPopupPosition.js";

describe("useMermaidPopupPosition · container viewport offset", () => {
  it("translates node viewport rects into container-local space before colliding", () => {
    const { result } = renderHook(() =>
      useMermaidPopupPosition(480, 260, {
        width: 1200,
        height: 800,
        left: 500,
        top: 200,
      }),
    );
    expect(result.current.x).toBe((1200 - 480) / 2);
    expect(result.current.y).toBe(16);
  });
});
