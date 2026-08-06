import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, ArrowRightLeft, Eye, EyeOff } from 'lucide-react';
import './InterCommunityRelations.css';

const COMMUNITY_COLORS = [
  '#4f6ef6', '#e8656b', '#3db89e', '#e8a040', '#8b5cf6',
  '#3b9ddb', '#d9468f', '#5ea853', '#c07e3c', '#6d7d93',
];

const CANVAS_WIDTH = 780;
const CANVAS_HEIGHT = 420;
const NODE_RADIUS_MIN = 24;
const NODE_RADIUS_MAX = 52;
const EDGE_WIDTH_MIN = 1;
const EDGE_WIDTH_MAX = 10;
const LABEL_FONT = '600 13px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const SUBLABEL_FONT = '500 10.5px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const EDGE_LABEL_FONT = '500 10px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';

interface LayoutNode {
  id: number;
  x: number;
  y: number;
  size: number;
  label: string;
  members: string[];
}

interface LayoutEdge {
  source: number;
  target: number;
  weight: number;
}

const computeLayout = (communities: any[], adjacencyList: any): { nodes: LayoutNode[]; edges: LayoutEdge[] } => {
  if (!communities?.length || !adjacencyList) return { nodes: [], edges: [] };

  const nodeCount = communities.length;
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  communities.forEach((community: any, i: number) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
    const radius = 155;
    nodes.push({
      id: i,
      x: CANVAS_WIDTH / 2 + radius * Math.cos(angle),
      y: CANVAS_HEIGHT / 2 + radius * Math.sin(angle),
      size: community.members.length,
      label: `C${i + 1}`,
      members: community.members,
    });
  });

  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      let weight = 0;
      const setI = new Set(communities[i].members);

      communities[j].members.forEach((memberId: string) => {
        const neighbors = adjacencyList[memberId] || [];
        neighbors.forEach((neighbor: string) => {
          if (setI.has(neighbor)) weight++;
        });
      });

      if (weight > 0) {
        edges.push({ source: i, target: j, weight });
      }
    }
  }

  return { nodes, edges };
};

const sizeToRadius = (size: number, maxSize: number): number => {
  if (maxSize <= 1) return NODE_RADIUS_MIN + 4;
  const normalized = size / maxSize;
  return NODE_RADIUS_MIN + Math.sqrt(normalized) * (NODE_RADIUS_MAX - NODE_RADIUS_MIN);
};

const weightToWidth = (weight: number, maxWeight: number): number => {
  if (maxWeight <= 0) return EDGE_WIDTH_MIN;
  const normalized = weight / maxWeight;
  return EDGE_WIDTH_MIN + normalized * (EDGE_WIDTH_MAX - EDGE_WIDTH_MIN);
};

interface EdgeListProps {
  edges: LayoutEdge[];
  nodes: LayoutNode[];
  visible: boolean;
  onToggle: () => void;
}

const EdgeList = ({ edges, nodes, visible, onToggle }: EdgeListProps) => (
  <motion.div
    className="cir-edge-panel"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    <div className="cir-edge-panel-header">
      <ArrowRightLeft size={14} className="cir-edge-panel-icon" />
      <span className="cir-edge-panel-title">Connections</span>
      <button
        type="button"
        className="cir-edge-panel-toggle"
        onClick={onToggle}
        title={visible ? 'Hide panel' : 'Show panel'}
      >
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>

    <AnimatePresence>
      {visible && (
        <motion.div
          className="cir-edge-list"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {edges.length === 0 && (
            <p className="cir-edge-list-empty">No inter-community edges found.</p>
          )}
          {edges
            .sort((a: LayoutEdge, b: LayoutEdge) => b.weight - a.weight)
            .map((edge: LayoutEdge, _idx: number) => (
              <div key={`${edge.source}-${edge.target}`} className="cir-edge-item">
                <div className="cir-edge-item-indicator">
                  <span
                    className="cir-edge-item-dot"
                    style={{ backgroundColor: COMMUNITY_COLORS[edge.source % COMMUNITY_COLORS.length] }}
                  />
                  <span className="cir-edge-item-connector" />
                  <span
                    className="cir-edge-item-dot"
                    style={{ backgroundColor: COMMUNITY_COLORS[edge.target % COMMUNITY_COLORS.length] }}
                  />
                </div>
                <span className="cir-edge-item-label">
                  {nodes[edge.source]?.label || `C${edge.source + 1}`}
                  {' → '}
                  {nodes[edge.target]?.label || `C${edge.target + 1}`}
                </span>
                <span className="cir-edge-item-weight">{edge.weight}</span>
              </div>
            ))}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

interface InterCommunityRelationsProps {
  communities: any[];
  adjacencyList: any;
}

const InterCommunityRelations = ({ communities, adjacencyList }: InterCommunityRelationsProps): React.ReactElement => {
  const [showPanel, setShowPanel] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { nodes, edges } = useMemo(
    () => computeLayout(communities, adjacencyList),
    [communities, adjacencyList]
  );

  const maxNodeSize = useMemo(
    () => Math.max(...nodes.map((n: LayoutNode) => n.size), 1),
    [nodes]
  );

  const maxEdgeWeight = useMemo(
    () => Math.max(...edges.map((e: LayoutEdge) => e.weight), 1),
    [edges]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    if (!nodes.length) {
      ctx.fillStyle = '#8b919d';
      ctx.font = '500 14px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No communities to display', w / 2, h / 2);
      return;
    }

    edges.forEach((edge: LayoutEdge) => {
      const source = nodes[edge.source];
      const target = nodes[edge.target];
      if (!source || !target) return;

      const lineWidth = weightToWidth(edge.weight, maxEdgeWeight);
      const alpha = 0.25 + (edge.weight / maxEdgeWeight) * 0.55;

      if (edge.weight / maxEdgeWeight > 0.5) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(79, 110, 246, ${alpha * 0.3})`;
        ctx.lineWidth = lineWidth + 4;
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = `rgba(79, 110, 246, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;

      const labelText = edge.weight.toString();
      ctx.font = EDGE_LABEL_FONT;
      const textWidth = ctx.measureText(labelText).width;
      const bgPadX = 6;
      const bgPadY = 3;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      (ctx as any).roundRect(
        midX - textWidth / 2 - bgPadX,
        midY - 8 - bgPadY,
        textWidth + bgPadX * 2,
        16 + bgPadY * 2,
        8
      );
      ctx.fill();

      ctx.fillStyle = '#5f6672';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, midX, midY);
    });

    nodes.forEach((node: LayoutNode) => {
      const radius = sizeToRadius(node.size, maxNodeSize);
      const color = COMMUNITY_COLORS[node.id % COMMUNITY_COLORS.length];
      const isHovered = hoveredNode === node.id;

      ctx.save();
      ctx.shadowColor = 'rgba(26, 29, 35, 0.15)';
      ctx.shadowBlur = isHovered ? 16 : 8;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = isHovered ? '#1a1d23' : 'rgba(26, 29, 35, 0.2)';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.stroke();

      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(79, 110, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x, node.y - 4);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = SUBLABEL_FONT;
      ctx.fillText(`${node.size}`, node.x, node.y + 13);
    });
  }, [nodes, edges, maxNodeSize, maxEdgeWeight, hoveredNode]);

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let found: number | null = null;
      for (const node of nodes) {
        const radius = sizeToRadius(node.size, maxNodeSize);
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy <= (radius + 6) * (radius + 6)) {
          found = node.id;
          break;
        }
      }
      setHoveredNode(found);
    },
    [nodes, maxNodeSize]
  );

  const handleCanvasLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const togglePanel = useCallback(() => {
    setShowPanel((prev: boolean) => !prev);
  }, []);

  if (!communities?.length) {
    return (
      <div className="cir-empty">
        <Network size={28} className="cir-empty-icon" />
        <p className="cir-empty-text">No communities to visualize</p>
        <p className="cir-empty-hint">
          Run community detection to see inter-community relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="cir-root">
      <div className="cir-main">
        <motion.div
          className="cir-canvas-wrapper"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <canvas
            ref={canvasRef}
            className="cir-canvas"
            onMouseMove={handleCanvasMove}
            onMouseLeave={handleCanvasLeave}
          />

          <AnimatePresence>
            {hoveredNode !== null && nodes[hoveredNode] && (
              <motion.div
                className="cir-tooltip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
              >
                <span className="cir-tooltip-label">{nodes[hoveredNode].label}</span>
                <span className="cir-tooltip-value">
                  {nodes[hoveredNode].size} member{nodes[hoveredNode].size !== 1 ? 's' : ''}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <EdgeList
          edges={edges}
          nodes={nodes}
          visible={showPanel}
          onToggle={togglePanel}
        />
      </div>

      <div className="cir-legend">
        <span className="cir-legend-item">
          <span className="cir-legend-circle" />
          Node size = member count
        </span>
        <span className="cir-legend-item">
          <span className="cir-legend-line" />
          Edge thickness = connection strength
        </span>
      </div>
    </div>
  );
};

export default InterCommunityRelations;