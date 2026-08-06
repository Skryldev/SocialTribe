import { create } from 'zustand';

const DEFAULT_QUERY = `MATCH (u:socialUser)
WHERE u.centrality > 0.1
RETURN u.name, u.centrality, u.friendCount
ORDER BY u.centrality DESC
LIMIT 10`;

const MAX_HISTORY_SIZE = 100;

interface Tab {
  id: string;
  title: string;
  query: string;
  isDirty: boolean;
  createdAt: number;
}

interface QueryHistoryEntry {
  query: string;
  timestamp: number;
  duration?: number;
  rowCount?: number;
}

interface QueryStoreState {
  queryTabs: Tab[];
  activeTabId: string | null;
  queryResults: any;
  isExecuting: boolean;
  queryHistory: QueryHistoryEntry[];
  queryPlan: any;
  lastExecutionTime: number | null;
  addQueryTab: (title?: string, initialQuery?: string) => void;
  closeQueryTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateQueryContent: (tabId: string, query: string) => void;
  renameTab: (tabId: string, newTitle: string) => void;
  setQueryResult: (results: any) => void;
  setExecuting: (executing: boolean) => void;
  addToHistory: (queryEntry: QueryHistoryEntry) => void;
  setQueryPlan: (plan: any) => void;
  clearResults: () => void;
  resetStore: () => void;
  duplicateTab: (tabId: string) => void;
}

const createTab = (title: string, query: string = '', index: number = 1): Tab => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: title || `Query ${index}`,
  query,
  isDirty: false,
  createdAt: Date.now(),
});

const useQueryStore = create<QueryStoreState>((set, _get) => ({
  queryTabs: [
    {
      id: 'tab-default-1',
      title: 'Query 1',
      query: DEFAULT_QUERY,
      isDirty: false,
      createdAt: Date.now(),
    },
  ],
  activeTabId: 'tab-default-1',
  queryResults: null,
  isExecuting: false,
  queryHistory: [],
  queryPlan: null,
  lastExecutionTime: null,

  addQueryTab: (title, initialQuery = '') =>
    set((state) => {
      const newTab = createTab(
        title || '',
        initialQuery,
        state.queryTabs.length + 1
      );
      return {
        queryTabs: [...state.queryTabs, newTab],
        activeTabId: newTab.id,
      };
    }),

  closeQueryTab: (tabId) =>
    set((state) => {
      if (state.queryTabs.length <= 1) {
        console.warn('Cannot close the last tab');
        return state;
      }

      const newTabs = state.queryTabs.filter((tab: Tab) => tab.id !== tabId);
      const isActiveTabClosed = state.activeTabId === tabId;
      
      const newActiveId = isActiveTabClosed
        ? newTabs[newTabs.length - 1]?.id || null
        : state.activeTabId;

      return {
        queryTabs: newTabs,
        activeTabId: newActiveId,
      };
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateQueryContent: (tabId, query) =>
    set((state) => ({
      queryTabs: state.queryTabs.map((tab: Tab) =>
        tab.id === tabId
          ? { ...tab, query, isDirty: tab.query !== query }
          : tab
      ),
    })),

  renameTab: (tabId, newTitle) =>
    set((state) => ({
      queryTabs: state.queryTabs.map((tab: Tab) =>
        tab.id === tabId ? { ...tab, title: newTitle } : tab
      ),
    })),

  setQueryResult: (results) =>
    set({
      queryResults: results,
      lastExecutionTime: results ? Date.now() : null,
    }),

  setExecuting: (executing) => set({ isExecuting: executing }),

  addToHistory: (queryEntry) =>
    set((state) => ({
      queryHistory: [queryEntry, ...state.queryHistory].slice(0, MAX_HISTORY_SIZE),
    })),

  setQueryPlan: (plan) => set({ queryPlan: plan }),

  clearResults: () =>
    set({
      queryResults: null,
      queryPlan: null,
      lastExecutionTime: null,
    }),

  resetStore: () =>
    set({
      queryTabs: [
        createTab('Query 1', DEFAULT_QUERY, 1),
      ],
      activeTabId: null,
      queryResults: null,
      isExecuting: false,
      queryHistory: [],
      queryPlan: null,
      lastExecutionTime: null,
    }),

  duplicateTab: (tabId) =>
    set((state) => {
      const sourceTab = state.queryTabs.find((tab: Tab) => tab.id === tabId);
      if (!sourceTab) return state;

      const newTab = createTab(
        `${sourceTab.title} (copy)`,
        sourceTab.query,
        state.queryTabs.length + 1
      );

      return {
        queryTabs: [...state.queryTabs, newTab],
        activeTabId: newTab.id,
      };
    }),
}));

export { useQueryStore, DEFAULT_QUERY };
export default useQueryStore;