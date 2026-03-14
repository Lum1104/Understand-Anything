import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";
import type { Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CustomNode from "./CustomNode";
import type { CustomFlowNode } from "./CustomNode";
import { useDashboardStore } from "../store";
import { applyDagreLayout } from "../utils/layout";

const nodeTypes = { custom: CustomNode };

export default function GraphView() {
  const graph = useDashboardStore((s) => s.graph);
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const searchResults = useDashboardStore((s) => s.searchResults);
  const selectNode = useDashboardStore((s) => s.selectNode);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!graph) return { initialNodes: [] as CustomFlowNode[], initialEdges: [] as Edge[] };

    const flowNodes: CustomFlowNode[] = graph.nodes.map((node) => {
      const matchResult = searchResults.find((r) => r.nodeId === node.id);
      return {
        id: node.id,
        type: "custom" as const,
        position: { x: 0, y: 0 },
        data: {
          label: node.name,
          nodeType: node.type,
          summary: node.summary,
          complexity: node.complexity,
          isHighlighted: !!matchResult,
          searchScore: matchResult?.score,
          isSelected: selectedNodeId === node.id,
        },
      };
    });

    const flowEdges: Edge[] = graph.edges.map((edge, i) => ({
      id: `e-${i}`,
      source: edge.source,
      target: edge.target,
      label: edge.type,
      animated: edge.type === "calls",
      style: { stroke: "#6b7280", strokeWidth: 1.5 },
      labelStyle: { fill: "#9ca3af", fontSize: 10 },
    }));

    const laid = applyDagreLayout(flowNodes, flowEdges);
    return {
      initialNodes: laid.nodes as CustomFlowNode[],
      initialEdges: laid.edges,
    };
  }, [graph, searchResults, selectedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: CustomFlowNode) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (!graph) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-lg">
        <p className="text-gray-400 text-sm">No knowledge graph loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor="#374151"
          maskColor="rgba(0,0,0,0.6)"
          className="!bg-gray-800"
        />
      </ReactFlow>
    </div>
  );
}
