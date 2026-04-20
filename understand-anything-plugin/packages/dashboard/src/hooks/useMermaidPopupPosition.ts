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
