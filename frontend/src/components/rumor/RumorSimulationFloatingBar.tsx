import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Eye, EyeOff } from 'lucide-react';

interface UseHideOnIdleOptions {
  idleTimeout?: number;
  triggerZoneHeight?: number;
  triggerZoneWidth?: number;
  initiallyVisible?: boolean;
  position?: string;
}

interface UseHideOnIdleReturn {
  isVisible: boolean;
  show: () => void;
  toggle: () => void;
  manuallyHidden: boolean;
  containerRef: React.RefObject<any>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  isHovering: boolean;
}

const useHideOnIdle = ({ 
  idleTimeout = 3000, 
  triggerZoneHeight = 60,
  triggerZoneWidth = 300,
  initiallyVisible = true,
  position = 'bottom-right',
}: UseHideOnIdleOptions = {}): UseHideOnIdleReturn => {
  const [isVisible, setIsVisible] = useState<boolean>(initiallyVisible);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [manuallyHidden, setManuallyHidden] = useState<boolean>(false);
  const idleTimerRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const isManuallyHiddenRef = useRef<boolean>(false);
  
  useEffect(() => {
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
    
    let inTriggerZone = false;
    
    if (position === 'bottom-right') {
      inTriggerZone = 
        e.clientY >= window.innerHeight - triggerZoneHeight && 
        e.clientX >= window.innerWidth - triggerZoneWidth;
    } else if (position === 'bottom-left') {
      inTriggerZone = 
        e.clientY >= window.innerHeight - triggerZoneHeight && 
        e.clientX <= triggerZoneWidth;
    } else if (position === 'top-right') {
      inTriggerZone = 
        e.clientY <= triggerZoneHeight && 
        e.clientX >= window.innerWidth - triggerZoneWidth;
    }
    
    if (inTriggerZone) {
      setIsHovering(true);
      setIsVisible(true);
      resetIdleTimer();
    } else {
      setIsHovering(false);
      resetIdleTimer();
    }
  }, [triggerZoneHeight, triggerZoneWidth, position, resetIdleTimer]);
  
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
  
  useEffect(() => {
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
  useEffect(() => {
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

const barVisibility = {
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      type: 'spring' as const, 
      stiffness: 400, 
      damping: 28,
      delay: 0.05
    } 
  },
  hidden: { 
    opacity: 0, 
    y: 60,
    scale: 0.9,
    transition: { 
      duration: 0.3, 
      ease: [0.4, 0, 0.2, 1] as const
    } 
  }
};

const floatingButtonAnimation = {
  initial: { opacity: 0, scale: 0.8, y: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { delay: 0.3, type: 'spring' as const, stiffness: 400, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.8, y: 10 },
};

const THEME = {
  primary: {
    main: "#ea580c",
    dark: "#c2410c",
    light: "#f97316",
    glow: "rgba(234,88,12,0.35)",
  },
  success: {
    main: "#15803d",
    light: "#22c55e",
    glow: "rgba(21,128,61,0.25)",
  },
  warning: {
    main: "#d97706",
    light: "#f59e0b",
  },
  background: {
    base: "rgba(12, 10, 15, 0.92)",
    surface: "rgba(30, 27, 36, 0.6)",
    border: "rgba(68, 58, 48, 0.4)",
  },
  text: {
    primary: "#fef3c7",
    secondary: "#fde68a",
    muted: "rgba(253, 230, 138, 0.5)",
  },
};

const BarPattern = () => (
  <svg style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.04,
    pointerEvents: 'none',
    borderRadius: 'inherit',
  }}>
    <defs>
      <pattern id="barDiagonal" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="20" stroke={THEME.primary.main} strokeWidth="0.6" />
      </pattern>
      <pattern id="barDots" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="6" cy="6" r="0.8" fill={THEME.primary.light} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#barDiagonal)" />
    <rect width="100%" height="100%" fill="url(#barDots)" />
  </svg>
);

interface FloatingShowButtonProps {
  onClick: () => void;
  isVisible: boolean;
  position?: any;
}

const FloatingShowButton = ({ onClick, isVisible, position = {} }: FloatingShowButtonProps) => {
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
      title="Show rumor controls (Ctrl+Shift+R)"
      style={{
        position: 'fixed',
        bottom: position.bottom || '20px',
        right: position.right || '20px',
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
      <span style={{ fontSize: '14px' }}>🦠</span>
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
};

interface TriggerZoneProps {
  isVisible: boolean;
  manuallyHidden: boolean;
  onMouseEnter: () => void;
  position?: string;
}

const TriggerZone = ({ isVisible, manuallyHidden, onMouseEnter, position = 'bottom-right' }: TriggerZoneProps) => {
  if (manuallyHidden) return null;
  
  const zoneStyle: any = {
    position: 'fixed',
    zIndex: 1098,
    cursor: 'pointer',
    pointerEvents: 'all',
  };
  
  if (position === 'bottom-right') {
    zoneStyle.bottom = 0;
    zoneStyle.right = 0;
    zoneStyle.width = '280px';
    zoneStyle.height = '48px';
    zoneStyle.background = `linear-gradient(0deg, ${THEME.primary.main}10 0%, transparent 100%)`;
  }
  
  return (
    <motion.div
      onMouseEnter={onMouseEnter}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: isVisible ? 0 : 1,
        transition: { duration: 0.3 }
      }}
      style={zoneStyle}
      title="Hover to show rumor controls (Ctrl+Shift+R)"
    />
  );
};

const injectStyles = (): void => {
  if (document.head.querySelector('style[data-rumor-bar]')) return;
  
  const styleSheet = document.createElement("style");
  styleSheet.setAttribute('data-rumor-bar', 'true');
  styleSheet.textContent = `
    @keyframes rumorPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
  `;
  document.head.appendChild(styleSheet);
};

injectStyles();

const BAR_STYLE: React.CSSProperties = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 9000,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px 6px 14px',
  background: THEME.background.base,
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: `1px solid ${THEME.background.border}`,
  borderRadius: 40,
  boxShadow: `0 8px 28px -8px rgba(0,0,0,0.5), 0 0 0 1px ${THEME.primary.main}15 inset`,
  fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif",
  userSelect: 'none',
  overflow: 'hidden',
};

const BTN_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 30,
  border: 'none',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif",
  fontWeight: 500,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  letterSpacing: '-0.01em',
  outline: 'none',
  whiteSpace: 'nowrap',
};

const BTN_GHOST: React.CSSProperties = {
  ...BTN_BASE,
  background: 'transparent',
  color: THEME.text.secondary,
  border: `1px solid ${THEME.background.border}`,
};

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN_BASE,
  background: `linear-gradient(135deg, ${THEME.primary.main}, ${THEME.primary.dark})`,
  color: '#ffffff',
  border: 'none',
  boxShadow: `0 2px 8px ${THEME.primary.glow}`,
};

const BTN_WARNING: React.CSSProperties = {
  ...BTN_BASE,
  background: `${THEME.warning.main}20`,
  color: THEME.warning.light,
  border: `1px solid ${THEME.warning.main}40`,
};

const RUNNING_INDICATOR: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: THEME.success.light,
  boxShadow: `0 0 8px ${THEME.success.glow}`,
  marginRight: 6,
  animation: 'rumorPulse 1.2s ease-in-out infinite',
};

interface RumorSimulationFloatingBarProps {
  isDrawerOpen: boolean;
  isRunning: boolean;
  isComplete: boolean;
  currentDay: number;
  coverage: number;
  onToggleDrawer: () => void;
  onQuickStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function RumorSimulationFloatingBar({
  isDrawerOpen,
  isRunning,
  isComplete,
  currentDay,
  coverage,
  onToggleDrawer,
  onQuickStart,
  onPause,
  onReset,
}: RumorSimulationFloatingBarProps): React.ReactElement {
  const coveragePct = (coverage * 100).toFixed(0);

  const {
    isVisible,
    show,
    toggle,
    manuallyHidden,
    containerRef,
    handleMouseEnter,
    handleMouseLeave,
  } = useHideOnIdle({ 
    idleTimeout: 4000,
    triggerZoneHeight: 60,
    triggerZoneWidth: 300,
    initiallyVisible: true,
    position: 'bottom-right',
  });

  useKeyboardShortcut(
    { code: 'KeyR', ctrl: true, shift: true, alt: false, meta: false },
    () => {
      toggle();
    },
    true
  );

  const shouldShow = isVisible || isRunning || isDrawerOpen;

  const getDrawerButton = (): { label: string; style: React.CSSProperties } => {
    if (isDrawerOpen) {
      return { label: '⚙️ Config', style: BTN_ACTIVE };
    }
    return { label: '📂 Open', style: BTN_GHOST };
  };

  const drawerButton = getDrawerButton();

  const FLOATING_BUTTON_POSITION = { bottom: '16px', right: '64px' };

  return (
    <>
      <FloatingShowButton 
        isVisible={shouldShow}
        onClick={show}
        position={FLOATING_BUTTON_POSITION}
      />

      <AnimatePresence>
        {!shouldShow && (
          <TriggerZone 
            isVisible={isVisible}
            manuallyHidden={manuallyHidden}
            onMouseEnter={show}
            position="bottom-right"
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={containerRef}
        style={BAR_STYLE}
        variants={barVisibility}
        initial="visible"
        animate={shouldShow ? "visible" : "hidden"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: shouldShow ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <BarPattern />

        <motion.div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingRight: 10,
            borderRight: `1px solid ${THEME.background.border}`,
          }}
          whileHover={{ opacity: 0.9 }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${THEME.primary.main}30, ${THEME.primary.dark}20)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
            }}
          >
            <motion.span
              animate={isRunning ? { rotate: [0, -5, 5, -3, 3, 0] } : {}}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              🦠
            </motion.span>
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: THEME.primary.light,
                lineHeight: 1.2,
              }}
            >
              RUMOR
            </div>
            <div
              style={{
                fontSize: 7,
                letterSpacing: '0.08em',
                color: THEME.text.muted,
                textTransform: 'uppercase',
              }}
            >
              DYNAMICS
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {(isRunning || isComplete) && (
            <motion.div
              initial={{ width: 0, opacity: 0, scale: 0.8 }}
              animate={{ width: 'auto', opacity: 1, scale: 1 }}
              exit={{ width: 0, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {isRunning && <span style={RUNNING_INDICATOR} />}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isRunning ? THEME.success.light : THEME.text.secondary,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                D{currentDay} · {coveragePct}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {(isRunning || isComplete) && (
          <div style={{ width: 1, height: 20, background: THEME.background.border, margin: '0 2px' }} />
        )}

        <motion.button
          style={{
            ...BTN_GHOST,
            padding: '4px 8px',
            fontSize: 10,
            border: 'none',
          }}
          onClick={toggle}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          title={manuallyHidden ? 'Rumor bar hidden. Click to show (Ctrl+Shift+R)' : 'Hide rumor bar (Ctrl+Shift+R)'}
        >
          {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
        </motion.button>

        <motion.button
          style={drawerButton.style}
          onClick={onToggleDrawer}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {drawerButton.label}
        </motion.button>

        {isRunning ? (
          <motion.button
            style={BTN_WARNING}
            onClick={onPause}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            ⏸ Pause
          </motion.button>
        ) : (
          <motion.button
            style={isComplete ? BTN_GHOST : BTN_ACTIVE}
            onClick={isComplete ? onReset : onQuickStart}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            {isComplete ? (
              <>↺ Reset</>
            ) : (
              <>
                <span style={{ marginRight: 2 }}>▶</span> Start
              </>
            )}
          </motion.button>
        )}
      </motion.div>
    </>
  );
}