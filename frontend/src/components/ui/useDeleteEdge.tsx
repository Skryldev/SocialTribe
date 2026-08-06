import { useState, useCallback, useRef } from 'react';
import React                             from 'react';
import { toast }                         from 'sonner';
import { Trash2 }                        from 'lucide-react';
import { deleteEdge as apiDeleteEdge }   from './graphApi';
import { viewportCache }                 from './viewportCacheManager';
import { useViewportGraphStore }         from './viewportGraphStore';
import { queryClient }                   from './queryConfig';

const EDGE_TYPE_LABELS: any = {
  friendship: 'Friendship',
  follow:     'Follow',
  block:      'Block',
  mention:    'Mention',
};

function edgeLabel(edgeType: string): string {
  return EDGE_TYPE_LABELS[edgeType] ?? 'Connection';
}

interface UseDeleteEdgeOptions {
  onError?: (err: any, edgeId: string) => void;
}

interface MenuState {
  screenPos: { x: number; y: number };
  edgeId: string;
  edgeType: string;
}

export function useDeleteEdge(
  setEdges: any,
  setHasUnsavedChanges: any,
  options: UseDeleteEdgeOptions = {}
): any {
  const [menuState, setMenuState] = useState<MenuState | null>(null);

  const onErrorRef = useRef<any>(options.onError);
  onErrorRef.current = options.onError;

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: any) => {
    event.preventDefault();
    
    console.log('🖱️ [useDeleteEdge] onEdgeContextMenu - edge clicked:', {
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
    });
    
    setMenuState({
      screenPos: { x: event.clientX, y: event.clientY },
      edgeId:    edge.id,
      edgeType:  edge.data?.edgeType ?? 'friendship',
    });
  }, []);

  const closeMenu = useCallback(() => setMenuState(null), []);

  const deleteEdge = useCallback(
    async (edgeId: string, edgeType: string = 'friendship') => {
      console.log('🗑️ [useDeleteEdge] deleteEdge called:', {
        edgeId,
        edgeType,
        currentEdgesInStore: useViewportGraphStore.getState().edges.map((e: any) => e.id),
      });

      useViewportGraphStore.getState().recordEdgeDelete(edgeId);

      viewportCache.removeEdge(edgeId);

      setEdges((eds: any) => eds.filter((e: any) => e.id !== edgeId));
      setHasUnsavedChanges?.(true);
      setMenuState(null);

      const label = edgeLabel(edgeType);
      
      toast.custom(
        (_t: any) => (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(10,8,26,0.97)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, padding: '11px 15px', color: '#f0eeff',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(239,68,68,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Trash2 size={13} color="#ef4444" />
            </div>
            <span>{label} removed</span>
          </div>
        ),
        { duration: 2500 }
      );

      console.log('📤 [useDeleteEdge] Sending DELETE to backend:', edgeId);

      try {
        await apiDeleteEdge(edgeId);
        console.log('✅ [useDeleteEdge] Backend delete successful:', edgeId);
        queryClient.invalidateQueries({ queryKey: ['viewport-graph'] });
      } catch (err: any) {
        if (err.status === 404) {
          console.warn(`⚠️ [useDeleteEdge] Edge "${edgeId}" not found in backend (404). Local state already updated.`);
          queryClient.invalidateQueries({ queryKey: ['viewport-graph'] });
          return;
        }

        console.error('❌ [useDeleteEdge] Backend delete failed:', err);
        onErrorRef.current?.(err, edgeId);
        
        toast.error(`Failed to sync delete for ${label}`, {
          duration: 4000,
          style: {
            background: 'rgba(10,8,26,0.97)',
            border: '1px solid rgba(239,68,68,0.5)',
          },
        });
      }
    },
    [setEdges, setHasUnsavedChanges],
  );

  return {
    onEdgeContextMenu,
    closeMenu,
    deleteEdge,
    menuState,
    isOpen: menuState !== null,
  };
}