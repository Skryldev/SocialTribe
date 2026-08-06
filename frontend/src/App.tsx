import * as React from 'react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ReactFlow, Background, useReactFlow, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodeSearchBox } from './components/ui/NodeSearchBox';
import { ImportExportModal } from './components/services/ImportExportModal';
import { useHighlightNodes } from './components/ui/useHighlightNodes';
import { useGraphHandlers } from './hooks/useGraphHandlers';
import { useAddNode } from './components/ui/useAddNode';
import { useDeleteEdge } from './components/ui/useDeleteEdge';
import { useGraphSync } from './components/ui/useGraphSync';

import FloatingAddNodeForm from './components/ui/FloatingAddNodeForm';
import AddNodeButton from './components/ui/AddNodeButton';

import { EdgeContextMenu } from './components/ui/EdgeContextMenu';
import { NodeContextMenu } from './components/ui/NodeContextMenu';
import { SuggestFriendModal } from './components/ui/SuggestFriendModal';
import { CommonFriendsModal } from './components/ui/CommonFriendsModal';
import { ShortestPathModal } from './components/ui/ShortestPathModal';
import { DeleteNodeModal } from './components/ui/NodeContextMenuModals';
import { FetchingIndicator } from './components/ui/FetchingIndicator';
import { ViewportDebugOverlay } from './components/ui/ViewportDebugOverlay';

import { resetGraphCache } from './components/ui/queryConfig';
import { viewportCache } from './components/ui/viewportCacheManager';
import { nodeTypes, edgeTypes } from './store/graphState';
import { useViewportGraph } from './components/ui/useViewportGraph';
import { useViewportGraphStore } from './components/ui/viewportGraphStore';
import { usePrefetchOnHover } from './components/ui/usePrefetchOnHover';

import { useRumorSimulation } from './components/rumor/useRumorSimulation';
import { RumorSimulationFloatingBar } from './components/rumor/RumorSimulationFloatingBar';
import { RumorSimulationDrawer } from './components/rumor/RumorSimulationDrawer';

import { LayoutSystem } from './components/preset/LayoutSystem';
import { useLayoutEngine } from './components/preset/useLayoutEngine';

import { useGraphMutations } from './components/ui/useGraphMutations';
import './App.css';

export default function App(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactFlowRef = useRef<any>(null);

  const {
    nodes: viewportNodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onMoveEnd,
    onMove,
    isLoading,
    isFetching,
    initialLoadDone,
  } = useViewportGraph({ containerRef, overscan: 0.4 });

  const sim = useRumorSimulation(viewportNodes, edges);
  const { onViewportMoveStart, onViewportMoveEnd } = sim;

  const storeNodes = useViewportGraphStore((s: any) => s.nodes);

  const displayNodes = useMemo(() =>
    storeNodes.map((n: any) => ({
      ...n,
      data: {
        ...n.data,
        showDayBadges: sim.params.showDayBadges,
      },
    })),
    [storeNodes, sim.params.showDayBadges]
  );

  const [simDrawerOpen, setSimDrawerOpen] = useState<boolean>(false);
  const [simDrawerPinned, setSimDrawerPinned] = useState<boolean>(false);
  const [vizMode, setVizMode] = useState<string>('status');
  const [manualSeedMode, setManualSeedMode] = useState<boolean>(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);

  const [suggestModalOpen, setSuggestModalOpen] = useState<boolean>(false);
  const [suggestModalUser, setSuggestModalUser] = useState<any>(null);
  const [commonFriendsModalOpen, setCommonFriendsModalOpen] = useState<boolean>(false);
  const [commonFriendsUserA, setCommonFriendsUserA] = useState<any>(null);
  const [commonFriendsUserB, setCommonFriendsUserB] = useState<any>(null);

  const [shortestPathModalOpen, setShortestPathModalOpen] = useState<boolean>(false);
  const [shortestPathSource, setShortestPathSource] = useState<any>(null);
  const [shortestPathTarget, setShortestPathTarget] = useState<any>(null);
  const [shortestPathData, setShortestPathData] = useState<any>(null);
  const [shortestPathLoading, setShortestPathLoading] = useState<boolean>(false);

  const { getShortestPath } = useGraphMutations();

  const toggleDayBadges = useCallback(() => {
    sim.updateParams({ showDayBadges: !sim.params.showDayBadges });
  }, [sim]);

  const handleQuickStart = useCallback(() => {
    if (sim.params.seedIds.length === 0) {
      setSimDrawerOpen(true);
    } else {
      sim.startSimulation();
    }
  }, [sim]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    if (event.button === 2) {
      event.preventDefault();
      event.stopPropagation();
      const pane = reactFlowRef.current?.getBoundingClientRect();
      setNodeMenuState({
        screenPos: { x: event.clientX, y: event.clientY },
        node,
        paneRect: pane,
      });
      return;
    }

    if (!manualSeedMode) return;
    const current = sim.params.seedIds;
    const next = current.includes(node.id)
      ? current.filter((id: string) => id !== node.id)
      : [...current, node.id];
    sim.updateParams({ seedIds: next });
  }, [manualSeedMode, sim]);

  const mergeGraph = useViewportGraphStore((s: any) => s.mergeGraph);
  const pruneGraph = useViewportGraphStore((s: any) => s.pruneGraph);
  const resetGraph = useViewportGraphStore((s: any) => s.resetGraph);

  const handleGraphInvalidate = useCallback(() => {
    resetGraph();
    viewportCache.clearFull();
    resetGraphCache();
  }, [resetGraph]);

  const setNodes = useCallback((updaterOrArray: any) => {
    const { nodes: current, edges: currentEdges } = useViewportGraphStore.getState();
    const next = typeof updaterOrArray === 'function'
      ? updaterOrArray(current)
      : updaterOrArray;
    const keepNodeIds = new Set(next.map((n: any) => n.id));
    const keepEdgeIds = new Set(currentEdges.map((e: any) => e.id));
    pruneGraph(keepNodeIds, keepEdgeIds);
    mergeGraph(next, currentEdges);
  }, [mergeGraph, pruneGraph]);

  const setEdges = useCallback((updaterOrArray: any) => {
    const { edges: current, nodes: currentNodes } = useViewportGraphStore.getState();
    const next = typeof updaterOrArray === 'function'
      ? updaterOrArray(current)
      : updaterOrArray;
    const nextIds = new Set(next.map((e: any) => e.id));
    const currentIds = new Set(current.map((e: any) => e.id));
    const hasRemovals = [...currentIds].some((id: any) => !nextIds.has(id));

    if (hasRemovals) {
      const keepNodeIds = new Set(currentNodes.map((n: any) => n.id));
      pruneGraph(keepNodeIds, nextIds);
    }

    mergeGraph(currentNodes, next);
  }, [mergeGraph, pruneGraph]);

  const layoutEngine = useLayoutEngine(setNodes, {
    transitionDuration: 800,
    maxUndoStack: 15,
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const selectedNodes = viewportNodes.filter((n: any) => n.selected);

  const { onImport } = useGraphHandlers(setNodes, setEdges, setHasUnsavedChanges);
  const { highlight } = useHighlightNodes(setNodes);

  const { openForm, closeForm, addNode, formState } = useAddNode(
    setNodes,
    setHasUnsavedChanges,
    {
      onUserUpdate: (id: any, updates: any) => console.log('Update', id, updates),
      onFriendSuggest: (id: any) => console.log('Suggest for', id),
      onShortestPath: (srcId: any) => console.log('Shortest path from', srcId),
      onDelete: (id: any) => setNodes((nds: any) => nds.filter((n: any) => n.id !== id)),
    },
    {
      onError: (err: any, node: any) =>
        console.error('Add node sync failed — node was added locally:', node, err),
    },
  );

  const { onEdgeContextMenu, closeMenu, deleteEdge, menuState } =
    useDeleteEdge(setEdges, setHasUnsavedChanges, {
      onError: (err: any, edgeId: any) =>
        console.error('Delete edge sync failed — edge was removed locally:', edgeId, err),
    });

  const { onNodeDragStop, onConnect, onNodesDelete } = useGraphSync(setEdges, {
    getEdgeType: (connection: any) => {
      if (connection.sourceHandle?.startsWith('follow')) return 'follow';
      if (connection.sourceHandle?.startsWith('mention')) return 'mention';
      return 'friendship';
    },
    onSyncError: (err: any, ctx: any) => console.error('[GraphSync error]', ctx.type, err),
  });

  const [deleteModalState, setDeleteModalState] = useState<any>(null);
  const [nodeMenuState, setNodeMenuState] = useState<any>(null);

  const getLabel = useCallback(
    (n: any) => n?.data?.label || n?.data?.name || n?.label || n?.id,
    []
  );

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    event.stopPropagation();
    const pane = reactFlowRef.current?.getBoundingClientRect();
    if (pane) {
      setNodeMenuState({
        id: node.id,
        node,
        screenPos: { x: event.clientX, y: event.clientY },
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom: event.clientY >= pane.height - 200 && pane.height - event.clientY,
        paneRect: pane,
      });
    } else {
      setNodeMenuState({ screenPos: { x: event.clientX, y: event.clientY }, node });
    }
  }, []);

  const closeNodeMenu = useCallback(() => setNodeMenuState(null), []);
  const onPaneClick = useCallback(() => setNodeMenuState(null), []);

  const handleAddFriend = useCallback((sourceNode: any, suggestedUser: any) => {
    onConnect({
      source: sourceNode.id,
      target: suggestedUser.id,
      sourceHandle: 'friendship',
      targetHandle: 'friendship',
    });
  }, [onConnect]);

  const handleSuggestFriend = useCallback((node: any) => {
    setSuggestModalUser(node);
    setSuggestModalOpen(true);
  }, []);

  const handleFindShortestPath = useCallback(async (sourceNode: any, targetNode: any) => {
    setShortestPathSource(sourceNode);
    setShortestPathTarget(targetNode);
    setShortestPathModalOpen(true);
    setShortestPathData(null);
    setShortestPathLoading(true);

    try {
      const result = await getShortestPath(sourceNode.id, targetNode.id);
      setShortestPathData(result);
    } catch (err) {
      console.error('Shortest path fetch failed:', err);
      setShortestPathData({ path: [], message: 'Failed to find path.' });
    } finally {
      setShortestPathLoading(false);
    }
  }, [getShortestPath]);

  const handleCommonFriends = useCallback((nodeA: any, nodeB: any) => {
    setCommonFriendsUserA(nodeA);
    setCommonFriendsUserB(nodeB);
    setCommonFriendsModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async (user: any) => {
    const fullNode = viewportNodes.find((n: any) => n.id === user.id);
    if (fullNode) await onNodesDelete([fullNode]);
    setDeleteModalState(null);
  }, [viewportNodes, onNodesDelete]);

  const handleOpenDeleteModal = useCallback((node: any) => {
    setDeleteModalState({
      open: true,
      user: { id: node.id, label: node.data?.label || node.id },
    });
  }, []);

  const { onMouseMove } = usePrefetchOnHover({ containerRef, overscan: 0.4 });
  const { screenToFlowPosition } = useReactFlow();

  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    openForm({ x: event.clientX, y: event.clientY }, flowPos);
  }, [screenToFlowPosition, openForm]);

  const handleAddNodeFromButton = useCallback(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const flowPos = screenToFlowPosition({ x: centerX, y: centerY });
    openForm({ x: centerX - 160, y: centerY - 180 }, flowPos);
  }, [screenToFlowPosition, openForm]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).isContentEditable
      ) return;

      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        layoutEngine.undoLayout();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        layoutEngine.redoLayout();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [layoutEngine]);

  const handleNodeSelect = useCallback((nodeId: any) => {
    highlight(nodeId);
  }, [highlight]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100%', position: 'relative' }}
      onMouseMove={onMouseMove}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          filter: isImportExportOpen ? 'blur(8px)' : 'blur(0px)',
          transition: 'filter 0.3s ease',
        }}
      >
        <RumorSimulationFloatingBar
          isDrawerOpen={simDrawerOpen}
          isRunning={sim.isRunning}
          isComplete={sim.isComplete}
          currentDay={sim.currentDay}
          coverage={sim.coverage}
          onToggleDrawer={() => setSimDrawerOpen((o: boolean) => !o)}
          onQuickStart={handleQuickStart}
          onPause={sim.pauseSimulation}
          onReset={sim.resetSimulation}
        />

        <RumorSimulationDrawer
          isOpen={simDrawerOpen || simDrawerPinned}
          isPinned={simDrawerPinned}
          onPin={() => setSimDrawerPinned((p: boolean) => !p)}
          onClose={() => setSimDrawerOpen(false)}
          nodes={viewportNodes}
          edges={edges}
          sim={sim}
          vizMode={vizMode}
          onVizModeChange={setVizMode}
          showDayBadges={sim.params.showDayBadges}
          onToggleDayBadges={toggleDayBadges}
          manualSeedMode={manualSeedMode}
          onToggleManualSeed={() => setManualSeedMode((m: boolean) => !m)}
        />

        <AddNodeButton
          onAddNode={handleAddNodeFromButton}
          nodeCount={viewportNodes.length}
          isFormOpen={!!formState}
        />

        <ReactFlow
          ref={reactFlowRef}
          nodes={displayNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodesDelete={onNodesDelete}
          onDoubleClick={handlePaneDoubleClick}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onNodeClick={handleNodeClick}
          onPaneClick={onPaneClick}
          onPaneContextMenu={(e) => e.preventDefault()}
          onMoveStart={onViewportMoveStart}
          onMoveEnd={(event: any, viewport: any) => {
            if (typeof onViewportMoveEnd === 'function') onViewportMoveEnd();
            onMoveEnd(event, viewport);
          }}
          onMove={onMove}
          fitView={!initialLoadDone}
          fitViewOptions={{ padding: 0.3, duration: 400 }}
          onlyRenderVisibleElements={true}
          elevateNodesOnSelect={false}
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          proOptions={{ hideAttribution: true }}
        >
          <Background id="main-grid" variant={BackgroundVariant.Lines} gap={100} lineWidth={0.8} color="rgba(245, 158, 11, 0.1)" bgColor="#fef3c7" />
          <Background id="sub-grid" variant={BackgroundVariant.Lines} gap={20} lineWidth={0.5} color="rgba(245, 158, 11, 0.06)" bgColor="transparent" />
          <Background id="dots" variant={BackgroundVariant.Dots} gap={20} size={1.5} color="rgba(245, 158, 11, 0.1)" bgColor="transparent" />
        </ReactFlow>

        <LayoutSystem
          algorithms={layoutEngine.algorithms}
          presets={layoutEngine.presets}
          currentLayout={layoutEngine.currentLayout}
          isCalculating={layoutEngine.isCalculating}
          progress={layoutEngine.progress}
          canUndo={layoutEngine.canUndo}
          canRedo={layoutEngine.canRedo}
          nodeCount={layoutEngine.nodeCount}
          edgeCount={layoutEngine.edgeCount}
          onApplyLayout={layoutEngine.applyLayout}
          onApplyPreset={layoutEngine.applyPreset}
          onUndo={layoutEngine.undoLayout}
          onRedo={layoutEngine.redoLayout}
          onCancel={layoutEngine.cancelLayout}
        />

        <FetchingIndicator active={isFetching || isLoading} />
        <ViewportDebugOverlay visible={true} />

        {formState && (
          <FloatingAddNodeForm
            screenPos={formState.screenPos}
            flowPos={formState.flowPos}
            onAdd={addNode}
            onClose={closeForm}
          />
        )}

        {menuState && (
          <EdgeContextMenu
            screenPos={menuState.screenPos}
            edgeId={menuState.edgeId}
            edgeType={menuState.edgeType}
            onDelete={deleteEdge}
            onClose={closeMenu}
          />
        )}

        {nodeMenuState && (
          <NodeContextMenu
            menuState={nodeMenuState}
            nodes={viewportNodes}
            edges={edges}
            onClose={closeNodeMenu}
            onAddFriend={handleAddFriend}
            onSuggestFriends={handleSuggestFriend}
            onFindShortestPath={handleFindShortestPath}
            onCommonFriends={handleCommonFriends}
            onDeleteNode={handleOpenDeleteModal}
          />
        )}

        <SuggestFriendModal
          open={suggestModalOpen}
          onClose={() => setSuggestModalOpen(false)}
          user={suggestModalUser}
          nodes={viewportNodes}
          getLabel={getLabel}
        />

        <CommonFriendsModal
          open={commonFriendsModalOpen}
          onClose={() => setCommonFriendsModalOpen(false)}
          userA={commonFriendsUserA}
          userB={commonFriendsUserB}
          nodes={viewportNodes}
          getLabel={getLabel}
        />

        <ShortestPathModal
          open={shortestPathModalOpen}
          onClose={() => setShortestPathModalOpen(false)}
          sourceNode={shortestPathSource}
          targetNode={shortestPathTarget}
          pathData={shortestPathData}
          loading={shortestPathLoading}
        />

        <NodeSearchBox
          onNodeSelect={handleNodeSelect}
          highlightColor="#f59e0b"
          zoomDuration={1500}
          placeholder="Find a node…"
        />

        {deleteModalState?.open && (
          <DeleteNodeModal
            open={deleteModalState.open}
            onClose={() => setDeleteModalState(null)}
            user={deleteModalState.user}
            onConfirm={handleConfirmDelete}
          />
        )}
      </div>

      <div style={{ position: 'relative', zIndex: isImportExportOpen ? 1000 : 'auto' }}>
        <ImportExportModal
          key="import-export-modal"
          nodes={viewportNodes}
          edges={edges}
          selectedNodes={selectedNodes}
          onImport={onImport}
          hasUnsavedChanges={hasUnsavedChanges}
          onGraphInvalidate={handleGraphInvalidate}
          onOpenChange={setIsImportExportOpen}
        />
      </div>
    </div>
  );
}