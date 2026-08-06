import { useCallback } from 'react';
import { applyEdgeChanges, applyNodeChanges, addEdge } from '@xyflow/react';

export const useGraphHandlers = (
  setNodes: any,
  setEdges: any,
  setHasUnsavedChanges: any
): any => {
  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds: any) => applyNodeChanges(changes, nds));
    setHasUnsavedChanges(true);
  }, [setNodes, setHasUnsavedChanges]);

  const onEdgesChange = useCallback((changes: any) => {
    setEdges((eds: any) => applyEdgeChanges(changes, eds));
    setHasUnsavedChanges(true);
  }, [setEdges, setHasUnsavedChanges]);

  const onConnect = useCallback((params: any) => {
    setEdges((eds: any) => addEdge(params, eds));
    setHasUnsavedChanges(true);
  }, [setEdges, setHasUnsavedChanges]);

  const onImport = useCallback((options: any = {}) => {
    console.log('🔵 [useGraphHandlers] onImport called with:', {
      hasNodes: !!options.nodes,
      hasEdges: !!options.edges,
      nodeCount: options.nodes?.length,
      edgeCount: options.edges?.length,
      mode: options.mode || options.mergeStrategy,
      hasMetadata: !!options.metadata,
    });

    const incomingNodes = options.nodes || options.incoming || [];
    const incomingEdges = options.edges || options.incomingEdges || [];
    const mode = options.mode || options.mergeStrategy || 'switch';

    if (incomingNodes.length === 0 && incomingEdges.length === 0) {
      console.log('ℹ️ [useGraphHandlers] No nodes or edges to import (metadata-only import)');
      setHasUnsavedChanges(false);
      return;
    }

    console.log(`📥 [useGraphHandlers] Importing with mode: ${mode}`, {
      nodes: incomingNodes.length,
      edges: incomingEdges.length,
    });

    switch (mode) {
      case 'switch':
      case 'replace':
        setNodes(incomingNodes);
        setEdges(incomingEdges);
        break;

      case 'merge': {
        setNodes((prevNodes: any) => {
          const existingNodeIds = new Set(prevNodes.map((n: any) => n.id));
          const newNodes = incomingNodes.filter((n: any) => !existingNodeIds.has(n.id));
          console.log(`🔄 [useGraphHandlers] Merging ${newNodes.length} new nodes`);
          return [...prevNodes, ...newNodes];
        });
        
        setEdges((prevEdges: any) => {
          const existingEdgeIds = new Set(prevEdges.map((e: any) => e.id));
          const newEdges = incomingEdges.filter((e: any) => !existingEdgeIds.has(e.id));
          console.log(`🔄 [useGraphHandlers] Merging ${newEdges.length} new edges`);
          return [...prevEdges, ...newEdges];
        });
        break;
      }

      case 'add':
        setNodes((prev: any) => {
          console.log(`➕ [useGraphHandlers] Adding ${incomingNodes.length} nodes`);
          return [...prev, ...incomingNodes];
        });
        setEdges((prev: any) => {
          console.log(`➕ [useGraphHandlers] Adding ${incomingEdges.length} edges`);
          return [...prev, ...incomingEdges];
        });
        break;

      default:
        console.warn(`⚠️ [useGraphHandlers] Unknown mode: ${mode}, using switch`);
        setNodes(incomingNodes);
        setEdges(incomingEdges);
    }

    setHasUnsavedChanges(false);
  }, [setNodes, setEdges, setHasUnsavedChanges]);

  return { onNodesChange, onEdgesChange, onConnect, onImport };
};