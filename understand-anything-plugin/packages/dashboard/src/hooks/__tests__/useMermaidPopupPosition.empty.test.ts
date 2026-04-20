import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [],
    flowToScreenPosition: (p: { x: number; y: number }) => p,
  }),
  useStore: () => ({ x: 0, y: 0, zoom: 1 }),
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
