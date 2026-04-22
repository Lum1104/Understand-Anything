import { useMemo } from "react";
import { useReactFlow, useStore, type ReactFlowState } from "@xyflow/react";

export interface PopupPosition {
  x: number;
  y: number;
}

export interface ContainerBounds {
  width: number;
  height: number;
  /** Viewport-left of the popup container. Used to translate node rects
   *  (which `flowToScreenPosition` returns in viewport pixels) into the
   *  same local space as `popupRect`. Defaults to 0. */
  left?: number;
  /** Viewport-top of the popup container. See `left`. Defaults to 0. */
  top?: number;
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
  const viewport = useStore((s: ReactFlowState) => ({ x: s.transform[0], y: s.transform[1], zoom: s.transform[2] }));

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
    const originX = container.left ?? 0;
    const originY = container.top ?? 0;

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
          left: topLeft.x - originX,
          top: topLeft.y - originY,
          right: bottomRight.x - originX,
          bottom: bottomRight.y - originY,
        });
      });
      if (!hit) return c;
    }
    return candidates[0];
  }, [width, height, container.width, container.height, container.left, container.top, rf, viewport.x, viewport.y, viewport.zoom]);
}
