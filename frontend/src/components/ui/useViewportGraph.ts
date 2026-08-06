import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';

import { buildViewportQuery } from './viewportApi';
import { viewportCache } from './viewportCacheManager';
import { useViewportGraphStore } from './viewportGraphStore';
import { processBackendEdges } from './getBestHandles';
import {
  viewportQueryKey, 
  viewportQueryFn, 
  prefetchViewport, 
  cancelStaleViewportQueries 
} from './queryConfig';

const LOG = true;
const logWarn = (...args: any[]) => LOG && console.warn('[Viewport] ⚠️', ...args);
const logError = (...args: any[]) => LOG && console.error('[Viewport] ❌', ...args);

const DEFAULT_OVERSCAN = 0.5;
const DEBOUNCE_MOVE_MS = 100;
const GC_INTERVAL_MS = 20_000;
const GC_KEEP_RADIUS = 2;
const PREFETCH_DISTANCE = 1.2;
const MAX_CONCURRENT_FETCHES = 2;
const MIN_SPEED_FOR_PREFETCH = 150;

interface UseViewportGraphOptions {
  containerRef?: React.RefObject<any>;
  overscan?: number;
  enabled?: boolean;
}

export function useViewportGraph({
  containerRef,
  overscan = DEFAULT_OVERSCAN,
  enabled = true,
}: UseViewportGraphOptions = {}): any {
  const rfInstance = useReactFlow();

  const mergeGraph = useViewportGraphStore((s: any) => s.mergeGraph);
  const pruneGraph = useViewportGraphStore((s: any) => s.pruneGraph);
  const setLoading = useViewportGraphStore((s: any) => s.setLoading);
  const setFetching = useViewportGraphStore((s: any) => s.setFetching);
  const setError = useViewportGraphStore((s: any) => s.setError);
  const setLastViewport = useViewportGraphStore((s: any) => s.setLastViewport);
  const updateStats = useViewportGraphStore((s: any) => s.updateStats);
  const nodes = useViewportGraphStore((s: any) => s.nodes);
  const edges = useViewportGraphStore((s: any) => s.edges);
  const onNodesChange = useViewportGraphStore((s: any) => s.onNodesChange);
  const onEdgesChange = useViewportGraphStore((s: any) => s.onEdgesChange);
  const isLoading = useViewportGraphStore((s: any) => s.isLoading);
  const isFetching = useViewportGraphStore((s: any) => s.isFetching);
  const initialLoadDone = useViewportGraphStore((s: any) => s.initialLoadDone);
  const error = useViewportGraphStore((s: any) => s.error);

  const [activeQuery, setActiveQuery] = useState<any>(null);

  const debounceTimerRef = useRef<any>(null);
  const lastViewportRef = useRef<any>({ x: 0, y: 0, zoom: 1 });
  const lastMoveTimeRef = useRef<number>(Date.now());
  const directionRef = useRef<any>({ dx: 0, dy: 0 });
  const activeQueryKeyRef = useRef<any>(null);
  const pendingQueryRef = useRef<any>(null);
  const gcTimerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const activeFetchesRef = useRef<Set<string>>(new Set());
  const lastFetchTimeRef = useRef<number>(0);

  const getContainerSize = useCallback(() => {
    if (containerRef?.current) {
      return {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }, [containerRef]);

  const updateStatsFromCache = useCallback((rfViewport: any, query: any) => {
    const cacheStats = viewportCache.getStats();
    updateStats({
      visibleNodes: nodes.length,
      visibleEdges: edges.length,
      cachedCells: cacheStats.cachedCells,
      pendingCells: cacheStats.pendingCells,
      hitRatio: cacheStats.hitRatio,
      activeRequests: activeFetchesRef.current.size,
      viewportX: Math.round(query?.x ?? rfViewport.x),
      viewportY: Math.round(query?.y ?? rfViewport.y),
      zoom: Math.round((rfViewport.zoom ?? 1) * 100) / 100,
    });
  }, [nodes.length, edges.length, updateStats]);

  const schedulePrefetch = useCallback((currentViewport: any, direction: any) => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 500) return;
    if (activeFetchesRef.current.size >= MAX_CONCURRENT_FETCHES) return;

    const { width, height } = getContainerSize();
    const speed = Math.abs(direction.dx) + Math.abs(direction.dy);
    
    if (speed < MIN_SPEED_FOR_PREFETCH) return;

    const isMovingRight = direction.dx > 10;
    const isMovingLeft = direction.dx < -10;
    const isMovingDown = direction.dy > 10;
    const isMovingUp = direction.dy < -10;

    let prefetchViewportArea: any = null;

    if (isMovingRight) {
      prefetchViewportArea = {
        x: currentViewport.x + width * PREFETCH_DISTANCE,
        y: currentViewport.y,
        zoom: currentViewport.zoom,
      };
    } else if (isMovingLeft) {
      prefetchViewportArea = {
        x: currentViewport.x - width * PREFETCH_DISTANCE,
        y: currentViewport.y,
        zoom: currentViewport.zoom,
      };
    } else if (isMovingDown) {
      prefetchViewportArea = {
        x: currentViewport.x,
        y: currentViewport.y + height * PREFETCH_DISTANCE,
        zoom: currentViewport.zoom,
      };
    } else if (isMovingUp) {
      prefetchViewportArea = {
        x: currentViewport.x,
        y: currentViewport.y - height * PREFETCH_DISTANCE,
        zoom: currentViewport.zoom,
      };
    }

    if (!prefetchViewportArea) return;

    const query = buildViewportQuery(prefetchViewportArea, width, height, overscan);
    const { miss } = viewportCache.classifyViewport(query);
    
    if (miss.length === 0) return;

    const fetchKey = JSON.stringify(viewportQueryKey(query));
    if (activeFetchesRef.current.has(fetchKey)) return;

    activeFetchesRef.current.add(fetchKey);
    lastFetchTimeRef.current = now;

    prefetchViewport(query).then(({ data }: any = {}) => {
      if (data && isMountedRef.current) {
        const processedEdges = processBackendEdges(data.edges || [], data.nodes || []);
        viewportCache.storeViewportData(query, data.nodes || [], processedEdges);
      }
      activeFetchesRef.current.delete(fetchKey);
    }).catch(() => {
      activeFetchesRef.current.delete(fetchKey);
    });
  }, [getContainerSize, overscan]);

  const updateDirection = useCallback((rfViewport: any) => {
    const now = Date.now();
    const last = lastViewportRef.current;
    
    const dx = rfViewport.x - last.x;
    const dy = rfViewport.y - last.y;
    
    directionRef.current = {
      dx: directionRef.current.dx * 0.6 + dx * 0.4,
      dy: directionRef.current.dy * 0.6 + dy * 0.4,
    };
    
    lastViewportRef.current = rfViewport;
    lastMoveTimeRef.current = now;
    
    return directionRef.current;
  }, []);

  const dispatchViewportFetch = useCallback((rfViewport: any, isImmediate: boolean = false) => {
    if (!enabled || !isMountedRef.current) return;

    const { width, height } = getContainerSize();
    const query = buildViewportQuery(rfViewport, width, height, overscan);
    const key = JSON.stringify(viewportQueryKey(query));

    if (key === activeQueryKeyRef.current) {
      return;
    }

    cancelStaleViewportQueries(key);
    activeQueryKeyRef.current = key;

    const { miss } = viewportCache.classifyViewport(query);

    if (miss.length === 0) {
      const cached = viewportCache.getForViewport(query);
      if (cached.nodes.length > 0) {
        const nodesMissingType = cached.nodes.filter((n: any) => !n.type);
        const nodesMissingData = cached.nodes.filter((n: any) => !n.data || Object.keys(n.data).length === 0);
        if (nodesMissingType.length > 0) {
          logWarn(`🔍 CACHE ISSUE: ${nodesMissingType.length} nodes missing type:`, 
            nodesMissingType.map((n: any) => ({ id: n.id, keys: Object.keys(n) })));
        }
        if (nodesMissingData.length > 0) {
          logWarn(`🔍 CACHE ISSUE: ${nodesMissingData.length} nodes missing data:`,
            nodesMissingData.map((n: any) => ({ id: n.id, type: n.type })));
        }
        
        mergeGraph(cached.nodes, cached.edges);
        updateStatsFromCache(rfViewport, query);
      }
      return;
    }

    if (!isImmediate) {
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 100) return;
    }

    viewportCache.markPending(miss);
    setFetching(true);
    if (!initialLoadDone) setLoading(true);

    pendingQueryRef.current = query;
    setActiveQuery(query);
    setLastViewport(rfViewport);
    lastFetchTimeRef.current = Date.now();

    const partialCached = viewportCache.getForViewport(query);
    if (partialCached.nodes.length > 0) {
      mergeGraph(partialCached.nodes, partialCached.edges);
    }
  }, [enabled, getContainerSize, overscan, mergeGraph, setFetching, setLoading,
      setLastViewport, initialLoadDone, updateStatsFromCache]);

  const handleViewportChange = useCallback((rfViewport: any) => {
    const direction = updateDirection(rfViewport);
    schedulePrefetch(rfViewport, direction);
    
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      dispatchViewportFetch(rfViewport);
    }, DEBOUNCE_MOVE_MS);
  }, [updateDirection, schedulePrefetch, dispatchViewportFetch]);

  const { data, isError, isFetching: queryFetching } = useQuery({
    queryKey: activeQuery ? viewportQueryKey(activeQuery) : ['viewport-graph', 'idle'],
    queryFn: activeQuery ? viewportQueryFn(activeQuery) : () => ({ nodes: [], edges: [] }),
    enabled: !!activeQuery && enabled,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!data || !activeQuery) return;

    const queryForThisData = pendingQueryRef.current ?? activeQuery;
    const processedEdges = processBackendEdges(
      (data as any).edges || [], 
      (data as any).nodes || []
    );
    
    const incomingNodes = (data as any).nodes || [];
    const nodesMissingType = incomingNodes.filter((n: any) => !n.type);
    const nodesMissingData = incomingNodes.filter((n: any) => !n.data || Object.keys(n.data).length === 0);
    
    if (nodesMissingType.length > 0) {
      logWarn(`🔍 BACKEND ISSUE: ${nodesMissingType.length} nodes missing type:`,
        nodesMissingType.map((n: any) => ({ id: n.id, keys: Object.keys(n) })));
    }
    if (nodesMissingData.length > 0) {
      logWarn(`🔍 BACKEND ISSUE: ${nodesMissingData.length} nodes missing data:`,
        nodesMissingData.map((n: any) => ({ id: n.id, type: n.type, position: n.position })));
    }
    
    viewportCache.storeViewportData(queryForThisData, incomingNodes, processedEdges);
    mergeGraph(incomingNodes, processedEdges);

    setLoading(false);
    setFetching(false);
    setError(null);
    activeQueryKeyRef.current = null;

    updateStatsFromCache(lastViewportRef.current, queryForThisData);
  }, [data, activeQuery, mergeGraph, setLoading, setFetching, setError, updateStatsFromCache]);

  useEffect(() => {
    if (isError) {
      logError('Query error - viewport fetch failed');
      setLoading(false);
      setFetching(false);
      setError('Failed to load graph region. Retrying…');
    }
  }, [isError, setLoading, setFetching, setError]);

  useEffect(() => {
    gcTimerRef.current = setInterval(() => {
      const vp = lastViewportRef.current;
      const { width, height } = getContainerSize();
      const q = buildViewportQuery(vp, width, height, overscan);
      viewportCache.evictDistantCells(q, GC_KEEP_RADIUS);

      const { nodes: cachedNodes, edges: cachedEdges } = viewportCache.getForViewport({
        x: q.x - q.width,
        y: q.y - q.height,
        width: q.width * 3,
        height: q.height * 3,
      });
      
      const keepNodeIds = new Set(cachedNodes.map((n: any) => n.id));
      const keepEdgeIds = new Set(cachedEdges.map((e: any) => e.id));
      
      pruneGraph(keepNodeIds, keepEdgeIds);
    }, GC_INTERVAL_MS);

    return () => clearInterval(gcTimerRef.current);
  }, [getContainerSize, overscan, pruneGraph]);

  const hasInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !rfInstance || hasInitializedRef.current) return;

    const timer = setTimeout(async () => {
      hasInitializedRef.current = true;
      
      const currentNodes = useViewportGraphStore.getState().nodes;
      
      if (currentNodes.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasPosition = false;
        
        for (const node of currentNodes) {
          if (node.position && (node.position.x !== 0 || node.position.y !== 0)) {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x);
            maxY = Math.max(maxY, node.position.y);
            hasPosition = true;
          }
        }
        
        if (hasPosition) {
          const { width, height } = getContainerSize();
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const nodeWidth = maxX - minX;
          const nodeHeight = maxY - minY;
          const zoomX = width / (nodeWidth + 200);
          const zoomY = height / (nodeHeight + 200);
          const zoom = Math.min(zoomX, zoomY, 1.2);
          
          rfInstance.setViewport({
            x: -centerX * zoom + width / 2,
            y: -centerY * zoom + height / 2,
            zoom: zoom,
          });
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const vp = rfInstance.getViewport();
      dispatchViewportFetch(vp, true);
    }, 50);

    return () => clearTimeout(timer);
  }, [enabled, rfInstance, dispatchViewportFetch, getContainerSize]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeout(debounceTimerRef.current);
      if (gcTimerRef.current) clearInterval(gcTimerRef.current);
      activeFetchesRef.current.clear();
    };
  }, []);

  const onMoveEnd = useCallback((_: any, viewport: any) => {
    handleViewportChange(viewport);
  }, [handleViewportChange]);

  const onMove = useCallback((_: any, viewport: any) => {
    handleViewportChange(viewport);
  }, [handleViewportChange]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onMoveEnd,
    onMove,
    isLoading,
    isFetching: isFetching || queryFetching,
    initialLoadDone,
    error,
  };
}