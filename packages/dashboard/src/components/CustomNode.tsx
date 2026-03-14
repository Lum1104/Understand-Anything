import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";

const typeColors: Record<string, { bg: string; border: string; text: string }> =
  {
    file: {
      bg: "bg-blue-900",
      border: "border-blue-500",
      text: "text-blue-300",
    },
    function: {
      bg: "bg-green-900",
      border: "border-green-500",
      text: "text-green-300",
    },
    class: {
      bg: "bg-purple-900",
      border: "border-purple-500",
      text: "text-purple-300",
    },
    module: {
      bg: "bg-orange-900",
      border: "border-orange-500",
      text: "text-orange-300",
    },
    concept: {
      bg: "bg-pink-900",
      border: "border-pink-500",
      text: "text-pink-300",
    },
  };

const complexityColors: Record<string, string> = {
  simple: "bg-green-600",
  moderate: "bg-yellow-600",
  complex: "bg-red-600",
};

export interface CustomNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  summary: string;
  complexity: string;
  isHighlighted: boolean;
  searchScore?: number;
  isSelected: boolean;
}

export type CustomFlowNode = Node<CustomNodeData, "custom">;

export default function CustomNode({
  data,
}: NodeProps<CustomFlowNode>) {
  const colors = typeColors[data.nodeType] ?? typeColors.file;
  const complexityColor =
    complexityColors[data.complexity] ?? complexityColors.simple;

  let ringClass = "";
  if (data.isSelected) {
    ringClass = "ring-2 ring-white";
  } else if (data.isHighlighted) {
    const score = data.searchScore ?? 1;
    if (score <= 0.1) {
      ringClass = "ring-2 ring-yellow-300";
    } else if (score <= 0.3) {
      ringClass = "ring-2 ring-yellow-400";
    } else {
      ringClass = "ring-2 ring-yellow-500/60";
    }
  }

  const truncatedName =
    data.label.length > 24 ? data.label.slice(0, 22) + "..." : data.label;

  return (
    <div
      className={`rounded-lg border-2 ${colors.bg} ${colors.border} ${ringClass} px-3 py-2 min-w-[180px] max-w-[220px] shadow-lg`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2"
      />

      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}
        >
          {data.nodeType}
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium ${complexityColor}`}
        >
          {data.complexity}
        </span>
      </div>

      <div className="text-sm font-bold text-white truncate" title={data.label}>
        {truncatedName}
      </div>

      <div className="text-[11px] text-gray-300 mt-1 line-clamp-2 leading-tight">
        {data.summary}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2"
      />
    </div>
  );
}
