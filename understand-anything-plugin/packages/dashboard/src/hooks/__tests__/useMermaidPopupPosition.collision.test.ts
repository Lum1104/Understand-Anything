import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// A node sits at the right portion of candidate 0's rect (blocking candidate 0).
// It does NOT block candidate 1 (x: 280..760) because the node starts at x=761.
//
// Candidate 0 popup rect: left=360, right=840, top=524, bottom=784
//   Node (761..840, 524..784): popup.right(840) >= node.left(761) → INTERSECT → blocked
//
// Candidate 1 popup rect: left=280, right=760, top=524, bottom=784
//   Node (761..840, 524..784): popup.right(760) < node.left(761) → NO intersect → free
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [
      { id: "n1", position: { x: 761, y: 524 }, width: 79, height: 260 },
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
