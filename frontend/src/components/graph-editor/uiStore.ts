import { create } from 'zustand';

const DEFAULT_PANEL_SIZES: any = {
  rightSidebar: 360,
  queryResults: 300,
};

const PANEL_CONSTRAINTS: any = {
  rightSidebar: { min: 280, max: 520 },
  queryResults: { min: 200, max: 500 },
};

interface PanelVisibility {
  rightSidebar: boolean;
  queryResults: boolean;
}

interface PanelSizes {
  rightSidebar: number;
  queryResults: number;
}

interface UIStoreState {
  panelVisibility: PanelVisibility;
  panelSizes: PanelSizes;
  theme: string;
  togglePanel: (panelName: string) => void;
  resizePanel: (panelName: string, size: number) => void;
  setTheme: (mode: string) => void;
  toggleTheme: () => void;
  resetPanels: () => void;
  getPanelSize: (panelName: string) => number;
  isPanelVisible: (panelName: string) => boolean;
  getPanelConstraints: (panelName: string) => { min: number; max: number } | null;
}

const useUIStore = create<UIStoreState>((set, get) => ({
  panelVisibility: {
    rightSidebar: true,
    queryResults: true,
  },

  panelSizes: {
    rightSidebar: DEFAULT_PANEL_SIZES.rightSidebar,
    queryResults: DEFAULT_PANEL_SIZES.queryResults,
  },

  theme: 'dark',

  togglePanel: (panelName) =>
    set((state) => ({
      panelVisibility: {
        ...state.panelVisibility,
        [panelName]: !state.panelVisibility[panelName as keyof PanelVisibility],
      },
    })),

  resizePanel: (panelName, size) =>
    set((state) => {
      const constraints = PANEL_CONSTRAINTS[panelName];
      let clampedSize = size;
      
      if (constraints) {
        clampedSize = Math.max(constraints.min, Math.min(constraints.max, size));
      }
      
      return {
        panelSizes: {
          ...state.panelSizes,
          [panelName]: clampedSize,
        },
      };
    }),

  setTheme: (mode) => set({ theme: mode }),

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    })),

  resetPanels: () =>
    set({
      panelVisibility: {
        rightSidebar: true,
        queryResults: true,
      },
      panelSizes: {
        rightSidebar: DEFAULT_PANEL_SIZES.rightSidebar,
        queryResults: DEFAULT_PANEL_SIZES.queryResults,
      },
    }),

  getPanelSize: (panelName) => {
    const state = get();
    return state.panelSizes[panelName as keyof PanelSizes] || DEFAULT_PANEL_SIZES[panelName] || 300;
  },

  isPanelVisible: (panelName) => {
    const state = get();
    return state.panelVisibility[panelName as keyof PanelVisibility] ?? true;
  },

  getPanelConstraints: (panelName) => {
    return PANEL_CONSTRAINTS[panelName] || null;
  },
}));

export { useUIStore };
export default useUIStore;