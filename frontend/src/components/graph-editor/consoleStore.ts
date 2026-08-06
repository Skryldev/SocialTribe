import { create } from 'zustand';

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_FILTER_LEVEL = 'ALL';

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

interface ConsoleState {
  consoleLogs: LogEntry[];
  filterLevel: string;
  isAutoScroll: boolean;
  maxEntries: number;
  addLog: (level: string, message: string, source?: string) => void;
  clearLogs: () => void;
  setFilter: (level: string) => void;
  setFilterLevel: (level: string) => void;
  toggleAutoScroll: () => void;
  setMaxEntries: (max: number) => void;
  getFilteredLogs: () => LogEntry[];
  getLogCounts: () => any;
  exportLogs: () => string;
  hasErrors: () => boolean;
  getLatestLog: () => LogEntry | null;
  reset: () => void;
}

const useConsoleStore = create<ConsoleState>((set, get) => ({
  consoleLogs: [],
  filterLevel: DEFAULT_FILTER_LEVEL,
  isAutoScroll: true,
  maxEntries: DEFAULT_MAX_ENTRIES,

  addLog: (level, message, source = 'system') =>
    set((state) => {
      const currentLogs = Array.isArray(state.consoleLogs) ? state.consoleLogs : [];
      const maxEntries = state.maxEntries || DEFAULT_MAX_ENTRIES;
      
      const newLog: LogEntry = {
        id: Date.now() + Math.random() * 1000,
        timestamp: new Date().toISOString(),
        level: level || 'LOG',
        message: message || 'No message',
        source: source || 'system',
      };
      
      const newLogs = [newLog, ...currentLogs];
      
      if (newLogs.length > maxEntries) {
        newLogs.length = maxEntries;
      }
      
      return { consoleLogs: newLogs };
    }),

  clearLogs: () => set({ consoleLogs: [] }),

  setFilter: (level) => set({ filterLevel: level || DEFAULT_FILTER_LEVEL }),

  setFilterLevel: (level) => set({ filterLevel: level || DEFAULT_FILTER_LEVEL }),

  toggleAutoScroll: () =>
    set((state) => ({ isAutoScroll: !state.isAutoScroll })),

  setMaxEntries: (max) => set({ maxEntries: Math.max(10, max || DEFAULT_MAX_ENTRIES) }),

  getFilteredLogs: () => {
    const state = get();
    const logs = Array.isArray(state.consoleLogs) ? state.consoleLogs : [];
    const filterLevel = state.filterLevel || DEFAULT_FILTER_LEVEL;
    
    if (filterLevel === 'ALL') return logs;
    return logs.filter((log: LogEntry) => log?.level === filterLevel);
  },

  getLogCounts: () => {
    const state = get();
    const logs = Array.isArray(state.consoleLogs) ? state.consoleLogs : [];
    const counts: any = { ALL: logs.length };
    
    logs.forEach((log: LogEntry) => {
      if (log?.level) {
        counts[log.level] = (counts[log.level] || 0) + 1;
      }
    });
    
    return counts;
  },

  exportLogs: () => {
    const state = get();
    const logs = Array.isArray(state.consoleLogs) ? state.consoleLogs : [];
    return JSON.stringify(logs, null, 2);
  },

  hasErrors: () => {
    const state = get();
    const logs = Array.isArray(state.consoleLogs) ? state.consoleLogs : [];
    return logs.some((log: LogEntry) => log?.level === 'ERROR');
  },

  getLatestLog: () => {
    const state = get();
    const logs = Array.isArray(state.consoleLogs) ? state.consoleLogs : [];
    return logs.length > 0 ? logs[0] : null;
  },

  reset: () =>
    set({
      consoleLogs: [],
      filterLevel: DEFAULT_FILTER_LEVEL,
      isAutoScroll: true,
      maxEntries: DEFAULT_MAX_ENTRIES,
    }),
}));

export { useConsoleStore };
export default useConsoleStore;