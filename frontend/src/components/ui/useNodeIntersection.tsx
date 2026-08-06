import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

interface UseNodeIntersectionProps {
  nodeIds: string[];
  onNodeViewportEnter: (nodeId: string) => void;
  threshold?: number;
}

export function useNodeIntersection({ nodeIds, onNodeViewportEnter, threshold = 0.01 }: UseNodeIntersectionProps): void {
  const rfInstance = useReactFlow();
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());

  useEffect(() => {
    if (!rfInstance || !nodeIds.length) return;

    const container = document.querySelector('.react-flow__pane');
    if (!container) return;

    nodeIds.forEach((nodeId: string) => {
      if (observersRef.current.has(nodeId)) return;

      const nodeElement = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`);
      if (!nodeElement) return;

      const observer = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          entries.forEach((entry: IntersectionObserverEntry) => {
            if (entry.isIntersecting) {
              onNodeViewportEnter(nodeId);
              observer.disconnect();
              observersRef.current.delete(nodeId);
            }
          });
        },
        {
          root: container,
          rootMargin: '50px',
          threshold: threshold,
        }
      );

      observer.observe(nodeElement);
      observersRef.current.set(nodeId, observer);
    });

    return () => {
      observersRef.current.forEach((observer: IntersectionObserver) => observer.disconnect());
      observersRef.current.clear();
    };
  }, [nodeIds, rfInstance, onNodeViewportEnter, threshold]);
}