import { useState, useCallback, useRef } from 'react';
import { postNode }                       from './graphApi';
import { viewportCache }                  from './viewportCacheManager';
import { useViewportGraphStore }          from './viewportGraphStore';

function toBackendNode(node: any): any {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      id: node.data.id,
      name: node.data.name,
      nodeType: node.data.nodeType || 'socialUser',
      role: node.data.role || 'normal',
      friendCount: node.data.friendCount ?? 0,
      avgDistance: node.data.avgDistance ?? 0,
      centrality: node.data.centrality ?? 0,
    },
  };
}

interface NodeCallbacks {
  onUserUpdate?: (id: any, updates: any) => void;
  onFriendSuggest?: (id: any) => void;
  onShortestPath?: (srcId: any) => void;
  onDelete?: (id: any) => void;
}

interface AddNodeOptions {
  onError?: (err: any, node: any) => void;
}

interface FormState {
  screenPos: { x: number; y: number };
  flowPos: any;
}

interface AddNodeParams {
  id: string;
  name: string;
  position?: { x: number; y: number };
  nodeType?: string;
}

export function useAddNode(
  setNodes: any,
  setHasUnsavedChanges: any,
  nodeCallbacks: NodeCallbacks = {},
  options: AddNodeOptions = {}
): any {
  const [formState, setFormState] = useState<FormState | null>(null);

  const callbacksRef = useRef<NodeCallbacks>(nodeCallbacks);
  callbacksRef.current = nodeCallbacks;

  const onErrorRef = useRef<any>(options.onError);
  onErrorRef.current = options.onError;

  const openForm = useCallback((screenPos: { x: number; y: number }, flowPos: any) => {
    setFormState({ screenPos, flowPos });
  }, []);

  const closeForm = useCallback(() => setFormState(null), []);

  const addNode = useCallback(
    async ({ id, name, position, nodeType = 'socialUser' }: AddNodeParams) => {
      const safePosition = (
        position &&
        typeof position.x === 'number' &&
        typeof position.y === 'number'
      ) ? position : { x: 0, y: 0 };

      const {
        onUserUpdate    = (nid: any, u: any) => console.log('Update', nid, u),
        onFriendSuggest = (nid: any)    => console.log('Suggest for', nid),
        onShortestPath  = (sid: any)    => console.log('Shortest path from', sid),
        onDelete        = (nid: any)    => console.log('Delete', nid),
      } = callbacksRef.current;

      const newNode = {
        id,
        type: 'socialUser',
        position: safePosition,
        data: {
          id,
          name,
          nodeType,
          friendCount: 0,
          avgDistance: 0,
          centrality:  0,
          onUserUpdate,
          onFriendSuggest,
          onShortestPath,
          onDelete,
        },
      };

      useViewportGraphStore.getState().recordNodeAdd(id);

      viewportCache.insertNode(newNode);

      setNodes((nds: any) => [...nds, newNode]);
      setHasUnsavedChanges?.(true);
      setFormState(null);

      try {
        await postNode(toBackendNode(newNode));
      } catch (err) {
        console.error('[useAddNode] Backend persist failed:', err);
        onErrorRef.current?.(err, newNode);
      }
    },
    [setNodes, setHasUnsavedChanges],
  );

  return { openForm, closeForm, addNode, formState, isOpen: formState !== null };
}