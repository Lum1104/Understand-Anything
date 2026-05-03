import { memo } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { getLayerColor } from "./LayerLegend";

export interface ContainerNodeData extends Record<string, unknown> {
  containerId: string;
  name: string;
  childCount: number;
  strategy: "folder" | "community";
  colorIndex: number;
  isExpanded: boolean;
  hasSearchHits: boolean;
  searchHitCount?: number;
  isDiffAffected: boolean;
  isFocusedViaChild: boolean;
  onToggle: (containerId: string) => void;
}

export type ContainerFlowNode = Node<ContainerNodeData, "container">;

const ContainerNode = memo(({ data, width, height }: NodeProps<ContainerFlowNode>) => {
  const color = getLayerColor(data.colorIndex);

  const borderColor = data.isDiffAffected
    ? "rgba(224,82,82,0.5)"
    : data.isExpanded || data.isFocusedViaChild
      ? "rgba(212,165,116,0.6)"
      : "rgba(212,165,116,0.25)";
  const borderWidth = data.isExpanded || data.isFocusedViaChild ? 1.5 : 1;

  const labelDimmed = data.name === "~";
  const labelText = labelDimmed ? "(root)" : data.name;

  return (
    <div
      className="rounded-xl cursor-pointer transition-all"
      style={{
        width,
        height,
        background: "rgba(255,255,255,0.02)",
        border: `${borderWidth}px solid ${borderColor}`,
        position: "relative",
      }}
      onClick={(e) => {
        e.stopPropagation();
        data.onToggle(data.containerId);
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 16px",
          color: color.label,
          fontFamily: '"DM Serif Display", serif',
          fontSize: 14,
          fontWeight: 400,
        }}
      >
        <span
          className={labelDimmed ? "opacity-50" : ""}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          {data.isExpanded && <span style={{ fontSize: 10 }}>▾</span>}
          {labelText}
          {data.hasSearchHits && data.searchHitCount && data.searchHitCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                background: "rgba(212,165,116,0.2)",
                padding: "1px 6px",
                borderRadius: 8,
              }}
            >
              🔍 {data.searchHitCount}
            </span>
          )}
        </span>
        <span style={{ color: "#a39787", fontSize: 11 }}>{data.childCount}</span>
      </div>
    </div>
  );
});

export default ContainerNode;
