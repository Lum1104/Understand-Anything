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
  useStore: () => ({ x: 0, y: 0, zoom: 1 }),
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
