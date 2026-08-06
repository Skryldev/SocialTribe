import {
  Atom, Orbit, Circle, Target, Sparkles, Waves, GitBranch,
  Grid3X3, Radar, Dices, LayoutGrid
} from 'lucide-react';

export const ALGORITHM_ICONS: any = {
  'force-directed': Atom,
  'force-atlas-2': Orbit,
  'circular': Circle,
  'radial': Radar,
  'grid': Grid3X3,
  'kamada-kawai': Sparkles,
  'spectral': Waves,
  'hierarchical': GitBranch,
  'concentric': Target,
  'random': Dices,
};

export const ALGORITHM_COLORS: any = {
  'force-directed': '#6366f1',
  'force-atlas-2': '#8b5cf6',
  'circular': '#06b6d4',
  'radial': '#10b981',
  'grid': '#f59e0b',
  'kamada-kawai': '#ec4899',
  'spectral': '#3b82f6',
  'hierarchical': '#14b8a6',
  'concentric': '#f97316',
  'random': '#64748b',
};

export const DEFAULT_ALGORITHM_ICON = LayoutGrid;
export const DEFAULT_ALGORITHM_COLOR = '#6366f1';

export const ALGORITHM_OPTIONS: any = {
  'force-directed': [
    { key: 'repulsionForce', label: 'Repulsion', min: 100, max: 1000, step: 10, default: 600 },
    { key: 'attractionForce', label: 'Attraction', min: 0.1, max: 5, step: 0.1, default: 0.8 },
    { key: 'iterations', label: 'Iterations', min: 50, max: 500, step: 10, default: 300 },
  ],
  'force-atlas-2': [
    { key: 'gravity', label: 'Gravity', min: 0.1, max: 10, step: 0.1, default: 1 },
    { key: 'scaling', label: 'Scaling', min: 1, max: 20, step: 1, default: 10 },
    { key: 'iterations', label: 'Iterations', min: 50, max: 500, step: 10, default: 250 },
  ],
  'circular': [
    { key: 'radius', label: 'Radius', min: 200, max: 1200, step: 10, default: 600 },
  ],
  'radial': [
    { key: 'ringDistance', label: 'Ring Distance', min: 150, max: 600, step: 10, default: 320 },
    { key: 'maxRings', label: 'Max Rings', min: 2, max: 10, step: 1, default: 5 },
  ],
  'grid': [
    { key: 'columns', label: 'Columns', min: 2, max: 10, step: 1, default: 3 },
    { key: 'spacing', label: 'Spacing', min: 200, max: 600, step: 10, default: 300 },
  ],
  'kamada-kawai': [
    { key: 'idealEdgeLength', label: 'Edge Length', min: 150, max: 600, step: 10, default: 320 },
    { key: 'maxIterations', label: 'Max Iterations', min: 100, max: 1000, step: 50, default: 500 },
  ],
  'spectral': [
    { key: 'scaling', label: 'Scaling', min: 200, max: 1000, step: 10, default: 550 },
  ],
  'hierarchical': [
    { key: 'levelSpacing', label: 'Level Spacing', min: 150, max: 600, step: 10, default: 320 },
    { key: 'nodeSpacing', label: 'Node Spacing', min: 150, max: 500, step: 10, default: 250 },
  ],
  'concentric': [
    { key: 'ringCount', label: 'Ring Count', min: 2, max: 8, step: 1, default: 4 },
    { key: 'ringSpacing', label: 'Ring Spacing', min: 200, max: 600, step: 10, default: 380 },
  ],
  'random': [
    { key: 'spreadRadius', label: 'Spread', min: 500, max: 3000, step: 50, default: 1400 },
  ],
};

export const ANIMATION_VARIANTS: any = {
  fadeSlideIn: {
    initial: { opacity: 0, y: -6, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -4, scale: 0.98 },
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },

  panel: {
    initial: { opacity: 0, y: -12, scale: 0.95, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -8, scale: 0.96, filter: 'blur(2px)' },
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },

  topbar: {
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 350, damping: 28, delay: 0.05 },
    },
    hidden: {
      opacity: 0,
      y: -80,
      transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
    },
  },

  cardHover: {
    whileHover: {
      scale: 1.03,
      y: -2,
      transition: { type: 'spring', stiffness: 500, damping: 25 },
    },
    whileTap: { scale: 0.97 },
  },
};

export const getDefaultOptions = (algorithmKey: string): any => {
  const config = ALGORITHM_OPTIONS[algorithmKey];
  if (!config) return {};

  return config.reduce((defaults: any, option: any) => {
    defaults[option.key] = option.default;
    return defaults;
  }, {});
};