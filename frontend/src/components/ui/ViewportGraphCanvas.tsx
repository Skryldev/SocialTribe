import React, {
  useRef,
  useMemo,
  useCallback,
  memo,
}                              from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  BackgroundVariant
}                              from '@xyflow/react';
import 'reactflow/dist/style.css';

import { useViewportGraph }      from './useViewportGraph';
import { withAnimation }         from './AnimatedNodeWrapper';
import { ViewportDebugOverlay }  from './ViewportDebugOverlay';
import { FetchingIndicator }     from './FetchingIndicator';

function buildAnimatedNodeTypes(nodeTypes: any): any {
  if (!nodeTypes) return {};
  const animated: any = {};
  for (const [key, Component] of Object.entries(nodeTypes)) {
    animated[key] = withAnimation(Component as React.ComponentType<any>);
  }
  return animated;
}

interface InnerCanvasProps {
  nodeTypes?: any;
  edgeTypes?: any;
  overscan?: number;
  showDebugOverlay?: boolean;
  onInit?: (instance: any) => void;
  [key: string]: any;
}

const InnerCanvas = memo(function InnerCanvas({
  nodeTypes,
  edgeTypes,
  overscan,
  showDebugOverlay,
  onInit,
  ...reactFlowProps
}: InnerCanvasProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onMoveEnd,
    onMove,
    isLoading,
    isFetching,
    initialLoadDone,
  } = useViewportGraph({ containerRef, overscan });

  const animatedNodeTypes = useMemo(
    () => buildAnimatedNodeTypes(nodeTypes),
    [nodeTypes]
  );

  const handleInit = useCallback((instance: any) => {
    onInit?.(instance);
  }, [onInit]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onMoveEnd={onMoveEnd}
        onMove={onMove}
        onInit={handleInit}
        nodeTypes={animatedNodeTypes}
        edgeTypes={edgeTypes}
        elevateNodesOnSelect={false}
        onlyRenderVisibleElements={true}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        fitView={!initialLoadDone}
        fitViewOptions={{ padding: 0.2, duration: 400 }}
        {...reactFlowProps}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(100,100,120,0.3)" />
        <Controls />
        <MiniMap
          nodeStrokeColor="rgba(100,180,255,0.4)"
          nodeColor="rgba(60,100,200,0.35)"
          maskColor="rgba(0,0,0,0.35)"
        />
      </ReactFlow>

      <FetchingIndicator active={isFetching || isLoading} />

      <ViewportDebugOverlay
        visible={true}
      />
    </div>
  );
});

interface ViewportGraphCanvasProps {
  nodeTypes?: any;
  edgeTypes?: any;
  overscan?: number;
  showDebugOverlay?: boolean;
  onInit?: (instance: any) => void;
  [key: string]: any;
}

export const ViewportGraphCanvas = memo(function ViewportGraphCanvas({
  nodeTypes,
  edgeTypes,
  overscan = 0.4,
  showDebugOverlay,
  onInit,
  ...reactFlowProps
}: ViewportGraphCanvasProps): React.ReactElement {
  return (
    <ReactFlowProvider>
      <InnerCanvas
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        overscan={overscan}
        showDebugOverlay={showDebugOverlay}
        onInit={onInit}
        {...reactFlowProps}
      />
    </ReactFlowProvider>
  );
});