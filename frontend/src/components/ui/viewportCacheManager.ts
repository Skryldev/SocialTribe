const DEFAULT_CELL_SIZE = 500;
const DEFAULT_MAX_CELLS = 400;

const LOG = false;
const cacheLog = (...args: any[]) => LOG && console.log('[Cache]', ...args);
const cacheWarn = (...args: any[]) => LOG && console.warn('[Cache] ⚠️', ...args);

function coordToCellKey(gx: number, gy: number, cellSize: number): string {
  return `${Math.floor(gx / cellSize)}:${Math.floor(gy / cellSize)}`;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

function viewportToCellKeys(viewport: Viewport, cellSize: number): string[] {
  const { x, y, width, height } = viewport;
  
  const MARGIN_CELLS = 2;
  
  const x1 = Math.floor(x / cellSize) - MARGIN_CELLS;
  const y1 = Math.floor(y / cellSize) - MARGIN_CELLS;
  const x2 = Math.floor((x + width) / cellSize) + MARGIN_CELLS;
  const y2 = Math.floor((y + height) / cellSize) + MARGIN_CELLS;

  const keys: string[] = [];
  for (let cx = x1; cx <= x2; cx++) {
    for (let cy = y1; cy <= y2; cy++) {
      keys.push(`${cx}:${cy}`);
    }
  }
  return keys;
}

interface CellData {
  nodes: Map<string, any>;
  edges: Map<string, any>;
  timestamp: number;
}

function findNodeInCells(cells: Map<string, CellData>, nodeId: string): { node: any; cellKey: string } | null {
  for (const [key, cell] of cells.entries()) {
    const node = cell.nodes.get(nodeId);
    if (node) return { node, cellKey: key };
  }
  return null;
}

function removeNodeFromCells(cells: Map<string, CellData>, nodeId: string): any {
  for (const cell of cells.values()) {
    const node = cell.nodes.get(nodeId);
    if (node) {
      cell.nodes.delete(nodeId);
      return node;
    }
  }
  return null;
}

interface CacheStats {
  cachedCells: number;
  pendingCells: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRatio: number;
  trackedPositions: number;
}

export class ViewportCacheManager {
  cellSize: number;
  maxCells: number;

  _cells: Map<string, CellData>;
  _pending: Set<string>;

  _hits: number;
  _misses: number;
  _evictions: number;
  
  _simulationCache: Map<string, any>;
  _nodePositions: Map<string, any>;
  _nodeToCellMap: Map<string, string>;

  constructor({ cellSize = DEFAULT_CELL_SIZE, maxCells = DEFAULT_MAX_CELLS } = {}) {
    this.cellSize = cellSize;
    this.maxCells = maxCells;

    this._cells = new Map();
    this._pending = new Set();

    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
    
    this._simulationCache = new Map();
    this._nodePositions = new Map();
    this._nodeToCellMap = new Map();
  }

  classifyViewport(viewport: Viewport): { hit: string[]; miss: string[]; all: string[] } {
    const keys = viewportToCellKeys(viewport, this.cellSize);
    const hit = keys.filter((k: string) => this._cells.has(k) && !this._pending.has(k));
    const miss = keys.filter((k: string) => !this._cells.has(k) && !this._pending.has(k));

    this._hits += hit.length;
    this._misses += miss.length;

    return { hit, miss, all: keys };
  }

  getForViewport(viewport: Viewport): { nodes: any[]; edges: any[] } {
    const keys = viewportToCellKeys(viewport, this.cellSize);
    const nodes = new Map<string, any>();
    const edges = new Map<string, any>();

    for (const key of keys) {
      const cell = this._cells.get(key);
      if (!cell) continue;
      cell.nodes.forEach((n: any, id: string) => {
        if (!nodes.has(id)) nodes.set(id, n);
      });
      cell.edges.forEach((e: any, id: string) => {
        if (!edges.has(id)) edges.set(id, e);
      });
    }

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
    };
  }

  getCellsAroundNode(nodeId: string, radius: number = 2): string[] {
    const nodeKey = this._nodeToCellMap.get(nodeId);
    if (!nodeKey) return [];
    
    const [cx, cy] = nodeKey.split(':').map(Number);
    const keys: string[] = [];
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        keys.push(`${cx + dx}:${cy + dy}`);
      }
    }
    
    return keys;
  }

  isNodeInCache(nodeId: string): boolean {
    return findNodeInCells(this._cells, nodeId) !== null;
  }

  getNodesNearPoint(x: number, y: number, radiusPx: number = 500): any[] {
    const cellRadius = Math.ceil(radiusPx / this.cellSize);
    const centerKey = coordToCellKey(x, y, this.cellSize);
    const [cx, cy] = centerKey.split(':').map(Number);
    
    const nodes = new Map<string, any>();
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const cellKey = `${cx + dx}:${cy + dy}`;
        const cell = this._cells.get(cellKey);
        if (cell) {
          cell.nodes.forEach((n: any, id: string) => {
            if (!nodes.has(id)) {
              nodes.set(id, n);
            }
          });
        }
      }
    }
    
    return Array.from(nodes.values());
  }

  markPending(keys: string[]): void { 
    if (!keys) return;
    keys.forEach((k: string) => this._pending.add(k)); 
  }
  
  unmarkPending(keys: string[]): void { 
    if (!keys) return;
    keys.forEach((k: string) => this._pending.delete(k)); 
  }

  isPending(key: string): boolean { 
    return this._pending.has(key); 
  }
  
  getPendingCount(): number { 
    return this._pending.size; 
  }

  storeViewportData(viewport: Viewport, nodes: any[], edges: any[]): void {
    for (const node of nodes) {
      if (node.data?.simulation) {
        this.saveSimulationStatus(
          node.id,
          node.data.simulation.status,
          node.data.simulation.day
        );
      }
      
      if (node.position) {
        this._nodePositions.set(node.id, { ...node.position });
        const cellKey = coordToCellKey(node.position.x, node.position.y, this.cellSize);
        this._nodeToCellMap.set(node.id, cellKey);
      }
    }
    
    const keys = viewportToCellKeys(viewport, this.cellSize);
    const now = Date.now();
    const incomingEdgeIds = new Set(edges.map((e: any) => e.id));

    for (const key of keys) {
      if (!this._cells.has(key)) {
        this._cells.set(key, { nodes: new Map(), edges: new Map(), timestamp: now });
      } else {
        this._cells.get(key)!.timestamp = now;
      }
    }

    for (const node of nodes) {
      const pos = node.position || { x: 0, y: 0 };
      const key = coordToCellKey(pos.x, pos.y, this.cellSize);
      
      let cell = this._cells.get(key);
      if (!cell) {
        cell = { nodes: new Map(), edges: new Map(), timestamp: now };
        this._cells.set(key, cell);
      }
      cell.nodes.set(node.id, { ...node });
    }

    for (const key of keys) {
      const cell = this._cells.get(key);
      if (!cell) continue;
      
      for (const edgeId of cell.edges.keys()) {
        if (!incomingEdgeIds.has(edgeId)) {
          cell.edges.delete(edgeId);
        }
      }
    }

    for (const edge of edges) {
      const sourcePos = this._nodePositions.get(edge.source);
      const targetPos = this._nodePositions.get(edge.target);
      
      if (sourcePos) {
        const sourceKey = coordToCellKey(sourcePos.x, sourcePos.y, this.cellSize);
        const sourceCell = this._cells.get(sourceKey);
        if (sourceCell) sourceCell.edges.set(edge.id, { ...edge });
      }
      
      if (targetPos) {
        const targetKey = coordToCellKey(targetPos.x, targetPos.y, this.cellSize);
        const targetCell = this._cells.get(targetKey);
        if (targetCell) targetCell.edges.set(edge.id, { ...edge });
      }
      
      for (const key of keys) {
        const cell = this._cells.get(key);
        if (cell) cell.edges.set(edge.id, { ...edge });
      }
    }

    this.unmarkPending(keys);
    this._maybeGarbageCollect();
    
    cacheLog(`Stored ${nodes.length} nodes, ${edges.length} edges in ${keys.length} cells`);
  }

  getNodePosition(nodeId: string): any {
    return this._nodePositions.get(nodeId);
  }

  patchNodePosition(nodeId: string, position: { x: number; y: number }): void {
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      cacheWarn(`patchNodePosition: invalid position for ${nodeId}`, position);
      return;
    }

    this._nodePositions.set(nodeId, { x: position.x, y: position.y });
    const newKey = coordToCellKey(position.x, position.y, this.cellSize);
    this._nodeToCellMap.set(nodeId, newKey);

    const existingNode = removeNodeFromCells(this._cells, nodeId);

    const targetCell = this._cells.get(newKey);
    if (targetCell) {
      if (existingNode) {
        targetCell.nodes.set(nodeId, {
          ...existingNode,
          position: { x: position.x, y: position.y },
        });
        cacheLog(`Moved node ${nodeId} (type: ${existingNode.type}) to cell ${newKey}`);
      } else {
        targetCell.nodes.set(nodeId, {
          id: nodeId,
          position: { x: position.x, y: position.y },
        });
        cacheLog(`Placed new node ${nodeId} in cell ${newKey} (no cached data yet)`);
      }
    } else {
      cacheLog(`Node ${nodeId} moved to cell ${newKey} (cell not yet created)`);
    }
  }

  insertNode(node: any): void {
    if (!node.id) return;
    
    if (node.position) {
      this._nodePositions.set(node.id, { ...node.position });
      const cellKey = coordToCellKey(node.position.x, node.position.y, this.cellSize);
      this._nodeToCellMap.set(node.id, cellKey);
      
      let cell = this._cells.get(cellKey);
      if (!cell) {
        cell = { nodes: new Map(), edges: new Map(), timestamp: Date.now() };
        this._cells.set(cellKey, cell);
      }
      cell.nodes.set(node.id, { ...node });
    }
  }

  removeNode(nodeId: string): void {
    this._nodePositions.delete(nodeId);
    this._nodeToCellMap.delete(nodeId);
    removeNodeFromCells(this._cells, nodeId);
  }

  insertEdge(edge: any): void {
    if (!edge.id) return;
    
    for (const cell of this._cells.values()) {
      if (cell.nodes.has(edge.source) || cell.nodes.has(edge.target)) {
        cell.edges.set(edge.id, { ...edge });
      }
    }
  }

  removeEdge(edgeId: string): void {
    for (const cell of this._cells.values()) {
      cell.edges.delete(edgeId);
    }
  }

  saveSimulationStatus(nodeId: string, status: string, day: number): void {
    if (status && status !== 'ignorant') {
      this._simulationCache.set(nodeId, { status, day });
    } else {
      this._simulationCache.delete(nodeId);
    }
  }

  getSimulationStatus(nodeId: string): any {
    return this._simulationCache.get(nodeId);
  }

  restoreSimulationToNodes(nodes: any[]): any[] {
    if (this._simulationCache.size === 0) return nodes;
    
    return nodes.map((node: any) => {
      const saved = this._simulationCache.get(node.id);
      if (saved) {
        return {
          ...node,
          data: {
            ...node.data,
            simulation: {
              status: saved.status,
              day: saved.day,
            },
          },
        };
      }
      return node;
    });
  }

  clearSimulationCache(): void {
    this._simulationCache.clear();
  }

  getAllSimulationStatuses(): Map<string, any> {
    return new Map(this._simulationCache);
  }

  clearAllNodes(): void {
    for (const cell of this._cells.values()) {
      cell.nodes.clear();
    }
    this._nodePositions.clear();
    this._nodeToCellMap.clear();
  }

  clearAllEdges(): void {
    for (const cell of this._cells.values()) {
      cell.edges.clear();
    }
  }

  _maybeGarbageCollect(): void {
    if (this._cells.size <= this.maxCells) return;

    const excess = this._cells.size - this.maxCells;
    const sorted = Array.from(this._cells.entries())
      .sort((a: [string, CellData], b: [string, CellData]) => a[1].timestamp - b[1].timestamp);
    const toEvict = sorted.slice(0, excess + Math.floor(this.maxCells * 0.1));

    for (const [key] of toEvict) {
      const cell = this._cells.get(key);
      if (cell) {
        for (const nodeId of cell.nodes.keys()) {
          this._nodePositions.delete(nodeId);
          this._nodeToCellMap.delete(nodeId);
        }
      }
      this._cells.delete(key);
      this._evictions++;
    }
  }

  evictDistantCells(viewport: Viewport, keepRadius: number = 3): void {
    const { x, y, width, height } = viewport;
    const cx1 = Math.floor(x / this.cellSize) - keepRadius;
    const cy1 = Math.floor(y / this.cellSize) - keepRadius;
    const cx2 = Math.floor((x + width) / this.cellSize) + keepRadius;
    const cy2 = Math.floor((y + height) / this.cellSize) + keepRadius;

    for (const key of this._cells.keys()) {
      const [cx, cy] = key.split(':').map(Number);
      if (cx < cx1 || cx > cx2 || cy < cy1 || cy > cy2) {
        const cell = this._cells.get(key);
        if (cell) {
          for (const nodeId of cell.nodes.keys()) {
            this._nodePositions.delete(nodeId);
            this._nodeToCellMap.delete(nodeId);
          }
        }
        this._cells.delete(key);
        this._evictions++;
      }
    }
  }

  getStats(): CacheStats {
    const total = this._hits + this._misses;
    const hitRatio = total === 0 ? 0 : (this._hits / total);
    return {
      cachedCells: this._cells.size,
      pendingCells: this._pending.size,
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      hitRatio: Math.round(hitRatio * 100),
      trackedPositions: this._nodePositions.size,
    };
  }

  clear(): void {
    this._cells.clear();
    this._pending.clear();
    this._nodePositions.clear();
    this._nodeToCellMap.clear();
    this._simulationCache.clear();
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
  }

  clearFull(): void {
    this.clear();
  }
}

export const viewportCache = new ViewportCacheManager();