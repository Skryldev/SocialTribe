import { useCallback, useRef } from "react";

export function useHighlightNodes(setNodes: any, duration: number = 2500): any {
  const clearTimerRef = useRef<any>(null);

  const highlight = useCallback(
    (nodeId: string) => {
      if (!nodeId) return;

      setNodes((nds: any) =>
        nds.map((n: any) => {
          const updatedNode = { ...n };
          
          updatedNode.data = {
            ...n.data,
            highlighted: n.id === nodeId,
          };
          
          if (!updatedNode.type) {
            updatedNode.type = 'socialUser';
          }
          
          return updatedNode;
        })
      );

      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
      
      clearTimerRef.current = setTimeout(() => {
        setNodes((nds: any) =>
          nds.map((n: any) => {
            if (n.data?.highlighted) {
              return {
                ...n,
                data: { ...n.data, highlighted: false }
              };
            }
            return n;
          })
        );
      }, duration);
    },
    [setNodes, duration]
  );

  const clearHighlights = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    setNodes((nds: any) =>
      nds.map((n: any) => {
        if (n.data?.highlighted) {
          return {
            ...n,
            data: { ...n.data, highlighted: false }
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  return { highlight, clearHighlights };
}