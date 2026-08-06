import React, { useState, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import QueryConsole from './QueryConsole';
import QueryResults from './QueryResults';
import { useUIStore } from './uiStore';
import { useQueryStore } from './queryStore';

const CenterWorkspace = (): React.ReactElement => {
  const panelVisibility = useUIStore((s: any) => s.panelVisibility);
  const panelSizes     = useUIStore((s: any) => s.panelSizes);
  const resizePanel    = useUIStore((s: any) => s.resizePanel);

  const queryResults = useQueryStore((s: any) => s.queryResults);
  const isExecuting  = useQueryStore((s: any) => s.isExecuting);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartPos  = useRef<number>(0);
  const dragStartSize = useRef<number>(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current  = e.clientY;
    dragStartSize.current = panelSizes.queryResults;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [panelSizes.queryResults]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const delta = dragStartPos.current - e.clientY;
    resizePanel('queryResults', Math.max(150, Math.min(600, dragStartSize.current + delta)));
  }, [isDragging, resizePanel]);

  const handleResizeEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isDragging, handleResizeMove, handleResizeEnd]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 200 }}>
        <QueryConsole />
      </Box>

      {panelVisibility.queryResults && (
        <>
          <Box
            onMouseDown={handleResizeStart}
            sx={{
              height: 5, cursor: 'row-resize',
              bgcolor: isDragging ? 'primary.main' : 'divider',
              '&:hover': { bgcolor: 'primary.main' },
              transition: 'background-color 0.15s',
              flexShrink: 0,
            }}
          />
          <Box sx={{
            height: panelSizes.queryResults,
            minHeight: 150,
            overflow: 'hidden',
            borderTop: 1,
            borderColor: 'divider',
            transition: isDragging ? 'none' : 'height 0.2s ease',
          }}>
            <QueryResults
              data={queryResults?.rows || []}
              columns={queryResults?.columns || []}
              loading={isExecuting}
              height={panelSizes.queryResults}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default CenterWorkspace;