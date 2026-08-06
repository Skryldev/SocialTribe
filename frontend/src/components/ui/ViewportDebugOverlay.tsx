import React, { memo, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewportGraphStore } from './viewportGraphStore';
import { viewportCache } from './viewportCacheManager';
import {
  Activity,
  Database,
  Cpu,
  Zap,
  Eye,
  MapPin,
  Move,
  RefreshCw,
  Clock,
  HardDrive,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronUp,
  EyeOff,
  Bug
} from 'lucide-react';

const useHideOnIdle = ({ 
  idleTimeout = 3000, 
  triggerZoneHeight = 60,
  initiallyVisible = true 
}: any = {}): any => {
  const [isVisible, setIsVisible] = useState<boolean>(initiallyVisible);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [manuallyHidden, setManuallyHidden] = useState<boolean>(false);
  const idleTimerRef = React.useRef<any>(null);
  const containerRef = React.useRef<any>(null);
  const isManuallyHiddenRef = React.useRef<boolean>(false);
  
  React.useEffect(() => {
    isManuallyHiddenRef.current = manuallyHidden;
  }, [manuallyHidden]);
  
  const show = useCallback(() => {
    setManuallyHidden(false);
    setIsVisible(true);
    resetIdleTimer();
  }, []);
  
  const toggle = useCallback(() => {
    setIsVisible((prev: boolean) => {
      if (prev) {
        setManuallyHidden(true);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
        return false;
      } else {
        setManuallyHidden(false);
        resetIdleTimer();
        return true;
      }
    });
  }, []);
  
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    if (!isManuallyHiddenRef.current) {
      idleTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, idleTimeout);
    }
  }, [idleTimeout]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isManuallyHiddenRef.current) return;
    
    if (e.clientY >= window.innerHeight - triggerZoneHeight && e.clientX <= 300) {
      setIsHovering(true);
      setIsVisible(true);
      resetIdleTimer();
    } else if (e.clientY < window.innerHeight - triggerZoneHeight - 20 || e.clientX > 320) {
      setIsHovering(false);
      resetIdleTimer();
    }
  }, [triggerZoneHeight, resetIdleTimer]);
  
  const handleMouseEnter = useCallback(() => {
    if (isManuallyHiddenRef.current) return;
    setIsHovering(true);
    setIsVisible(true);
    resetIdleTimer();
  }, [resetIdleTimer]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    resetIdleTimer();
  }, [resetIdleTimer]);
  
  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    resetIdleTimer();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [handleMouseMove, resetIdleTimer]);
  
  return {
    isVisible,
    show,
    toggle,
    manuallyHidden,
    containerRef,
    handleMouseEnter,
    handleMouseLeave,
    isHovering,
  };
};

interface ShortcutConfig {
  code: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

const useKeyboardShortcut = (shortcut: ShortcutConfig, callback: () => void, enabled: boolean = true): void => {
  React.useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const { code, ctrlKey, shiftKey, altKey, metaKey } = e;
      
      const isMatch = 
        code === shortcut.code &&
        !!ctrlKey === !!shortcut.ctrl &&
        !!shiftKey === !!shortcut.shift &&
        !!altKey === !!shortcut.alt &&
        !!metaKey === !!shortcut.meta;
      
      if (isMatch) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      
        callback();
        return false;
      }
    };

    window.addEventListener('keydown', handler, { capture: true, passive: false });
    document.addEventListener('keydown', handler, { capture: true, passive: false });
    
    return () => {
      window.removeEventListener('keydown', handler, { capture: true });
      document.removeEventListener('keydown', handler, { capture: true });
    };
  }, [shortcut.code, shortcut.ctrl, shortcut.shift, shortcut.alt, shortcut.meta, callback, enabled]);
};

const overlayVisibility = {
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: 'spring' as const, 
      stiffness: 350, 
      damping: 28,
      delay: 0.05
    } 
  },
  hidden: { 
    opacity: 0, 
    x: -40,
    transition: { 
      duration: 0.3, 
      ease: [0.4, 0, 0.2, 1] as const
    } 
  }
};

const floatingButtonAnimation = {
  initial: { opacity: 0, scale: 0.8, x: -10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    x: 0,
    transition: { delay: 0.3, type: 'spring' as const, stiffness: 400, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.8, x: -10 },
};

const contentAnimation = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } as const},
  exit: { opacity: 0, height: 0, transition: { duration: 0.15 } },
};

const THEME = {
  primary: {
    main: "#3b82f6",
    dark: "#2563eb",
    light: "#60a5fa",
    glow: "rgba(59,130,246,0.35)",
  },
  accent: {
    main: "#f59e0b",
    dark: "#d97706",
    light: "#fbbf24",
    glow: "rgba(245,158,11,0.3)",
  },
  success: {
    main: "#10b981",
    dark: "#059669",
    light: "#34d399",
    glow: "rgba(16,185,129,0.25)",
  },
  warning: {
    main: "#f59e0b",
    dark: "#d97706",
    light: "#fbbf24",
    glow: "rgba(245,158,11,0.25)",
  },
  danger: {
    main: "#ef4444",
    dark: "#dc2626",
    light: "#f87171",
    glow: "rgba(239,68,68,0.25)",
  },
  background: {
    base: "rgba(15, 23, 42, 0.96)",
    surface: "rgba(30, 41, 59, 0.6)",
    border: "rgba(59, 130, 246, 0.2)",
    borderStrong: "rgba(59, 130, 246, 0.35)",
  },
  text: {
    primary: "#f1f5f9",
    secondary: "#cbd5e1",
    tertiary: "#94a3b8",
    muted: "rgba(148, 163, 184, 0.6)",
    dim: "rgba(148, 163, 184, 0.35)",
  },
};

const BackgroundPattern = () => (
  <svg style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.035,
    pointerEvents: 'none',
    borderRadius: 'inherit',
  }}>
    <defs>
      <pattern id="debugGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.7" fill={THEME.primary.main} />
        <circle cx="12" cy="12" r="0.4" fill={THEME.accent.main} />
      </pattern>
      <pattern id="debugDiagonal" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1="0" y1="0" x2="0" y2="28" stroke={THEME.accent.main} strokeWidth="0.4" />
      </pattern>
      <linearGradient id="debugGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={THEME.primary.main} stopOpacity="0" />
        <stop offset="50%" stopColor={THEME.primary.main} stopOpacity="0.04" />
        <stop offset="100%" stopColor={THEME.accent.main} stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#debugGrid)" />
    <rect width="100%" height="100%" fill="url(#debugDiagonal)" />
    <rect width="100%" height="100%" fill="url(#debugGlow)" />
  </svg>
);

interface MetricRowProps {
  label: string;
  value: string;
  icon?: React.ComponentType<any>;
  warn?: boolean;
  good?: boolean;
  info?: boolean;
  highlight?: boolean;
}

const MetricRow = ({ label, value, icon: Icon, warn, good, info, highlight }: MetricRowProps) => {
  let valueColor = THEME.text.primary;
  let statusIcon: React.ReactElement | null = null;

  if (good) {
    valueColor = THEME.success.light;
    statusIcon = <CheckCircle size={10} color={THEME.success.light} />;
  } else if (warn) {
    valueColor = THEME.warning.light;
    statusIcon = <AlertCircle size={10} color={THEME.warning.light} />;
  } else if (info) {
    valueColor = THEME.primary.light;
    statusIcon = null;
  }

  const content = (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      padding: '6px 0',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: THEME.text.muted,
        fontSize: 10,
        fontWeight: 500,
      }}>
        {Icon && <Icon size={12} />}
        <span>{label}</span>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: valueColor,
        fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      }}>
        {statusIcon}
        <span>{value}</span>
      </div>
    </div>
  );

  if (highlight) {
    return (
      <div style={{
        background: `linear-gradient(90deg, ${THEME.primary.main}10, transparent)`,
        borderRadius: 8,
        padding: '2px 8px',
        margin: '2px 0',
        borderLeft: `2px solid ${THEME.primary.main}`,
      }}>
        {content}
      </div>
    );
  }
  return content;
};

interface SectionHeaderProps {
  title: string;
  icon: React.ComponentType<any>;
}

const SectionHeader = ({ title, icon: Icon }: SectionHeaderProps) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `1px solid ${THEME.background.border}`,
  }}>
    <Icon size={11} color={THEME.primary.light} />
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: THEME.text.muted,
    }}>{title}</span>
  </div>
);

interface FloatingShowButtonProps {
  onClick: () => void;
  isVisible: boolean;
  position?: any;
}

const FloatingShowButton = memo(({ onClick, isVisible, position = {} }: FloatingShowButtonProps) => {
  if (isVisible) return null;
  
  return (
    <motion.button
      onClick={onClick}
      variants={floatingButtonAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={{ scale: 1.1, boxShadow: `0 4px 16px ${THEME.primary.glow}` }}
      whileTap={{ scale: 0.95 }}
      title="Show debug overlay (Ctrl+Shift+D)"
      style={{
        position: 'fixed',
        bottom: position.bottom || '16px',
        left: position.left || '16px',
        zIndex: 1098,
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: `1px solid ${THEME.background.border}`,
        background: THEME.background.base,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: THEME.primary.light,
        transition: 'all 0.15s ease',
        ...position,
      }}
    >
      <Bug size={16} />
      <motion.div
        style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: THEME.primary.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          fontWeight: 'bold',
          color: 'white',
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronUp size={8} />
      </motion.div>
    </motion.button>
  );
});

FloatingShowButton.displayName = 'FloatingShowButton';

interface TriggerZoneProps {
  isVisible: boolean;
  manuallyHidden: boolean;
  onMouseEnter: () => void;
}

const TriggerZone = memo(({ isVisible, manuallyHidden, onMouseEnter }: TriggerZoneProps) => {
  if (manuallyHidden) return null;
  
  return (
    <motion.div
      onMouseEnter={onMouseEnter}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: isVisible ? 0 : 1,
        transition: { duration: 0.3 }
      }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '280px',
        height: '48px',
        zIndex: 1098,
        cursor: 'pointer',
        background: `linear-gradient(0deg, ${THEME.primary.main}10 0%, transparent 100%)`,
        pointerEvents: 'all',
      }}
      title="Hover to show debug overlay (Ctrl+Shift+D)"
    />
  );
});

TriggerZone.displayName = 'TriggerZone';

interface ViewportDebugOverlayProps {
  visible: boolean;
}

export const ViewportDebugOverlay = memo(function ViewportDebugOverlay({ visible }: ViewportDebugOverlayProps): React.ReactElement | null {
  const [minimised, setMinimised] = useState<boolean>(true);

  const stats = useViewportGraphStore((s: any) => s.stats);
  const isLoading = useViewportGraphStore((s: any) => s.isLoading);
  const isFetching = useViewportGraphStore((s: any) => s.isFetching);
  const nodes = useViewportGraphStore((s: any) => s.nodes);
  const edges = useViewportGraphStore((s: any) => s.edges);
  const initialLoadDone = useViewportGraphStore((s: any) => s.initialLoadDone);

  const {
    isVisible,
    show,
    toggle,
    manuallyHidden,
    containerRef,
    handleMouseEnter,
    handleMouseLeave,
  } = useHideOnIdle({ 
    idleTimeout: 5000,
    triggerZoneHeight: 60,
    initiallyVisible: true 
  });

  useKeyboardShortcut(
    { code: 'KeyD', ctrl: true, shift: true, alt: false, meta: false },
    () => {
      toggle();
    },
    true
  );

  const shouldShow = visible && isVisible;

  if (!visible) return null;

  const cacheStats = viewportCache.getStats();
  const active = isFetching || isLoading;

  const graphDensity = useMemo(() => {
    if (nodes.length < 2) return 0;
    const maxEdges = (nodes.length * (nodes.length - 1)) / 2;
    return (edges.length / maxEdges) * 100;
  }, [nodes, edges]);

  const avgDegree = useMemo(() => {
    if (nodes.length === 0) return 0;
    return (edges.length * 2 / nodes.length).toFixed(2);
  }, [nodes, edges]);

  const memoryUsage = useMemo(() => {
    if (!(window as any).performance?.memory) return null;
    const used = (window as any).performance.memory.usedJSHeapSize / (1024 * 1024);
    const total = (window as any).performance.memory.jsHeapSizeLimit / (1024 * 1024);
    return { used: used.toFixed(1), total: total.toFixed(1), percentage: (used / total * 100).toFixed(1) };
  }, []);

  const hitRatioGood = cacheStats.hitRatio > 70;
  const hitRatioWarn = cacheStats.hitRatio < 40 && cacheStats.hitRatio > 0;
  const densityGood = graphDensity > 10;
  const densityWarn = graphDensity > 0 && graphDensity < 5;

  const FLOATING_BUTTON_POSITION = { bottom: '16px', left: '64px' };

  return (
    <>
      <FloatingShowButton 
        isVisible={isVisible}
        onClick={show}
        position={FLOATING_BUTTON_POSITION}
      />

      <AnimatePresence>
        {!isVisible && (
          <TriggerZone 
            isVisible={isVisible}
            manuallyHidden={manuallyHidden}
            onMouseEnter={show}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={containerRef}
        variants={overlayVisibility}
        initial="visible"
        animate={shouldShow ? "visible" : "hidden"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 9999,
          background: THEME.background.base,
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: `1px solid ${THEME.background.border}`,
          borderRadius: 18,
          padding: '12px 16px',
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 11,
          color: THEME.text.secondary,
          minWidth: 280,
          maxWidth: 320,
          boxShadow: '0 12px 32px -8px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.1) inset',
          userSelect: 'none',
          lineHeight: 1.5,
          overflow: 'hidden',
          pointerEvents: shouldShow ? 'all' : 'none',
        }}
      >
        <BackgroundPattern />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: minimised ? 0 : 12,
          paddingBottom: minimised ? 0 : 8,
          borderBottom: minimised ? 'none' : `1px solid ${THEME.background.border}`,
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: active ? THEME.accent.main : THEME.success.main,
              boxShadow: active ? `0 0 8px ${THEME.accent.glow}` : 'none',
              animation: active ? 'pulse 1.5s infinite' : 'none',
            }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Activity size={12} color={THEME.primary.light} />
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: THEME.text.primary,
              }}>DEBUG</span>
            </div>
            <span style={{
              fontSize: 8,
              color: THEME.text.dim,
              fontFamily: 'monospace',
            }}>v2.0</span>
          </div>
          
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={toggle}
              style={{
                background: 'transparent',
                border: `1px solid ${THEME.background.border}`,
                borderRadius: 12,
                color: THEME.text.muted,
                cursor: 'pointer',
                fontSize: 9,
                padding: '3px 8px',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                (e.target as HTMLElement).style.background = `${THEME.danger.main}15`;
                (e.target as HTMLElement).style.borderColor = THEME.danger.main;
                (e.target as HTMLElement).style.color = THEME.danger.light;
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                (e.target as HTMLElement).style.background = 'transparent';
                (e.target as HTMLElement).style.borderColor = THEME.background.border;
                (e.target as HTMLElement).style.color = THEME.text.muted;
              }}
              title={manuallyHidden ? 'Debug overlay hidden. Click to show (Ctrl+Shift+D)' : 'Hide debug overlay (Ctrl+Shift+D)'}
            >
              {isVisible ? <EyeOff size={10} /> : <Eye size={10} />}
              <span>{isVisible ? 'HIDE' : 'SHOW'}</span>
            </button>
            
            <button
              onClick={() => setMinimised((m: boolean) => !m)}
              style={{
                background: 'transparent',
                border: `1px solid ${THEME.background.border}`,
                borderRadius: 12,
                color: THEME.text.muted,
                cursor: 'pointer',
                fontSize: 9,
                padding: '3px 10px',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                fontWeight: 600,
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                (e.target as HTMLElement).style.background = `${THEME.primary.main}15`;
                (e.target as HTMLElement).style.borderColor = THEME.primary.main;
                (e.target as HTMLElement).style.color = THEME.primary.light;
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                (e.target as HTMLElement).style.background = 'transparent';
                (e.target as HTMLElement).style.borderColor = THEME.background.border;
                (e.target as HTMLElement).style.color = THEME.text.muted;
              }}
            >
              {minimised ? '▼ DETAILS' : '▲ MINIMISE'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!minimised && (
            <motion.div 
              {...contentAnimation}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <SectionHeader title="GRAPH" icon={BarChart3} />
              <MetricRow 
                label="Nodes" 
                value={nodes.length.toLocaleString()}
                icon={MapPin}
                good={nodes.length > 0}
                highlight={nodes.length > 0}
              />
              <MetricRow 
                label="Edges" 
                value={edges.length.toLocaleString()}
                icon={Move}
              />
              <MetricRow 
                label="Avg Degree" 
                value={avgDegree as string}
                icon={TrendingUp}
                info={true}
              />
              <MetricRow 
                label="Density" 
                value={`${graphDensity.toFixed(2)}%`}
                icon={Cpu}
                good={densityGood}
                warn={densityWarn}
              />
              <MetricRow 
                label="Status" 
                value={initialLoadDone ? 'Ready' : 'Loading'}
                icon={initialLoadDone ? CheckCircle : RefreshCw}
                good={initialLoadDone}
                warn={!initialLoadDone}
              />

              <div style={{ marginTop: 12 }}>
                <SectionHeader title="CACHE" icon={Database} />
                <MetricRow 
                  label="Cached Cells" 
                  value={cacheStats.cachedCells.toLocaleString()}
                  icon={HardDrive}
                />
                <MetricRow 
                  label="Pending Cells" 
                  value={String(cacheStats.pendingCells)}
                  icon={Clock}
                  warn={cacheStats.pendingCells > 0}
                />
                <MetricRow 
                  label="Hit Ratio" 
                  value={`${cacheStats.hitRatio}%`}
                  icon={Zap}
                  good={hitRatioGood}
                  warn={hitRatioWarn}
                  highlight={hitRatioGood || hitRatioWarn}
                />
                <MetricRow 
                  label="Evictions" 
                  value={cacheStats.evictions.toLocaleString()}
                  icon={RefreshCw}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <SectionHeader title="SYSTEM" icon={Activity} />
                <MetricRow 
                  label="Network" 
                  value={isLoading ? 'LOADING' : isFetching ? 'FETCHING' : 'IDLE'}
                  icon={isLoading || isFetching ? RefreshCw : CheckCircle}
                  warn={isFetching}
                  good={!isLoading && !isFetching}
                />
                {memoryUsage && (
                  <MetricRow 
                    label="Memory" 
                    value={`${memoryUsage.used} / ${memoryUsage.total} MB`}
                    icon={HardDrive}
                    warn={Number(memoryUsage.percentage) > 80}
                    good={Number(memoryUsage.percentage) < 50}
                  />
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <SectionHeader title="VIEWPORT" icon={Eye} />
                <MetricRow 
                  label="X" 
                  value={stats.viewportX?.toFixed(0) ?? '—'}
                  icon={MapPin}
                />
                <MetricRow 
                  label="Y" 
                  value={stats.viewportY?.toFixed(0) ?? '—'}
                  icon={MapPin}
                />
                <MetricRow 
                  label="Zoom" 
                  value={stats.zoom?.toFixed(2) ?? '—'}
                  icon={Eye}
                  good={stats.zoom === 1}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
          }
        `}} />
      </motion.div>
    </>
  );
});