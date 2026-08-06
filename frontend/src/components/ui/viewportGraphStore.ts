import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { viewportCache } from './viewportCacheManager';

const LOG = true;
const logWarn = (...args: any[]) => LOG && console.warn('[Store] ⚠️', ...args);

const DEFAULT_NODE_TYPE = 'socialUser';
const DEFAULT_POSITION = { x: 0, y: 0 };
const INITIAL_STATS = {
  visibleNodes: 0, visibleEdges: 0, cachedCells: 0, pendingCells: 0,
  hitRatio: 0, activeRequests: 0, viewportX: 0, viewportY: 0, zoom: 1,
};

const pickCallbacks = (data: any): any => data ? {
  onUserUpdate: data.onUserUpdate,
  onFriendSuggest: data.onFriendSuggest,
  onShortestPath: data.onShortestPath,
  onDelete: data.onDelete,
} : {};

const resolveSimulation = (existingData: any, incomingData: any): any => {
  if (incomingData?.simulation) return incomingData.simulation;
  if (existingData?.simulation) return existingData.simulation;
  return null;
};

const buildNodeData = (existing: any, incoming: any, _local: any): any => {
  const backendData = incoming?.data || {};
  const callbacks = pickCallbacks(existing?.data);
  const simulation = resolveSimulation(existing?.data, backendData);

  const data = { ...backendData, ...callbacks };
  if (simulation) data.simulation = simulation;

  if (!data.nodeType && !data.name) {
    logWarn('buildNodeData: incoming data seems empty', {
      nodeId: incoming?.id,
      backendDataKeys: Object.keys(backendData),
      hasCallbacks: Object.keys(callbacks).length > 0,
    });
  }

  return data;
};

const hasNodeChanged = (existing: any, merged: any): boolean => {
  if (!existing) return true;
  
  if (merged.data?.simulation) return true;
  if (existing.data?.simulation && !merged.data?.simulation) return true;
  
  return (
    existing.position?.x !== merged.position?.x ||
    existing.position?.y !== merged.position?.y ||
    existing.type !== merged.type ||
    JSON.stringify(existing.data?.simulation) !== JSON.stringify(merged.data?.simulation) ||
    existing.data?.friendCount !== merged.data?.friendCount ||
    existing.data?.centrality !== merged.data?.centrality ||
    existing.data?.avgDistance !== merged.data?.avgDistance ||
    existing.data?.role !== merged.data?.role ||
    existing.data?.name !== merged.data?.name
  );
};

const resolvePosition = (local: any, existing: any, incoming: any): any => {
  const pos = local?.position || existing?.position || incoming?.position || DEFAULT_POSITION;
  
  if (!local?.position && !existing?.position && !incoming?.position) {
    logWarn('resolvePosition: falling back to DEFAULT', {
      incomingId: incoming?.id,
      localPos: local?.position,
      existingPos: existing?.position,
      incomingPos: incoming?.position,
    });
  }
  
  return pos;
};

const resolveType = (local: any, existing: any, incoming: any): string => {
  const resolved = local?.type || existing?.type || incoming?.type || DEFAULT_NODE_TYPE;
  
  if (resolved === DEFAULT_NODE_TYPE && !existing?.type && !incoming?.type) {
    logWarn('resolveType: falling back to DEFAULT_NODE_TYPE', {
      nodeId: incoming?.id || existing?.id || 'unknown',
      localType: local?.type,
      existingType: existing?.type,
      incomingType: incoming?.type,
      incomingHasId: !!incoming?.id,
      incomingKeys: incoming ? Object.keys(incoming) : [],
      incomingDataType: incoming?.type,
      incomingDataKeys: incoming?.data ? Object.keys(incoming.data).slice(0, 10) : [],
    });
  }
  
  if (resolved === 'undefined' || resolved === undefined) {
    logWarn('resolveType: resolved to undefined/null!', {
      nodeId: incoming?.id || existing?.id || 'unknown',
      localType: local?.type,
      existingType: existing?.type,
      incomingType: incoming?.type,
      resolved: resolved,
    });
  }
  
  return resolved;
};

interface StoreState {
  nodes: any[];
  edges: any[];
  _nodeMap: Map<string, any>;
  _edgeMap: Map<string, any>;
  _localNodes: Map<string, any>;
  _localEdges: Map<string, any>;
  isLoading: boolean;
  isFetching: boolean;
  error: any;
  initialLoadDone: boolean;
  lastViewport: any;
  stats: any;
  recordNodeMove: (nodeId: string, position: any, nodeType?: string, nodeData?: any) => void;
  recordNodeAdd: (nodeId: string) => void;
  recordNodeDelete: (nodeId: string) => void;
  recordEdgeAdd: (edgeId: string) => void;
  recordEdgeDelete: (edgeId: string) => void;
  mergeGraph: (incomingNodes: any[], incomingEdges: any[]) => void;
  pruneGraph: (keepNodeIds: Set<string>, keepEdgeIds: Set<string>) => void;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  clearNewFlags: () => void;
  setLoading: (isLoading: boolean) => void;
  setFetching: (isFetching: boolean) => void;
  setError: (error: any) => void;
  setLastViewport: (v: any) => void;
  updateStats: (partial: any) => void;
  reset: () => void;
  resetGraph: () => void;
}

export const useViewportGraphStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    nodes: [],
    edges: [],
    _nodeMap: new Map(),
    _edgeMap: new Map(),
    _localNodes: new Map(),
    _localEdges: new Map(),
    isLoading: false,
    isFetching: false,
    error: null,
    initialLoadDone: false,
    lastViewport: { x: 0, y: 0, zoom: 1 },
    stats: { ...INITIAL_STATS },

    recordNodeMove(nodeId, position, nodeType = DEFAULT_NODE_TYPE, nodeData = {}) {
      const { _localNodes, _nodeMap } = get();
      const existing = _localNodes.get(nodeId) ?? {};
      const existingNode = _nodeMap.get(nodeId);
      
      const finalType = nodeType || existingNode?.type || DEFAULT_NODE_TYPE;
      const finalData = nodeData || existingNode?.data || {};
      
      if (!nodeType && !existingNode?.type) {
        logWarn('recordNodeMove: no type available, using default', {
          nodeId,
          passedType: nodeType,
          existingNodeType: existingNode?.type,
          finalType,
        });
      }
      
      _localNodes.set(nodeId, {
        ...existing,
        position,
        type: finalType,
        data: finalData,
      });
    },

    recordNodeAdd(nodeId) {
      const { _localNodes } = get();
      if (!_localNodes.has(nodeId)) _localNodes.set(nodeId, {});
    },

    recordNodeDelete(nodeId) {
      const { _localNodes } = get();
      _localNodes.set(nodeId, { deleted: true });
    },

    recordEdgeAdd(edgeId) {
      const { _localEdges } = get();
      if (!_localEdges.has(edgeId)) _localEdges.set(edgeId, {});
    },

    recordEdgeDelete(edgeId) {
      const { _localEdges } = get();
      _localEdges.set(edgeId, { deleted: true });
    },

    mergeGraph(incomingNodes, incomingEdges) {
      const state = get();
      const { _nodeMap, _edgeMap, _localNodes, _localEdges } = state;

      const newNodes = incomingNodes.filter((n: any) => !_nodeMap.has(n.id));
      const restoredNodes = viewportCache.restoreSimulationToNodes(newNodes);
      const existingNodes = incomingNodes.filter((n: any) => _nodeMap.has(n.id));
      const nodesToMerge = [...existingNodes, ...restoredNodes];

      let changed = false;

      for (const [nodeId, local] of _localNodes.entries()) {
        if (local?.deleted && _nodeMap.has(nodeId)) {
          _nodeMap.delete(nodeId);
          changed = true;
        }
      }

      let simKept = 0;
      let simLost = 0;
      let typeIssues = 0;
      
      for (const node of nodesToMerge) {
        const local = _localNodes.get(node.id);
        if (local?.deleted) continue;

        const existing = _nodeMap.get(node.id);
        const position = resolvePosition(local, existing, node);
        const finalType = resolveType(local, existing, node);
        const finalData = buildNodeData(existing, node, local);

        if (!finalType || finalType === 'undefined' || finalType === 'socialUser' && !node.type && !existing?.type) {
          typeIssues++;
          logWarn(`🔍 Node ${node.id} type resolution:`, {
            'node.type (incoming)': node.type,
            'existing?.type': existing?.type,
            'local?.type': local?.type,
            'finalType': finalType,
            'node has data?': !!node.data,
            'node data keys': node.data ? Object.keys(node.data).slice(0, 10) : [],
            'existing has data?': !!existing?.data,
          });
        }

        const hadSim = !!(existing?.data?.simulation || node.data?.simulation);
        const hasSim = !!finalData.simulation;
        if (hadSim && hasSim) simKept++;
        if (hadSim && !hasSim) {
          simLost++;
          logWarn(`   ❌ Simulation LOST for ${node.id}:`, {
            existing: existing?.data?.simulation,
            incoming: node.data?.simulation,
            resolved: finalData.simulation,
          });
        }

        const merged = { ...node, position, type: finalType, data: finalData };

        if (hasNodeChanged(existing, merged)) {
          _nodeMap.set(node.id, { ...merged, _isNew: !existing });
          changed = true;
        }
      }

      for (const [edgeId, local] of _localEdges.entries()) {
        if (local?.deleted && _edgeMap.has(edgeId)) {
          _edgeMap.delete(edgeId);
          changed = true;
        }
      }

      for (const edge of incomingEdges) {
        const local = _localEdges.get(edge.id);
        if (local?.deleted) continue;
        if (_edgeMap.has(edge.id)) continue;
        _edgeMap.set(edge.id, { ...edge, _isNew: true });
        changed = true;
      }
      
      if (simLost > 0) {
        logWarn(`   ⚠️ Simulation: ${simKept} kept, ${simLost} LOST`);
      }
      
      if (typeIssues > 0) {
        logWarn(`   🔍 Type issues detected in ${typeIssues} nodes`);
      }
      
      if (!changed) {
        return;
      }

      set({
        nodes: Array.from(_nodeMap.values()),
        edges: Array.from(_edgeMap.values()),
        _nodeMap: new Map(_nodeMap),
        _edgeMap: new Map(_edgeMap),
        initialLoadDone: true,
      });
    },

    pruneGraph(keepNodeIds, keepEdgeIds) {
      const { _nodeMap, _edgeMap, _localNodes, _localEdges } = get();
      let nodesPruned = false, edgesPruned = false;

      for (const id of _nodeMap.keys()) {
        const local = _localNodes.get(id);
        if (local && !local.deleted) continue;
        if (!keepNodeIds.has(id)) { 
          _nodeMap.delete(id); 
          nodesPruned = true; 
        }
      }

      for (const id of _edgeMap.keys()) {
        const local = _localEdges.get(id);
        if (local && !local.deleted) continue;
        if (!keepEdgeIds.has(id)) { _edgeMap.delete(id); edgesPruned = true; }
      }

      if (nodesPruned || edgesPruned) {
        set({
          nodes: Array.from(_nodeMap.values()),
          edges: Array.from(_edgeMap.values()),
          _nodeMap: new Map(_nodeMap),
          _edgeMap: new Map(_edgeMap),
        });
      }
    },

    onNodesChange(changes) {
      const { _localNodes } = get();
      for (const change of changes) {
        if (change.type === 'position' && change.position && !change.dragging) {
          const existing = _localNodes.get(change.id) ?? {};
          const currentNode = get()._nodeMap.get(change.id);
          _localNodes.set(change.id, {
            ...existing,
            position: change.position,
            type: currentNode?.type || existing?.type || DEFAULT_NODE_TYPE,
            data: currentNode?.data || existing?.data || {},
          });
        }
      }
      set((state: StoreState) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
    },

    onEdgesChange(changes) {
      set((state: StoreState) => ({ edges: applyEdgeChanges(changes, state.edges) }));
    },

    clearNewFlags() {
      set((state: StoreState) => {
        const hasNew = state.nodes.some((n: any) => n._isNew) || state.edges.some((e: any) => e._isNew);
        if (!hasNew) return state;
        return {
          nodes: state.nodes.map((n: any) => n._isNew ? { ...n, _isNew: false } : n),
          edges: state.edges.map((e: any) => e._isNew ? { ...e, _isNew: false } : e),
        };
      });
    },

    setLoading(isLoading) { set({ isLoading }); },
    setFetching(isFetching) { set({ isFetching }); },
    setError(error) { set({ error }); },
    setLastViewport(v) { set({ lastViewport: v }); },
    updateStats(partial) { set((s: StoreState) => ({ stats: { ...s.stats, ...partial } })); },

    reset() {
      set({
        nodes: [], edges: [],
        _nodeMap: new Map(), _edgeMap: new Map(),
        _localNodes: new Map(), _localEdges: new Map(),
        isLoading: false, isFetching: false, error: null, initialLoadDone: false,
        lastViewport: { x: 0, y: 0, zoom: 1 },
        stats: { ...INITIAL_STATS },
      });
    },

    resetGraph() {
      set({
        nodes: [], edges: [],
        _nodeMap: new Map(), _edgeMap: new Map(),
        _localNodes: new Map(), _localEdges: new Map(),
        isLoading: false, isFetching: false, error: null, initialLoadDone: false,
        lastViewport: { x: 0, y: 0, zoom: 1 },
        stats: { ...INITIAL_STATS },
      });
    },
  }))
);