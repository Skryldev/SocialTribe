import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useNetwork } from '../dashboard/NetworkContext';
import { useViewportGraphStore } from '../ui/viewportGraphStore';
import { viewportCache } from '../ui/viewportCacheManager';
import { getBestHandles } from '../ui/getBestHandles';
import { applyLayout as applyLayoutAPI, syncCurrentLayout } from './LayoutApi';

const LAYOUT_ALGORITHMS: any = {
  'natural': {
    name: 'Natural',
    description: 'Default organic layout based on graph structure',
    maxNodes: 5000,
    backendName: 'Natural',
  },
  'random': {
    name: 'Random Test',
    description: 'Random scattering for baseline comparison',
    maxNodes: 10000,
    backendName: 'Random Test',
  },
  'grid': {
    name: 'Clean Grid',
    description: 'Organize nodes in a clean grid pattern',
    maxNodes: 10000,
    backendName: 'Clean Grid',
  },
  'circular': {
    name: 'Ring',
    description: 'Arrange nodes in a perfect circle',
    maxNodes: 1000,
    backendName: 'Ring',
  },
  'radial': {
    name: 'Ego Network',
    description: 'Radial layout centered on hub nodes',
    maxNodes: 2000,
    backendName: 'Ego Network',
  },
  'concentric': {
    name: 'Centrality Focus',
    description: 'Concentric rings based on centrality metrics',
    maxNodes: 1000,
    backendName: 'Centrality Focus',
  },
  'kamada-kawai': {
    name: 'Publication Ready',
    description: 'High-quality distance-based layout for publications',
    maxNodes: 50,
    backendName: 'Publication Ready',
  },
  'force-directed': {
    name: 'Spread Out',
    description: 'Force-directed layout for general graph exploration',
    maxNodes: 500,
    backendName: 'Spread Out',
  },
  'force-atlas-2': {
    name: 'Tight Clusters',
    description: 'Force Atlas 2 for clustered graph visualization',
    maxNodes: 5000,
    backendName: 'Tight Clusters',
  },
  'spectral': {
    name: 'Community View',
    description: 'Spectral layout revealing community structure',
    maxNodes: 3000,
    backendName: 'Community View',
  },
};

const LAYOUT_PRESETS: any = {
  'natural': {
    name: 'Natural Flow',
    description: 'Default natural layout algorithm',
    algorithm: 'natural',
    params: {},
  },
  'organic': {
    name: 'Organic Spread',
    description: 'Natural force-directed layout',
    algorithm: 'force-directed',
    params: {},
  },
  'dense': {
    name: 'Dense Network',
    description: 'Force Atlas 2 for tightly connected networks',
    algorithm: 'force-atlas-2',
    params: {},
  },
  'circle': {
    name: 'Perfect Circle',
    description: 'Clean circular arrangement',
    algorithm: 'circular',
    params: {},
  },
  'compact': {
    name: 'Compact Grid',
    description: 'Space-efficient grid layout',
    algorithm: 'grid',
    params: {},
  },
  'hub-spoke': {
    name: 'Hub & Spoke',
    description: 'Radial view centered on important nodes',
    algorithm: 'radial',
    params: {},
  },
  'scatter': {
    name: 'Random Scatter',
    description: 'Pseudo-random distribution for testing',
    algorithm: 'random',
    params: {},
  },
  'publication': {
    name: 'Publication Quality',
    description: 'Kamada-Kawai for paper-ready figures',
    algorithm: 'kamada-kawai',
    params: {},
  },
  'communities': {
    name: 'Community Structure',
    description: 'Spectral layout revealing community patterns',
    algorithm: 'spectral',
    params: {},
  },
  'centrality': {
    name: 'Centrality Rings',
    description: 'Concentric layout by importance ranking',
    algorithm: 'concentric',
    params: {},
  },
};

function recalculateEdgeHandles(edges: any[], nodes: any[]): any[] {
  if (!edges?.length || !nodes?.length) return edges ?? [];

  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  return edges.map((edge: any) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) return edge;

    const bestHandles = getBestHandles(sourceNode, targetNode);

    return {
      ...edge,
      sourceHandle: bestHandles.sourceHandle,
      targetHandle: bestHandles.targetHandle,
    };
  });
}

interface UseLayoutEngineOptions {
  transitionDuration?: number;
  maxUndoStack?: number;
}

export function useLayoutEngine(_setNodes: any, options: UseLayoutEngineOptions = {}): any {
  const { transitionDuration = 800, maxUndoStack = 10 } = options;

  const {
    users,
    adjacencyList,
    loading: networkLoading,
    error: networkError,
  } = useNetwork();

  const { fitView } = useReactFlow();

  const abortRef = useRef<any>(null);
  const currentLayoutRef = useRef<string | null>(null);
  const currentModeRef = useRef<string | null>(null);

  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentLayout, setCurrentLayout] = useState<string | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const [layoutMode, setLayoutMode] = useState<string | null>(null);
  const [layoutParams, setLayoutParams] = useState<any>({});

  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  const layoutNodes = useMemo(() => {
    if (!users?.length) return [];
    return users.map((user: any) => ({
      id: user.id,
      position: user.position ?? { x: 0, y: 0 },
      degree: adjacencyList[user.id]?.length ?? 0,
      centrality: user.centrality ?? user.avgDistance ?? 0,
      name: user.name ?? user.id,
      role: user.role,
      nodeType: user.nodeType,
    }));
  }, [users, adjacencyList]);

  const layoutEdges = useMemo(() => {
    if (!adjacencyList) return [];
    const edges: any[] = [];
    const seen = new Set<string>();

    for (const [source, targets] of Object.entries(adjacencyList)) {
      if (!Array.isArray(targets)) continue;
      for (const target of targets) {
        const key = [source, target].sort().join('--');
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ source, target });
        }
      }
    }

    return edges;
  }, [adjacencyList]);

  const pushUndo = useCallback(
    (snapshot: any) => {
      setUndoStack((prev: any[]) => {
        const next = [...prev, snapshot];
        return next.length > maxUndoStack ? next.slice(1) : next;
      });
      setRedoStack([]);
    },
    [maxUndoStack]
  );

  const applyPositions = useCallback(
    (positionedNodes: any[], algorithm: string) => {
      const store = useViewportGraphStore.getState();
      const currentNodes = store.nodes;
      const currentEdges = store.edges;

      if (!currentNodes?.length) return;

      const positionMap = new Map(
        positionedNodes.map((n: any) => {
          const pos = n.position ?? { x: n.x ?? 0, y: n.y ?? 0 };
          return [n.id, pos];
        })
      );

      pushUndo({
        positions: currentNodes.map((n: any) => ({
          id: n.id,
          position: n.position ? { ...n.position } : { x: 0, y: 0 },
        })),
        algorithm: currentLayoutRef.current,
        mode: currentModeRef.current,
        timestamp: Date.now(),
      });

      const updatedNodes = currentNodes.map((node: any) => {
        const pos = positionMap.get(node.id);
        if (!pos) return node;
        if (node.position?.x === pos.x && node.position?.y === pos.y) return node;

        viewportCache.patchNodePosition(node.id, pos);
        store.recordNodeMove(node.id, pos, node.type, node.data);

        return { ...node, position: { ...pos } };
      });

      const updatedEdges = recalculateEdgeHandles(currentEdges, updatedNodes);

      store.mergeGraph(updatedNodes, updatedEdges);

      setTimeout(() => {
        fitView({
          padding: 0.2,
          duration: transitionDuration,
          includeHiddenNodes: false,
        });
      }, 100);

      currentLayoutRef.current = algorithm;
      setCurrentLayout(algorithm);
    },
    [fitView, transitionDuration, pushUndo]
  );

  const applyLayout = useCallback(
    async (internalKey: string, params: any = {}, mode: string = 'custom') => {
      if (networkLoading || networkError) {
        setLayoutError(networkError ?? 'Network data is still loading');
        return;
      }
      if (!layoutNodes.length) {
        setLayoutError('No nodes to layout');
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsCalculating(true);
      setLayoutError(null);
      setProgress(10);

      try {
        const interval = setInterval(() => {
          setProgress((prev: number) => (prev >= 80 ? prev : prev + Math.random() * 15));
        }, 300);

        const response = await applyLayoutAPI(internalKey, params);

        clearInterval(interval);
        setProgress(90);

        setExecutionTime(response.executionTimeMs);
        console.log(
          `✅ Layout "${internalKey}" computed in ${response.executionTimeMs}ms`
        );

        applyPositions(response.nodes, response.algorithm ?? internalKey);

        setLayoutMode(mode as any);
        setLayoutParams(params);
        currentModeRef.current = mode;

        syncCurrentLayout(internalKey, mode as any, params as any).then((synced: boolean) => {
          if (synced) {
            console.log('✅ Layout synced to server');
          } else {
            console.warn('⚠️ Layout sync failed, but layout applied locally');
          }
        });

        setProgress(100);
        setIsCalculating(false);

        setTimeout(() => {
          setProgress(0);
          setExecutionTime(null);
        }, 1500);
      } catch (error: any) {
        console.error('❌ Layout failed:', error);
        setLayoutError(error.message ?? 'Layout calculation failed');
        setIsCalculating(false);
        setProgress(0);
      }
    },
    [layoutNodes, networkLoading, networkError, applyPositions]
  );

  const applyPreset = useCallback(
    (presetName: string) => {
      const preset = LAYOUT_PRESETS[presetName];
      if (!preset) {
        setLayoutError(`Unknown preset: ${presetName}`);
        return;
      }
      applyLayout(preset.algorithm, preset.params, 'preset');
    },
    [applyLayout]
  );

  const cancelLayout = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsCalculating(false);
    setProgress(0);
    setLayoutError(null);
  }, []);

  const undoLayout = useCallback(() => {
    if (!undoStack.length) return;

    const snapshot = redoStack[redoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const store = useViewportGraphStore.getState();

    setRedoStack((prev: any[]) => [
      ...prev,
      {
        positions: store.nodes.map((n: any) => ({
          id: n.id,
          position: n.position ? { ...n.position } : { x: 0, y: 0 },
        })),
        algorithm: currentLayout,
        mode: layoutMode,
        timestamp: Date.now(),
      },
    ]);

    const positionMap = new Map(snapshot.positions.map((p: any) => [p.id, p.position]));

    const restoredNodes = store.nodes.map((node: any) => {
      const pos = positionMap.get(node.id);
      if (!pos) return node;
      viewportCache.patchNodePosition(node.id, pos as any);
      store.recordNodeMove(node.id, pos, node.type, node.data);
      return { ...node, position: pos };
    });

    store.mergeGraph(
      restoredNodes,
      recalculateEdgeHandles(store.edges, restoredNodes)
    );

    setUndoStack(newUndo);
    setCurrentLayout(snapshot.algorithm);
    setLayoutMode(snapshot.mode);
    currentModeRef.current = snapshot.mode;

    if (snapshot.algorithm && snapshot.mode) {
      syncCurrentLayout(snapshot.algorithm, snapshot.mode, {} as any);
    }

    setTimeout(() => {
      fitView({ padding: 0.2, duration: transitionDuration });
    }, 100);
  }, [undoStack, fitView, transitionDuration, currentLayout, layoutMode]);

  const redoLayout = useCallback(() => {
    if (!redoStack.length) return;

    const snapshot = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const store = useViewportGraphStore.getState();

    setUndoStack((prev: any[]) => [
      ...prev,
      {
        positions: store.nodes.map((n: any) => ({
          id: n.id,
          position: n.position ? { ...n.position } : { x: 0, y: 0 },
        })),
        algorithm: currentLayout,
        mode: layoutMode,
        timestamp: Date.now(),
      },
    ]);

    const positionMap = new Map(snapshot.positions.map((p: any) => [p.id, p.position]));

    const redoneNodes = store.nodes.map((node: any) => {
      const pos = positionMap.get(node.id);
      if (!pos) return node;
      viewportCache.patchNodePosition(node.id, pos as any);
      store.recordNodeMove(node.id, pos, node.type, node.data);
      return { ...node, position: pos };
    });

    store.mergeGraph(
      redoneNodes,
      recalculateEdgeHandles(store.edges, redoneNodes)
    );

    setRedoStack(newRedo);
    setCurrentLayout(snapshot.algorithm);
    setLayoutMode(snapshot.mode);
    currentModeRef.current = snapshot.mode;

    if (snapshot.algorithm && snapshot.mode) {
      syncCurrentLayout(snapshot.algorithm, snapshot.mode, {} as any);
    }

    setTimeout(() => {
      fitView({ padding: 0.2, duration: transitionDuration });
    }, 100);
  }, [redoStack, fitView, transitionDuration, currentLayout, layoutMode]);

  const exportLayoutPositions = useCallback(() => {
    const store = useViewportGraphStore.getState();

    const data = {
      positions: store.nodes.map((n: any) => ({
        id: n.id,
        position: n.position,
        name: n.data?.name ?? n.data?.label ?? n.id,
        degree: adjacencyList[n.id]?.length ?? 0,
      })),
      algorithm: currentLayout,
      mode: layoutMode,
      timestamp: new Date().toISOString(),
      nodeCount: store.nodes.length,
      edgeCount: store.edges.length,
      executionTimeMs: executionTime,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layout-${currentLayout ?? 'export'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return JSON.stringify(data, null, 2);
  }, [adjacencyList, currentLayout, layoutMode, executionTime]);

  const algorithms = useMemo(() => {
    const count = layoutNodes.length;
    return Object.entries(LAYOUT_ALGORITHMS).map(([key, value]: [string, any]) => ({
      ...value,
      key,
      isAvailable: count <= value.maxNodes,
      currentNodeCount: count,
    }));
  }, [layoutNodes.length]);

  const presets = useMemo(() => LAYOUT_PRESETS, []);

  const suggestedLayout = useMemo(() => {
    const n = layoutNodes.length;
    if (!n) return null;
    if (n <= 50) return 'kamada-kawai';
    if (n <= 200) return 'force-directed';

    const avgDegree = layoutEdges.length
      ? (2 * layoutEdges.length) / n
      : 0;

    return avgDegree > 5 ? 'force-atlas-2' : 'force-directed';
  }, [layoutNodes.length, layoutEdges.length]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    applyLayout,
    applyPreset,
    cancelLayout,
    undoLayout,
    redoLayout,
    exportLayoutPositions,

    isCalculating,
    progress,
    currentLayout,
    layoutError,
    executionTime,
    networkLoading,
    networkError,

    layoutMode,
    layoutParams,

    algorithms,
    presets,
    suggestedLayout,
    nodeCount: layoutNodes.length,
    edgeCount: layoutEdges.length,

    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoStackSize: undoStack.length,
    redoStackSize: redoStack.length,
  };
}