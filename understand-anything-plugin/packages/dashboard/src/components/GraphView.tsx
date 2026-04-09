import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CustomNode from "./CustomNode";
import type { CustomFlowNode } from "./CustomNode";
import LayerClusterNode from "./LayerClusterNode";
import type { LayerClusterFlowNode } from "./LayerClusterNode";
import PortalNode from "./PortalNode";
import type { PortalFlowNode } from "./PortalNode";
import Breadcrumb from "./Breadcrumb";
import { useDashboardStore } from "../store";
import type { KnowledgeGraph, NodeType } from "@understand-anything/core/types";
import { useTheme } from "../themes/index.ts";
import {
  applyDagreLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
  LAYER_CLUSTER_WIDTH,
  LAYER_CLUSTER_HEIGHT,
  PORTAL_NODE_WIDTH,
  PORTAL_NODE_HEIGHT,
} from "../utils/layout";
import {
  aggregateLayerEdges,
  computePortals,
  findCrossLayerFileNodes,
} from "../utils/edgeAggregation";

const nodeTypes = {
  custom: CustomNode,
  "layer-cluster": LayerClusterNode,
  portal: PortalNode,
};

import type { NodeCategory } from "../store";

/**
 * Maps each NodeType to a filter category. Must be kept in sync with core NodeType.
 * Unknown types default to "code" with a development warning.
 */
const NODE_TYPE_TO_CATEGORY: Record<NodeType, NodeCategory> = {
  file: "code", function: "code", class: "code", module: "code", concept: "code",
  config: "config",
  document: "docs",
  service: "infra", resource: "infra", pipeline: "infra",
  table: "data", endpoint: "data", schema: "data",
  domain: "domain", flow: "domain", step: "domain",
  article: "knowledge", entity: "knowledge", topic: "knowledge", claim: "knowledge", source: "knowledge",
} as const;

// ── Helper components that must live inside <ReactFlow> ────────────────

/** Pans/zooms to tour-highlighted nodes. */
function TourFitView() {
  const tourHighlightedNodeIds = useDashboardStore((s) => s.tourHighlightedNodeIds);
  const { fitView } = useReactFlow();
  const prevRef = useRef<string[]>([]);

  useEffect(() => {
    const prev = prevRef.current;
    const changed =
      tourHighlightedNodeIds.length > 0 &&
      (tourHighlightedNodeIds.length !== prev.length ||
        tourHighlightedNodeIds.some((id, i) => id !== prev[i]));
    prevRef.current = tourHighlightedNodeIds;

    if (changed) {
      requestAnimationFrame(() => {
        fitView({
          nodes: tourHighlightedNodeIds.map((id) => ({ id })),
          duration: 500,
          padding: 0.3,
          maxZoom: 1.2,
          minZoom: 0.01,
        });
      });
    }
  }, [tourHighlightedNodeIds, fitView]);

  return null;
}

/** Centers the graph on the selected node (e.g. from search). */
function SelectedNodeFitView() {
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const { fitView } = useReactFlow();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== prevRef.current) {
      // Delay slightly so this runs after any layer-level fitView triggered
      // by navigateToNodeInLayer (which also changes activeLayerId).
      const timer = setTimeout(() => {
        fitView({
          nodes: [{ id: selectedNodeId }],
          duration: 500,
          padding: 0.3,
          maxZoom: 1.2,
          minZoom: 0.01,
        });
      }, 100);
      prevRef.current = selectedNodeId;
      return () => clearTimeout(timer);
    }
    prevRef.current = selectedNodeId;
  }, [selectedNodeId, fitView]);

  return null;
}

// ── Overview level: layers as cluster nodes ────────────────────────────

function useOverviewGraph() {
  const graph = useDashboardStore((s) => s.graph);
  const searchResults = useDashboardStore((s) => s.searchResults);
  const drillIntoLayer = useDashboardStore((s) => s.drillIntoLayer);

  return useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };

    const layers = graph.layers ?? [];
    if (layers.length === 0) return { nodes: [] as Node[], edges: [] as Edge[] };

    // Build search match counts per layer
    const searchMatchByLayer = new Map<string, number>();
    if (searchResults.length > 0) {
      const nodeToLayer = new Map<string, string>();
      for (const layer of layers) {
        for (const nid of layer.nodeIds) {
          nodeToLayer.set(nid, layer.id);
        }
      }
      for (const result of searchResults) {
        const lid = nodeToLayer.get(result.nodeId);
        if (lid) {
          searchMatchByLayer.set(lid, (searchMatchByLayer.get(lid) ?? 0) + 1);
        }
      }
    }

    // Create cluster nodes
    const clusterNodes: LayerClusterFlowNode[] = layers.map((layer, i) => {
      const memberNodes = graph.nodes.filter((n) => layer.nodeIds.includes(n.id));
      const complexCounts = { simple: 0, moderate: 0, complex: 0 };
      for (const n of memberNodes) {
        complexCounts[n.complexity]++;
      }
      const aggregateComplexity =
        complexCounts.complex > memberNodes.length * 0.3
          ? "complex"
          : complexCounts.moderate > memberNodes.length * 0.3
            ? "moderate"
            : "simple";

      return {
        id: layer.id,
        type: "layer-cluster" as const,
        position: { x: 0, y: 0 },
        data: {
          layerId: layer.id,
          layerName: layer.name,
          layerDescription: layer.description,
          fileCount: layer.nodeIds.length,
          aggregateComplexity,
          layerColorIndex: i,
          searchMatchCount: searchMatchByLayer.get(layer.id),
          onDrillIn: drillIntoLayer,
        },
      };
    });

    // Aggregate edges between layers
    const aggregated = aggregateLayerEdges(graph);
    const flowEdges: Edge[] = aggregated.map((agg, i) => ({
      id: `le-${i}`,
      source: agg.sourceLayerId,
      target: agg.targetLayerId,
      label: `${agg.count}`,
      style: {
        stroke: "rgba(212,165,116,0.4)",
        strokeWidth: Math.min(1 + Math.log2(agg.count + 1), 5),
      },
      labelStyle: { fill: "#a39787", fontSize: 11, fontWeight: 600 },
    }));

    const dims = new Map<string, { width: number; height: number }>();
    for (const n of clusterNodes) {
      dims.set(n.id, { width: LAYER_CLUSTER_WIDTH, height: LAYER_CLUSTER_HEIGHT });
    }
    const laid = applyDagreLayout(clusterNodes as unknown as Node[], flowEdges, "TB", dims);
    return { nodes: laid.nodes, edges: laid.edges };
  }, [graph, searchResults, drillIntoLayer]);
}

// ── Layer detail level: topology (dagre) + visual overlay ───────────────

/**
 * Topology memo: computes node positions via dagre. Only recomputes when
 * the graph structure, active layer, persona, diff, or focus changes.
 * Does NOT depend on selectedNodeId, searchResults, or tourHighlightedNodeIds.
 */
function useLayerDetailTopology() {
  const graph = useDashboardStore((s) => s.graph);
  const activeLayerId = useDashboardStore((s) => s.activeLayerId);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const persona = useDashboardStore((s) => s.persona);
  const diffMode = useDashboardStore((s) => s.diffMode);
  const changedNodeIds = useDashboardStore((s) => s.changedNodeIds);
  const affectedNodeIds = useDashboardStore((s) => s.affectedNodeIds);
  const focusNodeId = useDashboardStore((s) => s.focusNodeId);
  const nodeTypeFilters = useDashboardStore((s) => s.nodeTypeFilters);
  const drillIntoLayer = useDashboardStore((s) => s.drillIntoLayer);

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
    },
    [selectNode],
  );

  return useMemo(() => {
    if (!graph || !activeLayerId)
      return { nodes: [] as CustomFlowNode[], edges: [] as Edge[], portalNodes: [] as PortalFlowNode[], portalEdges: [] as Edge[], filteredEdges: [] as KnowledgeGraph["edges"] };

    const activeLayer = graph.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return { nodes: [] as CustomFlowNode[], edges: [] as Edge[], portalNodes: [] as PortalFlowNode[], portalEdges: [] as Edge[], filteredEdges: [] as KnowledgeGraph["edges"] };

    const layerNodeIds = new Set(activeLayer.nodeIds);

    // Expand layer membership to include sub-file nodes (function/class) whose
    // parent file is in this layer. These nodes aren't in layer.nodeIds directly
    // but belong to the layer via their "contains" edge from a file node.
    const expandedLayerNodeIds = new Set(layerNodeIds);
    for (const edge of graph.edges) {
      if (edge.type === "contains" && layerNodeIds.has(edge.source)) {
        expandedLayerNodeIds.add(edge.target);
      }
    }

    // All node types visible at each persona level (single source of truth).
    // Sub-file types (function, class) are only shown for junior/experienced.
    const subFileTypes = new Set(["function", "class"]);
    const allVisibleTypes = new Set([
      "file", "module", "concept",
      "config", "document", "service", "table",
      "endpoint", "pipeline", "schema", "resource",
      "domain", "flow", "step",
      "function", "class",
    ]);

    let filteredGraphNodes = graph.nodes.filter((n) => {
      if (!expandedLayerNodeIds.has(n.id)) return false;
      if (!allVisibleTypes.has(n.type)) return false;
      if (persona === "non-technical" && subFileTypes.has(n.type)) return false;
      return true;
    });

    // Apply node type category filters
    filteredGraphNodes = filteredGraphNodes.filter((n) => {
      const category = NODE_TYPE_TO_CATEGORY[n.type as NodeType];
      if (!category) {
        if (import.meta.env.DEV) {
          console.warn(`[GraphView] Unknown node type "${n.type}" — defaulting to "code" category`);
        }
      }
      const effectiveCategory = category ?? "code";
      return nodeTypeFilters[effectiveCategory] !== false;
    });

    let filteredNodeIds = new Set(filteredGraphNodes.map((n) => n.id));

    let filteredGraphEdges = graph.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
    );

    // Focus mode: 1-hop neighborhood within the layer
    if (focusNodeId && filteredNodeIds.has(focusNodeId)) {
      const focusNeighborIds = new Set<string>([focusNodeId]);
      for (const edge of filteredGraphEdges) {
        if (edge.source === focusNodeId) focusNeighborIds.add(edge.target);
        if (edge.target === focusNodeId) focusNeighborIds.add(edge.source);
      }
      filteredGraphNodes = filteredGraphNodes.filter((n) =>
        focusNeighborIds.has(n.id),
      );
      filteredNodeIds = new Set(filteredGraphNodes.map((n) => n.id));
      filteredGraphEdges = filteredGraphEdges.filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
      );
    }

    const diffNodeIds = diffMode
      ? new Set([...changedNodeIds, ...affectedNodeIds])
      : new Set<string>();

    const flowNodes: CustomFlowNode[] = filteredGraphNodes.map((node) => ({
      id: node.id,
      type: "custom" as const,
      position: { x: 0, y: 0 },
      data: {
        label: node.name ?? node.filePath?.split("/").pop() ?? node.id,
        nodeType: node.type,
        summary: node.summary,
        complexity: node.complexity,
        isHighlighted: false,
        searchScore: undefined,
        isSelected: false,
        isTourHighlighted: false,
        isDiffChanged: diffMode && changedNodeIds.has(node.id),
        isDiffAffected: diffMode && affectedNodeIds.has(node.id),
        isDiffFaded: diffMode && !changedNodeIds.has(node.id) && !affectedNodeIds.has(node.id),
        isNeighbor: false,
        isSelectionFaded: false,
        onNodeClick: handleNodeSelect,
      },
    }));

    const flowEdges: Edge[] = filteredGraphEdges.map((edge, i) => {
      const sourceInDiff = diffMode && diffNodeIds.has(edge.source);
      const targetInDiff = diffMode && diffNodeIds.has(edge.target);
      const isImpacted = diffMode && (sourceInDiff || targetInDiff);

      let edgeStyle: React.CSSProperties;
      let edgeLabelStyle: React.CSSProperties;
      let edgeAnimated: boolean;

      if (isImpacted) {
        edgeStyle = {
          stroke: sourceInDiff && targetInDiff ? "rgba(224, 82, 82, 0.7)" : "rgba(212, 160, 48, 0.5)",
          strokeWidth: 2.5,
        };
        edgeLabelStyle = { fill: "#a39787", fontSize: 10 };
        edgeAnimated = true;
      } else if (diffMode) {
        edgeStyle = { stroke: "rgba(212,165,116,0.08)", strokeWidth: 1 };
        edgeLabelStyle = { fill: "rgba(163,151,135,0.3)", fontSize: 10 };
        edgeAnimated = false;
      } else {
        edgeStyle = { stroke: "rgba(212,165,116,0.3)", strokeWidth: 1.5 };
        edgeLabelStyle = { fill: "#a39787", fontSize: 10 };
        edgeAnimated = edge.type === "calls";
      }

      return {
        id: `e-${i}`,
        source: edge.source,
        target: edge.target,
        label: edge.type,
        animated: edgeAnimated,
        style: edgeStyle,
        labelStyle: edgeLabelStyle,
      };
    });

    // Portal nodes for connected external layers
    const portals = computePortals(graph, activeLayerId);
    const layerIndexMap = new Map(graph.layers.map((l, i) => [l.id, i]));

    const portalNodes: PortalFlowNode[] = portals.map((portal) => ({
      id: `portal:${portal.layerId}`,
      type: "portal" as const,
      position: { x: 0, y: 0 },
      data: {
        targetLayerId: portal.layerId,
        targetLayerName: portal.layerName,
        connectionCount: portal.connectionCount,
        layerColorIndex: layerIndexMap.get(portal.layerId) ?? 0,
        onNavigate: drillIntoLayer,
      },
    }));

    const portalEdges: Edge[] = [];
    let portalEdgeIdx = flowEdges.length;
    for (const portal of portals) {
      const crossFiles = findCrossLayerFileNodes(graph, activeLayerId, portal.layerId);
      for (const fileId of crossFiles) {
        if (filteredNodeIds.has(fileId)) {
          portalEdges.push({
            id: `e-${portalEdgeIdx++}`,
            source: fileId,
            target: `portal:${portal.layerId}`,
            style: { stroke: "rgba(212,165,116,0.2)", strokeWidth: 1, strokeDasharray: "4 4" },
            animated: false,
          });
        }
      }
    }

    const allFlowNodes: Node[] = [
      ...(flowNodes as unknown as Node[]),
      ...(portalNodes as unknown as Node[]),
    ];
    const allFlowEdges = [...flowEdges, ...portalEdges];

    const dims = new Map<string, { width: number; height: number }>();
    for (const n of flowNodes) {
      dims.set(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const n of portalNodes) {
      dims.set(n.id, { width: PORTAL_NODE_WIDTH, height: PORTAL_NODE_HEIGHT });
    }

    const laid = applyDagreLayout(allFlowNodes, allFlowEdges, "TB", dims);
    return { nodes: laid.nodes, edges: laid.edges, portalNodes, portalEdges, filteredEdges: filteredGraphEdges };
  }, [graph, activeLayerId, persona, handleNodeSelect, diffMode, changedNodeIds, affectedNodeIds, focusNodeId, nodeTypeFilters, drillIntoLayer]);
}

/**
 * Visual overlay: cheap O(n) pass that applies selection, search, and tour
 * state onto already-positioned nodes. Avoids triggering dagre relayout.
 */
function useLayerDetailGraph() {
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const searchResults = useDashboardStore((s) => s.searchResults);
  const tourHighlightedNodeIds = useDashboardStore((s) => s.tourHighlightedNodeIds);

  const topo = useLayerDetailTopology();

  const nodes = useMemo(() => {
    const searchMap = new Map(searchResults.map((r) => [r.nodeId, r.score]));
    const tourSet = new Set(tourHighlightedNodeIds);

    // Build neighbor set for selection highlighting
    const neighborNodeIds = new Set<string>();
    if (selectedNodeId) {
      for (const edge of topo.filteredEdges) {
        if (edge.source === selectedNodeId) neighborNodeIds.add(edge.target);
        if (edge.target === selectedNodeId) neighborNodeIds.add(edge.source);
      }
      neighborNodeIds.add(selectedNodeId);
    }

    return topo.nodes.map((node) => {
      // Skip portal nodes — they have no CustomNodeData
      if (node.type === "portal") return node;

      const searchScore = searchMap.get(node.id);
      const isHighlighted = searchScore !== undefined;
      const isSelected = selectedNodeId === node.id;
      const isTourHighlighted = tourSet.has(node.id);
      const hasSelection = !!selectedNodeId;
      const isNeighbor = hasSelection && neighborNodeIds.has(node.id) && !isSelected;
      const isSelectionFaded = hasSelection && !neighborNodeIds.has(node.id);

      const data = node.data as CustomFlowNode["data"];

      // Skip creating a new object if nothing visual changed
      if (
        data.isHighlighted === isHighlighted &&
        data.searchScore === searchScore &&
        data.isSelected === isSelected &&
        data.isTourHighlighted === isTourHighlighted &&
        data.isNeighbor === isNeighbor &&
        data.isSelectionFaded === isSelectionFaded
      ) {
        return node;
      }

      return { ...node, data: { ...data, isHighlighted, searchScore, isSelected, isTourHighlighted, isNeighbor, isSelectionFaded } };
    });
  }, [topo.nodes, topo.filteredEdges, selectedNodeId, searchResults, tourHighlightedNodeIds]);

  const edges = useMemo(() => {
    if (!selectedNodeId) return topo.edges;

    // Apply selection-based edge styling on top of topology edges
    return topo.edges.map((edge) => {
      const isSelectedEdge = edge.source === selectedNodeId || edge.target === selectedNodeId;
      // Don't restyle diff-impacted or portal edges
      if ((edge.style as Record<string, unknown>)?.strokeDasharray) return edge;

      if (isSelectedEdge) {
        return { ...edge, animated: true, style: { stroke: "rgba(212,165,116,0.8)", strokeWidth: 2.5 }, labelStyle: { fill: "#d4a574", fontSize: 11, fontWeight: 600 } };
      }
      // Fade unrelated edges
      return { ...edge, animated: false, style: { stroke: "rgba(212,165,116,0.08)", strokeWidth: 1 }, labelStyle: { fill: "rgba(163,151,135,0.2)", fontSize: 10 } };
    });
  }, [topo.edges, selectedNodeId]);

  return { nodes, edges };
}

// ── Main inner component (must be inside ReactFlowProvider) ────────────

function GraphViewInner() {
  const graph = useDashboardStore((s) => s.graph);
  const navigationLevel = useDashboardStore((s) => s.navigationLevel);
  const activeLayerId = useDashboardStore((s) => s.activeLayerId);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const drillIntoLayer = useDashboardStore((s) => s.drillIntoLayer);
  const focusNodeId = useDashboardStore((s) => s.focusNodeId);
  const setFocusNode = useDashboardStore((s) => s.setFocusNode);
  const setReactFlowInstance = useDashboardStore((s) => s.setReactFlowInstance);
  const { preset } = useTheme();

  const overviewGraph = useOverviewGraph();
  const detailGraph = useLayerDetailGraph();

  const { nodes: initialNodes, edges: initialEdges } =
    navigationLevel === "overview" ? overviewGraph : detailGraph;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { fitView } = useReactFlow();

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Fit view on level/layer transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 400, padding: 0.2 });
    }, 50);
    return () => clearTimeout(timer);
  }, [navigationLevel, activeLayerId, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      if (navigationLevel === "overview") {
        drillIntoLayer(node.id);
      } else if (node.id.startsWith("portal:")) {
        const targetLayerId = node.id.replace("portal:", "");
        drillIntoLayer(targetLayerId);
      } else {
        selectNode(node.id);
      }
    },
    [navigationLevel, drillIntoLayer, selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (!graph) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-root rounded-lg">
        <p className="text-text-muted text-sm">No knowledge graph loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <Breadcrumb />
      {focusNodeId && navigationLevel === "layer-detail" && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => setFocusNode(null)}
            className="px-4 py-2 rounded-full bg-elevated border border-gold/30 text-gold text-xs font-semibold tracking-wider uppercase hover:bg-gold/10 transition-colors flex items-center gap-2 shadow-lg"
          >
            <span>Showing neighborhood</span>
            <span className="text-text-muted">&times;</span>
          </button>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ minZoom: 0.01, padding: 0.1 }}
        minZoom={0.01}
        maxZoom={2}
        colorMode={preset.isDark ? "dark" : "light"}
      >
        <Background variant={BackgroundVariant.Dots} color="var(--color-edge-dot)" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor="var(--color-elevated)"
          maskColor="var(--glass-bg)"
          className="!bg-surface !border !border-border-subtle"
        />
        <TourFitView />
        <SelectedNodeFitView />
      </ReactFlow>
    </div>
  );
}

export default function GraphView() {
  return (
    <ReactFlowProvider>
      <GraphViewInner />
    </ReactFlowProvider>
  );
}
