"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Filter, X, Image as ImageIcon } from "lucide-react";

const ForceGraph = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphNode {
  id: number;
  name: string;
  type: string;
  image_path?: string;
  x?: number;
  y?: number;
}

interface GraphEdge {
  id: number;
  source: number;
  target: number;
  relation_type: string;
  context?: string;
}

const typeColors: Record<string, string> = {
  character: "#6366f1",
  location: "#10b981",
  item: "#f59e0b",
  event: "#8b5cf6",
  concept: "#06b6d4",
};

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    links: GraphEdge[];
  }>({ nodes: [], links: [] });
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [relationTypes, setRelationTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedRelations, setSelectedRelations] = useState<Set<string>>(
    new Set()
  );
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showImages, setShowImages] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const loadData = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedTypes.size > 0) {
      selectedTypes.forEach((t) => params.append("entity_type", t));
    }
    if (selectedRelations.size > 0) {
      selectedRelations.forEach((r) => params.append("relation_type", r));
    }

    const [graphRes, relTypesRes] = await Promise.all([
      fetch(`/api/graph/?${params}`),
      fetch("/api/graph/relation-types"),
    ]);

    const graph = await graphRes.json();
    const relTypes = await relTypesRes.json();

    setGraphData({
      nodes: graph.nodes || [],
      links: (graph.edges || []).map((e: GraphEdge) => ({
        ...e,
        source: e.source,
        target: e.target,
      })),
    });
    setRelationTypes(Array.isArray(relTypes) ? relTypes : []);
  }, [selectedTypes, selectedRelations]);

  useEffect(() => {
    fetch("/api/entities/types")
      .then((r) => r.json())
      .then((data) => {
        const types = Array.isArray(data) ? data : [];
        setEntityTypes(types);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const toggleType = (type: string) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setSelectedTypes(next);
  };

  const toggleRelation = (type: string) => {
    const next = new Set(selectedRelations);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setSelectedRelations(next);
  };

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name;
      const fontSize = Math.max(12 / globalScale, 2);
      const color = typeColors[node.type] || "#94a3b8";

      if (showImages && node.image_path && globalScale > 0.5) {
        // Draw image placeholder (circle with first letter)
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.font = `${fontSize * 1.5}px sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label.charAt(0), node.x, node.y);
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      if (globalScale > 0.6) {
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, node.x, node.y + 8);
      }
    },
    [showImages]
  );

  return (
    <div className="flex h-full">
      {/* Sidebar filters */}
      <div className="w-72 border-r border-white/5 bg-bg-secondary flex flex-col">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Filter size={18} />
            Graph Filters
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Entity types */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Entity Types
            </h3>
            <div className="space-y-1">
              {entityTypes.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(type)}
                    onChange={() => toggleType(type)}
                    className="rounded border-gray-600"
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: typeColors[type] || "#94a3b8" }}
                  />
                  <span className="text-sm text-gray-300 capitalize">
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Relation types */}
          {relationTypes.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Relation Types
              </h3>
              <div className="space-y-1 max-h-48 overflow-auto">
                {relationTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRelations.has(type)}
                      onChange={() => toggleRelation(type)}
                      className="rounded border-gray-600"
                    />
                    <span className="text-sm text-gray-300">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Display options */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Display
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showImages}
                onChange={(e) => setShowImages(e.target.checked)}
              />
              <ImageIcon size={14} className="text-gray-400" />
              <span className="text-sm text-gray-300">Show images</span>
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-white/5 text-xs text-gray-500">
          {graphData.nodes.length} nodes, {graphData.links.length} edges
        </div>
      </div>

      {/* Graph area */}
      <div ref={containerRef} className="flex-1 relative graph-container">
        {graphData.nodes.length > 0 ? (
          <ForceGraph
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            onNodeClick={(node: any) => setSelectedNode(node)}
            linkColor={() => "rgba(255,255,255,0.15)"}
            linkWidth={0.5}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkLabel="relation_type"
            backgroundColor="#0f1117"
            cooldownTicks={100}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p>No graph data yet.</p>
              <p className="text-sm mt-2">
                Create notes and analyze them to build the graph.
              </p>
            </div>
          </div>
        )}

        {/* Node detail panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 bg-bg-secondary border border-white/10 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{selectedNode.name}</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: typeColors[selectedNode.type] || "#94a3b8",
                }}
              />
              <span className="text-gray-400 text-sm capitalize">
                {selectedNode.type}
              </span>
            </div>
            {selectedNode.image_path && (
              <img
                src={selectedNode.image_path}
                alt={selectedNode.name}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            <a
              href={`/entities/${selectedNode.id}`}
              className="block text-center text-sm text-accent-blue hover:underline"
            >
              View entity card
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
