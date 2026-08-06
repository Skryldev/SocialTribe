import { create } from 'zustand';

const DEFAULT_STATE = {
  expandedNodes: ['graph-root'],
  searchQuery: '',
  selectedPath: null,
  treeData: null,
  graphData: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  filters: {
    minFriendCount: null,
    minCentrality: null,
    role: null,
    searchTerm: '',
  },
};

const getAllNodeIds = (node: any): string[] => {
  if (!node) return [];
  const ids = [node.id];
  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      ids.push(...getAllNodeIds(child));
    });
  }
  return ids;
};

const findNodeInTree = (tree: any, targetId: string): any => {
  if (!tree) return null;
  if (tree.id === targetId) return tree;
  if (Array.isArray(tree.children)) {
    for (const child of tree.children) {
      const result = findNodeInTree(child, targetId);
      if (result) return result;
    }
  }
  return null;
};

const countItems = (node: any): number => {
  if (!node) return 0;
  let count = 1;
  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      count += countItems(child);
    });
  }
  return count;
};

interface Filters {
  minFriendCount: number | null;
  minCentrality: number | null;
  role: string | null;
  searchTerm: string;
}

interface GraphData {
  nodes: any[];
  edges: any[];
}

interface ExplorerState {
  expandedNodes: string[];
  searchQuery: string;
  selectedPath: string | null;
  treeData: any;
  graphData: GraphData | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  filters: Filters;
  toggleExpanded: (nodeId: string) => void;
  setExpandedNodes: (nodes: string[]) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedPath: (path: string) => void;
  setTreeData: (data: any) => void;
  setGraphData: (data: any) => void;
  setSelectedNodeId: (nodeId: string) => void;
  setSelectedEdgeId: (edgeId: string) => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  getSelectedNode: () => any;
  getExpandedCount: () => number;
  isExpanded: (nodeId: string) => boolean;
  getTotalItems: () => number;
  getGraphStats: () => any;
  getFilteredNodes: () => any[];
  getNodeById: (nodeId: string) => any;
  getEdgeById: (edgeId: string) => any;
  getNeighbors: (nodeId: string) => any[];
  reset: () => void;
}

const useExplorerStore = create<ExplorerState>((set, get) => ({
  expandedNodes: DEFAULT_STATE.expandedNodes,
  searchQuery: DEFAULT_STATE.searchQuery,
  selectedPath: DEFAULT_STATE.selectedPath,
  treeData: DEFAULT_STATE.treeData,
  graphData: DEFAULT_STATE.graphData,
  selectedNodeId: DEFAULT_STATE.selectedNodeId,
  selectedEdgeId: DEFAULT_STATE.selectedEdgeId,
  filters: { ...DEFAULT_STATE.filters },

  toggleExpanded: (nodeId) =>
    set((state) => ({
      expandedNodes: state.expandedNodes.includes(nodeId)
        ? state.expandedNodes.filter((id: string) => id !== nodeId)
        : [...state.expandedNodes, nodeId],
    })),

  setExpandedNodes: (nodes) =>
    set({
      expandedNodes: Array.isArray(nodes) ? nodes : [],
    }),

  expandAll: () =>
    set((state) => {
      const allIds = state.treeData ? getAllNodeIds(state.treeData) : [];
      return { expandedNodes: allIds };
    }),

  collapseAll: () =>
    set({
      expandedNodes: ['graph-root'],
    }),

  setSearchQuery: (query) =>
    set({
      searchQuery: typeof query === 'string' ? query : '',
    }),

  setSelectedPath: (path) =>
    set({
      selectedPath: path || null,
    }),

  setTreeData: (data) =>
    set({
      treeData: data || null,
    }),

  setGraphData: (data) =>
    set({
      graphData: data || null,
    }),

  setSelectedNodeId: (nodeId) =>
    set({
      selectedNodeId: nodeId || null,
    }),

  setSelectedEdgeId: (edgeId) =>
    set({
      selectedEdgeId: edgeId || null,
    }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),

  clearFilters: () =>
    set({
      filters: {
        minFriendCount: null,
        minCentrality: null,
        role: null,
        searchTerm: '',
      },
    }),

  getSelectedNode: () => {
    const { treeData, selectedPath } = get();
    if (!treeData || !selectedPath) return null;
    return findNodeInTree(treeData, selectedPath);
  },

  getExpandedCount: () => {
    const { expandedNodes } = get();
    return expandedNodes.length;
  },

  isExpanded: (nodeId) => {
    const { expandedNodes } = get();
    return expandedNodes.includes(nodeId);
  },

  getTotalItems: () => {
    const { treeData } = get();
    return treeData ? countItems(treeData) : 0;
  },

  getGraphStats: () => {
    const { graphData } = get();
    if (!graphData) return null;

    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];

    const friendCounts = nodes.map((n: any) => n.data?.friendCount || 0);
    const centralities = nodes.map((n: any) => n.data?.centrality || 0);

    const avgFriendCount = friendCounts.length > 0
      ? friendCounts.reduce((a: number, b: number) => a + b, 0) / friendCounts.length
      : 0;

    const avgCentrality = centralities.length > 0
      ? centralities.reduce((a: number, b: number) => a + b, 0) / centralities.length
      : 0;

    const maxCentrality = centralities.length > 0 ? Math.max(...centralities) : 0;
    const minCentrality = centralities.length > 0 ? Math.min(...centralities) : 0;

    const roleCount: any = {};
    nodes.forEach((n: any) => {
      const role = n.data?.role || 'unknown';
      roleCount[role] = (roleCount[role] || 0) + 1;
    });

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      avgFriendCount: Math.round(avgFriendCount * 100) / 100,
      avgCentrality: Math.round(avgCentrality * 100) / 100,
      maxCentrality: Math.round(maxCentrality * 100) / 100,
      minCentrality: Math.round(minCentrality * 100) / 100,
      roleCount,
    };
  },

  getFilteredNodes: () => {
    const { graphData, filters } = get();
    if (!graphData || !graphData.nodes) return [];

    let nodes = [...graphData.nodes];

    if (filters.minFriendCount !== null && filters.minFriendCount !== undefined) {
      nodes = nodes.filter((n: any) => (n.data?.friendCount || 0) >= filters.minFriendCount!);
    }

    if (filters.minCentrality !== null && filters.minCentrality !== undefined) {
      nodes = nodes.filter((n: any) => (n.data?.centrality || 0) >= filters.minCentrality!);
    }

    if (filters.role) {
      nodes = nodes.filter((n: any) => n.data?.role === filters.role);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      nodes = nodes.filter(
        (n: any) =>
          n.data?.name?.toLowerCase().includes(term) ||
          n.id?.toLowerCase().includes(term)
      );
    }

    return nodes;
  },

  getNodeById: (nodeId) => {
    const { graphData } = get();
    if (!graphData || !graphData.nodes) return null;
    return graphData.nodes.find((n: any) => n.id === nodeId) || null;
  },

  getEdgeById: (edgeId) => {
    const { graphData } = get();
    if (!graphData || !graphData.edges) return null;
    return graphData.edges.find((e: any) => e.id === edgeId) || null;
  },

  getNeighbors: (nodeId) => {
    const { graphData } = get();
    if (!graphData || !graphData.nodes || !graphData.edges) return [];

    const neighborIds = new Set<string>();
    graphData.edges.forEach((edge: any) => {
      if (edge.source === nodeId) neighborIds.add(edge.target);
      if (edge.target === nodeId) neighborIds.add(edge.source);
    });

    return graphData.nodes.filter((n: any) => neighborIds.has(n.id));
  },

  reset: () =>
    set({
      expandedNodes: DEFAULT_STATE.expandedNodes,
      searchQuery: DEFAULT_STATE.searchQuery,
      selectedPath: DEFAULT_STATE.selectedPath,
      treeData: DEFAULT_STATE.treeData,
      graphData: DEFAULT_STATE.graphData,
      selectedNodeId: DEFAULT_STATE.selectedNodeId,
      selectedEdgeId: DEFAULT_STATE.selectedEdgeId,
      filters: { ...DEFAULT_STATE.filters },
    }),
}));

export { useExplorerStore };
export default useExplorerStore;