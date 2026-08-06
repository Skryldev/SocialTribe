import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import './ConsensusHeatmap.css';

const MIN_CELL_SIZE = 12;
const MAX_CELL_SIZE = 42;
const DEFAULT_CELL_SIZE = 28;
const LABEL_WIDTH = 120;
const LABEL_HEIGHT = 90;

const colorScale = (t: number): { r: number; g: number; b: number } => {
  const v = Math.max(0, Math.min(1, t));

  if (v < 0.5) {
    const s = v * 2;
    return {
      r: Math.round(79 + s * (100 - 79)),
      g: Math.round(94 + s * (116 - 94)),
      b: Math.round(180 + s * (147 - 180)),
    };
  }
  const s = (v - 0.5) * 2;
  return {
    r: Math.round(100 + s * (228 - 100)),
    g: Math.round(116 + s * (101 - 116)),
    b: Math.round(147 + s * (107 - 147)),
  };
};

const formatColor = ({ r, g, b }: { r: number; g: number; b: number }): string => `rgb(${r}, ${g}, ${b})`;

const formatConsensus = (value: number): string => `${(value * 100).toFixed(1)}%`;

interface TooltipData {
  x: number;
  y: number;
  rowId: string;
  colId: string;
  value: number;
  visible: boolean;
}

interface CellTooltipProps {
  x: number;
  y: number;
  rowId: string;
  colId: string;
  value: number;
  visible: boolean;
}

const CellTooltip = ({ x, y, rowId, colId, value, visible }: CellTooltipProps) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="cdh-tooltip"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ left: x, top: y }}
      >
        <div className="cdh-tooltip-row">
          <span className="cdh-tooltip-label">Row</span>
          <span className="cdh-tooltip-value">{rowId}</span>
        </div>
        <div className="cdh-tooltip-row">
          <span className="cdh-tooltip-label">Col</span>
          <span className="cdh-tooltip-value">{colId}</span>
        </div>
        <div className="cdh-tooltip-divider" />
        <div className="cdh-tooltip-row">
          <span className="cdh-tooltip-label">Consensus</span>
          <span className="cdh-tooltip-value cdh-tooltip-value--accent">
            {formatConsensus(value)}
          </span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Legend = () => (
  <div className="cdh-legend">
    <span className="cdh-legend-label">Low</span>
    <div className="cdh-legend-track">
      <div className="cdh-legend-gradient" />
      <div className="cdh-legend-ticks">
        <span className="cdh-legend-tick">0%</span>
        <span className="cdh-legend-tick">25%</span>
        <span className="cdh-legend-tick">50%</span>
        <span className="cdh-legend-tick">75%</span>
        <span className="cdh-legend-tick">100%</span>
      </div>
    </div>
    <span className="cdh-legend-label">High</span>
  </div>
);

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

const ZoomControls = ({ onZoomIn, onZoomOut, onReset, canZoomIn, canZoomOut }: ZoomControlsProps) => (
  <div className="cdh-zoom-controls">
    <button
      type="button"
      className="cdh-zoom-btn"
      onClick={onZoomIn}
      disabled={!canZoomIn}
      aria-label="Zoom in"
      title="Zoom in"
    >
      <ZoomIn size={15} />
    </button>
    <button
      type="button"
      className="cdh-zoom-btn"
      onClick={onZoomOut}
      disabled={!canZoomOut}
      aria-label="Zoom out"
      title="Zoom out"
    >
      <ZoomOut size={15} />
    </button>
    <button
      type="button"
      className="cdh-zoom-btn"
      onClick={onReset}
      aria-label="Reset zoom"
      title="Reset zoom"
    >
      <RotateCcw size={14} />
    </button>
  </div>
);

interface ConsensusHeatmapProps {
  matrix: number[][];
  nodeIds: string[];
}

const ConsensusHeatmap = ({ matrix, nodeIds }: ConsensusHeatmapProps): React.ReactElement => {
  const size = matrix?.length || 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState<number>(
    Math.min(DEFAULT_CELL_SIZE, Math.floor(600 / Math.max(size, 1)))
  );
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const clampedCellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, cellSize));
  const gridWidth = size * clampedCellSize;
  const gridHeight = size * clampedCellSize;
  const canZoomIn = clampedCellSize < MAX_CELL_SIZE;
  const canZoomOut = clampedCellSize > MIN_CELL_SIZE;

  const handleZoomIn = useCallback(() => {
    setCellSize((prev: number) => Math.min(MAX_CELL_SIZE, prev + 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCellSize((prev: number) => Math.max(MIN_CELL_SIZE, prev - 4));
  }, []);

  const handleReset = useCallback(() => {
    setCellSize(DEFAULT_CELL_SIZE);
  }, []);

  const handleCellEnter = useCallback(
    (e: React.MouseEvent, rowIdx: number, colIdx: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setTooltip({
        x: e.clientX,
        y: e.clientY,
        rowId: nodeIds?.[rowIdx] || `Node ${rowIdx}`,
        colId: nodeIds?.[colIdx] || `Node ${colIdx}`,
        value: matrix[rowIdx][colIdx],
        visible: true,
      });
    },
    [matrix, nodeIds]
  );

  const handleCellLeave = useCallback(() => {
    setTooltip((prev: TooltipData | null) => (prev ? { ...prev, visible: false } : null));
  }, []);

  const cells = useMemo(() => {
    if (!size) return null;

    const result: React.ReactElement[] = [];
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const value = matrix[i][j];
        const color = colorScale(value);
        const isDiagonal = i === j;

        result.push(
          <motion.div
            key={`${i}-${j}`}
            className={`cdh-cell ${isDiagonal ? 'cdh-cell--diagonal' : ''}`}
            style={{
              left: j * clampedCellSize,
              top: i * clampedCellSize,
              width: clampedCellSize,
              height: clampedCellSize,
              backgroundColor: formatColor(color),
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: (i * size + j) * 0.0003,
              duration: 0.3,
            }}
            onMouseEnter={(e: React.MouseEvent) => handleCellEnter(e, i, j)}
            onMouseLeave={handleCellLeave}
            role="img"
            aria-label={`Consensus ${formatConsensus(value)} between ${nodeIds?.[i] || `Node ${i}`} and ${nodeIds?.[j] || `Node ${j}`}`}
          >
            <div className="cdh-cell-inner" />
          </motion.div>
        );
      }
    }
    return result;
  }, [size, matrix, clampedCellSize, nodeIds, handleCellEnter, handleCellLeave]);

  if (!size) {
    return (
      <div className="cdh-empty">
        <Info size={24} className="cdh-empty-icon" />
        <p className="cdh-empty-text">No consensus data available</p>
        <p className="cdh-empty-hint">Consensus matrix requires ensemble results with multiple runs.</p>
      </div>
    );
  }

  return (
    <div className="cdh-root" ref={containerRef}>
      <div className="cdh-controls-bar">
        <div className="cdh-meta">
          <span className="cdh-meta-text">
            {size} &times; {size} matrix
          </span>
          <span className="cdh-meta-separator" />
          <span className="cdh-meta-text">
            Cell: {clampedCellSize}px
          </span>
        </div>
        <ZoomControls
          zoom={clampedCellSize}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
        />
      </div>

      <div className="cdh-grid-wrapper">
        <div
          className="cdh-grid"
          style={{
            width: gridWidth + LABEL_WIDTH,
            height: gridHeight + LABEL_HEIGHT,
          }}
        >
          <div className="cdh-col-labels" style={{ left: LABEL_WIDTH, width: gridWidth }}>
            {nodeIds.map((id: string, i: number) => (
              <div
                key={`col-${i}`}
                className="cdh-col-label"
                style={{
                  left: i * clampedCellSize,
                  width: clampedCellSize,
                  height: LABEL_HEIGHT,
                }}
              >
                <span className="cdh-col-label-text">
                  {id}
                </span>
              </div>
            ))}
          </div>

          <div className="cdh-row-labels" style={{ top: LABEL_HEIGHT, height: gridHeight }}>
            {nodeIds.map((id: string, i: number) => (
              <div
                key={`row-${i}`}
                className="cdh-row-label"
                style={{
                  top: i * clampedCellSize,
                  width: LABEL_WIDTH,
                  height: clampedCellSize,
                }}
              >
                <span className="cdh-row-label-text">
                  {id}
                </span>
              </div>
            ))}
          </div>

          <div
            className="cdh-cells-layer"
            style={{ left: LABEL_WIDTH, top: LABEL_HEIGHT }}
          >
            {cells}
          </div>
        </div>
      </div>

      <Legend />

      {tooltip && (
        <CellTooltip
          x={tooltip.x}
          y={tooltip.y}
          rowId={tooltip.rowId}
          colId={tooltip.colId}
          value={tooltip.value}
          visible={tooltip.visible}
        />
      )}
    </div>
  );
};

export default ConsensusHeatmap;