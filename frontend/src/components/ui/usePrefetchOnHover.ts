import { useCallback, useRef } from 'react';
import { useReactFlow }        from '@xyflow/react';

import { buildViewportQuery, buildPrefetchQueries } from './viewportApi';
import { viewportCache }                            from './viewportCacheManager';
import { prefetchViewport }                         from './queryConfig';
import { useViewportGraphStore }                    from './viewportGraphStore';

const TRIGGER_ZONE   = 80;
const COOLDOWN_MS    = 800;

interface UsePrefetchOnHoverProps {
  containerRef: React.RefObject<any>;
  overscan?: number;
}

export function usePrefetchOnHover({ containerRef, overscan = 0.4 }: UsePrefetchOnHoverProps): any {
  const rfInstance   = useReactFlow();
  const mergeGraph   = useViewportGraphStore((s: any) => s.mergeGraph);
  const cooldownRef  = useRef<any>({});

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef?.current || !rfInstance) return;

    const rect = containerRef.current.getBoundingClientRect();
    const rx   = e.clientX - rect.left;
    const ry   = e.clientY - rect.top;
    const w    = rect.width;
    const h    = rect.height;

    const direction = {
      dx: rx < TRIGGER_ZONE ? -1 : rx > w - TRIGGER_ZONE ?  1 : 0,
      dy: ry < TRIGGER_ZONE ? -1 : ry > h - TRIGGER_ZONE ?  1 : 0,
    };

    if (direction.dx === 0 && direction.dy === 0) return;

    const dirKey = `${direction.dx}:${direction.dy}`;
    const now    = Date.now();
    if (cooldownRef.current[dirKey] && now - cooldownRef.current[dirKey] < COOLDOWN_MS) return;
    cooldownRef.current[dirKey] = now;

    const rfViewport = rfInstance.getViewport();
    const base       = buildViewportQuery(rfViewport, w, h, overscan);
    const queries    = buildPrefetchQueries(base, direction);

    for (const q of queries) {
      const { miss } = viewportCache.classifyViewport(q);
      if (miss.length > 0) {
        prefetchViewport(q)
          .then(({ data }: any = {}) => {
            if (data) {
              viewportCache.storeViewportData(q, data.nodes || [], data.edges || []);
              mergeGraph(data.nodes || [], data.edges || []);
            }
          })
          .catch(() => {});
      }
    }
  }, [containerRef, rfInstance, overscan, mergeGraph]);

  return { onMouseMove: handleMouseMove };
}