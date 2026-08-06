import { useCallback, useRef } from 'react';
import { addEdge } from '@xyflow/react';
import { getBestHandles, processBackendEdges } from './getBestHandles';

import { patchNode, postEdge, deleteNode as apiDeleteNode } from './graphApi';
import { viewportCache } from './viewportCacheManager';
import { useViewportGraphStore } from './viewportGraphStore';
import { queryClient } from './queryConfig';

const LOG = true;
const logWarn = (...args: any[]) => LOG && console.warn('[GraphSync] ⚠️', ...args);
const logError = (...args: any[]) => LOG && console.error('[GraphSync] ❌', ...args);

function toBackendNodeData(nodeId: string, data: any): any {
  if (!data) return { id: nodeId };
  
  const clean: any = {
    id: nodeId,
    name: data.name,
    nodeType: data.nodeType || 'socialUser',
    role: data.role || 'normal',
    friendCount: data.friendCount ?? 0,
    avgDistance: data.avgDistance ?? 0,
    centrality: data.centrality ?? 0,
  };
  
  Object.keys(clean).forEach((k: string) => {
    if (clean[k] === undefined) delete clean[k];
  });
  
  return clean;
}

function isValidPosition(position: any): boolean {
  const valid = (
    position &&
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    isFinite(position.x) &&
    isFinite(position.y)
  );
  if (!valid) {
    logWarn('Position validation FAILED', {
      position,
      hasPosition: !!position,
      typeOfX: position ? typeof position.x : 'N/A',
      typeOfY: position ? typeof position.y : 'N/A',
    });
  }
  return valid;
}

interface GraphSyncOptions {
  getEdgeType?: (connection: any) => string;
  onSyncError?: (err: any, ctx: any) => void;
}

export function useGraphSync(setEdges: any, options: GraphSyncOptions = {}): any {
  const getEdgeTypeRef = useRef<any>(options.getEdgeType ?? (() => 'friendship'));
  const onSyncErrorRef = useRef<any>(options.onSyncError ?? null);

  getEdgeTypeRef.current = options.getEdgeType ?? (() => 'friendship');
  onSyncErrorRef.current = options.onSyncError ?? null;

  const updateEdgeHandlesForNode = useCallback((nodeId: string, nodes: any[], edges: any[]): any[] => {
    const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));
    const movedNode = nodeMap.get(nodeId);
    if (!movedNode) return edges;

    return edges.map((edge: any) => {
      if (edge.source !== nodeId && edge.target !== nodeId) return edge;
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) return edge;
      const bestHandles = getBestHandles(sourceNode, targetNode);
      return { ...edge, sourceHandle: bestHandles.sourceHandle, targetHandle: bestHandles.targetHandle };
    });
  }, []);

  const onNodeDragStop = useCallback((_event: any, node: any) => {
    const { id, position, type, data } = node;

    if (!id) {
      logWarn('onNodeDragStop: missing id, skipping');
      return;
    }

    if (!isValidPosition(position)) {
      logWarn(`Invalid position for "${id}", skipping sync`);
      return;
    }

    const store = useViewportGraphStore.getState();
    store.recordNodeMove(id, position, type, data);
    viewportCache.patchNodePosition(id, position);

    const currentNodes = store.nodes.map((n: any) => n.id === id ? { ...n, position } : n);
    const updatedEdges = updateEdgeHandlesForNode(id, currentNodes, store.edges);
    if (JSON.stringify(updatedEdges) !== JSON.stringify(store.edges)) {
      store.mergeGraph(currentNodes, updatedEdges);
    }

    const backendData = toBackendNodeData(id, data);

    const payload = {
      id,
      position: { x: position.x, y: position.y },
      type: type || 'socialUser',
      data: backendData,
    };

    patchNode(id, payload)
      .catch((err: any) => {
        logError(`PATCH failed for "${id}"`, {
          error: err.message,
          status: err.status,
          serverDetail: err.data?.detail,
        });
        onSyncErrorRef.current?.(err, { type: 'position', nodeId: id, position });
      });
  }, [updateEdgeHandlesForNode]);

  const onConnect = useCallback(
    (connection: any) => {
      const store = useViewportGraphStore.getState();
      const sourceNode = store._nodeMap.get(connection.source);
      const targetNode = store._nodeMap.get(connection.target);
      const bestHandles = getBestHandles(sourceNode, targetNode);
      const edgeId = `${connection.source.slice(0, 8)}__${connection.target.slice(0, 8)}__${Date.now().toString(36)}`;

      const newEdge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || bestHandles.sourceHandle,
        targetHandle: connection.targetHandle || bestHandles.targetHandle,
        type: 'weightedEdge',
        data: {
          Weight: 50,
          id: connection.source,
          targetId: connection.target,
          createdAt: new Date().toISOString(),
        },
      };

      store.recordEdgeAdd(edgeId);
      viewportCache.insertEdge(newEdge);
      setEdges((eds: any) => addEdge(newEdge, eds));

      postEdge(newEdge)
        .catch((err: any) => {
          logError(`Edge sync failed for "${edgeId}":`, err);
          onSyncErrorRef.current?.(err, { type: 'edge', edge: newEdge });
        });
    },
    [setEdges]
  );

  const onNodesDelete = useCallback(
    async (deletedNodes: any[]) => {
      if (!deletedNodes?.length) return;
      const store = useViewportGraphStore.getState();
      const deletedIds = new Set(deletedNodes.map((n: any) => n.id));
      
      deletedNodes.forEach((node: any) => {
        store.recordNodeDelete(node.id);
        viewportCache.removeNode(node.id);
      });

      const { edges: currentEdges, nodes: currentNodes } = store;
      const orphanEdgeIds = currentEdges
        .filter((e: any) => deletedIds.has(e.source) || deletedIds.has(e.target))
        .map((e: any) => e.id);

      orphanEdgeIds.forEach((edgeId: string) => {
        store.recordEdgeDelete(edgeId);
        viewportCache.removeEdge(edgeId);
      });

      const filteredEdges = currentEdges.filter(
        (e: any) => !deletedIds.has(e.source) && !deletedIds.has(e.target)
      );
      const remainingNodes = currentNodes.filter((n: any) => !deletedIds.has(n.id));
      const updatedEdges = processBackendEdges(filteredEdges, remainingNodes);
      store.mergeGraph(remainingNodes, updatedEdges);

      const deletePromises = deletedNodes.map((node: any) =>
        apiDeleteNode(node.id)
          .catch((err: any) => {
            if (err.status === 404) {
              logWarn(`Node "${node.id}" not found in backend (404). Local state already updated.`);
              return;
            }
            logError(`Node delete failed for "${node.id}":`, err);
            onSyncErrorRef.current?.(err, { type: 'nodeDelete', nodeId: node.id });
            throw err;
          })
      );
      await Promise.all(deletePromises);
      
      queryClient.invalidateQueries({ queryKey: ['viewport-graph'] });
    },
    [setEdges]
  );

  return { onNodeDragStop, onConnect, onNodesDelete };
}