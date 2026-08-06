import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronUp, Eye, EyeOff, CirclePlus } from 'lucide-react';
import './AddNodeButton.css';

interface UseHideOnIdleOptions {
  idleTimeout?: number;
  triggerZoneWidth?: number;
  initiallyVisible?: boolean;
  edgeOffset?: number;
}

interface UseHideOnIdleReturn {
  isVisible: boolean;
  show: () => void;
  hideNow: () => void;
  toggle: () => void;
  manuallyHidden: boolean;
  containerRef: React.RefObject<any>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  isHovering: boolean;
}

const useHideOnIdle = ({ 
  idleTimeout = 3000, 
  triggerZoneWidth = 80,
  initiallyVisible = true,
  edgeOffset = 0,
}: UseHideOnIdleOptions = {}): UseHideOnIdleReturn => {
  const [isVisible, setIsVisible] = useState<boolean>(initiallyVisible);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [manuallyHidden, setManuallyHidden] = useState<boolean>(false);
  const idleTimerRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const isManuallyHiddenRef = useRef<boolean>(false);
  const isInTriggerZoneRef = useRef<boolean>(false);
  
  useEffect(() => {
    isManuallyHiddenRef.current = manuallyHidden;
  }, [manuallyHidden]);
  
  const show = useCallback(() => {
    setManuallyHidden(false);
    setIsVisible(true);
    resetIdleTimer();
  }, []);
  
  const hideNow = useCallback(() => {
    setIsVisible(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);
  
  const toggle = useCallback(() => {
    setIsVisible(prev => {
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
        if (!isInTriggerZoneRef.current && !isHoveringRef.current) {
          setIsVisible(false);
        }
      }, idleTimeout);
    }
  }, [idleTimeout]);
  
  const isHoveringRef = useRef<boolean>(false);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isManuallyHiddenRef.current) return;
    
    const inRightZone = e.clientX >= window.innerWidth - triggerZoneWidth - edgeOffset;
    isInTriggerZoneRef.current = inRightZone;
    
    if (inRightZone) {
      setIsHovering(true);
      isHoveringRef.current = true;
      setIsVisible(true);
      resetIdleTimer();
    } else {
      setIsHovering(false);
      isHoveringRef.current = false;
      if (!idleTimerRef.current && !isManuallyHiddenRef.current) {
        resetIdleTimer();
      }
    }
  }, [triggerZoneWidth, edgeOffset, resetIdleTimer]);
  
  const handleMouseEnter = useCallback(() => {
    if (isManuallyHiddenRef.current) return;
    setIsHovering(true);
    isHoveringRef.current = true;
    setIsVisible(true);
    resetIdleTimer();
  }, [resetIdleTimer]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    isHoveringRef.current = false;
    resetIdleTimer();
  }, [resetIdleTimer]);
  
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    if (initiallyVisible) {
      resetIdleTimer();
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [handleMouseMove, resetIdleTimer, initiallyVisible]);
  
  return {
    isVisible,
    show,
    hideNow,
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

const useKeyboardShortcut = (
  shortcut: ShortcutConfig,
  callback: () => void,
  enabled: boolean = true
): void => {
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

const buttonVisibility = {
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: { 
      type: 'spring', 
      stiffness: 380, 
      damping: 28,
      delay: 0.05
    } 
  },
  hidden: { 
    opacity: 0, 
    x: 40,
    scale: 0.9,
    transition: { 
      duration: 0.3, 
      ease: [0.4, 0, 0.2, 1] 
    } 
  }
} as const;

const floatingButtonAnimation = {
  initial: { opacity: 0, scale: 0.8, x: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    x: 0,
    transition: { delay: 0.3, stiffness: 400, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.8, x: 10 },
};

const THEME = {
  primary: {
    main: "#8b5cf6",
    dark: "#7c3aed",
    light: "#a78bfa",
    glow: "rgba(139, 92, 246, 0.35)",
  },
  background: {
    base: "rgba(255, 255, 255, 0.95)",
    border: "rgba(139, 92, 246, 0.2)",
  },
  text: {
    primary: "#1e1b4b",
    secondary: "#6366f1",
    muted: "#a5b4fc",
  },
};

interface FloatingShowButtonProps {
  onClick: () => void;
  isVisible: boolean;
  isFormOpen: boolean;
  position?: any;
}

const FloatingShowButton = memo(({ onClick, isVisible, isFormOpen, position = {} }: FloatingShowButtonProps) => {
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
      title={isFormOpen ? 'Close add node form' : 'Show add node button (Ctrl+Shift+A)'}
      style={{
        position: 'fixed',
        top: position.top || '16px',
        right: position.right || '16px',
        zIndex: 1098,
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: `1px solid ${THEME.background.border}`,
        background: isFormOpen 
          ? `linear-gradient(135deg, ${THEME.primary.main}, ${THEME.primary.dark})`
          : THEME.background.base,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isFormOpen 
          ? `0 2px 12px ${THEME.primary.glow}`
          : '0 2px 8px rgba(0, 0, 0, 0.08)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isFormOpen ? 'white' : THEME.primary.main,
        transition: 'all 0.15s ease',
        ...position,
      }}
    >
      {isFormOpen ? <X size={16} strokeWidth={2.25} /> : <CirclePlus size={16} strokeWidth={2.25} />}
      <motion.div
        style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: isFormOpen ? '#ef4444' : THEME.primary.main,
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
        top: 0,
        right: 0,
        width: '60px',
        height: '100vh',
        zIndex: 1098,
        cursor: 'pointer',
        background: `linear-gradient(270deg, ${THEME.primary.main}08 0%, transparent 100%)`,
        pointerEvents: 'all',
      }}
      title="Hover to show add node button (Ctrl+Shift+A)"
    />
  );
});

TriggerZone.displayName = 'TriggerZone';

interface AddNodeButtonProps {
  onAddNode: () => void;
  nodeCount?: number;
  isFormOpen?: boolean;
}

function AddNodeButton({ onAddNode, nodeCount = 0, isFormOpen = false }: AddNodeButtonProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);

  const {
    isVisible,
    show,
    hideNow,
    toggle,
    manuallyHidden,
    containerRef,
    handleMouseEnter,
    handleMouseLeave,
  } = useHideOnIdle({ 
    idleTimeout: 3000,
    triggerZoneWidth: 80,
    initiallyVisible: false,
    edgeOffset: 60,
  });

  useEffect(() => {
    if (isFormOpen) {
      hideNow();
    }
  }, [isFormOpen, hideNow]);

  useKeyboardShortcut(
    { code: 'KeyA', ctrl: true, shift: true, alt: false, meta: false },
    () => {
      if (!isFormOpen && !isPending) {
        show();
        setTimeout(() => handleActivate(), 50);
      }
      if (isFormOpen) {
        toggle();
      }
    },
    true
  );

  useEffect(() => {
    if (!isFormOpen) setIsPending(false);
  }, [isFormOpen]);

  const isLocked = isFormOpen || isPending;

  const handleActivate = useCallback(() => {
    if (isLocked) return;
    setIsPending(true);
    requestAnimationFrame(() => onAddNode?.());
  }, [isLocked, onAddNode]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && !isLocked) {
        event.preventDefault();
        handleActivate();
      }
    },
    [isLocked, handleActivate]
  );

  const label = isFormOpen ? 'Open' : isPending ? 'Adding...' : 'Add Node';
  const shouldShow = !isFormOpen && (isVisible || isHovered);

  const FLOATING_BUTTON_POSITION = { top: '60px', right: '16px' };

  return (
    <>
      <FloatingShowButton 
        isVisible={shouldShow}
        isFormOpen={isFormOpen}
        onClick={isFormOpen ? handleActivate : show}
        position={FLOATING_BUTTON_POSITION}
      />

      <AnimatePresence>
        {!shouldShow && !isFormOpen && !manuallyHidden && (
          <TriggerZone 
            isVisible={isVisible}
            manuallyHidden={manuallyHidden}
            onMouseEnter={show}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={containerRef}
        className="anb-dock"
        variants={buttonVisibility}
        initial="hidden"
        animate={shouldShow ? "visible" : "hidden"}
        onMouseEnter={() => {
          setIsHovered(true);
          handleMouseEnter();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          handleMouseLeave();
        }}
        style={{ pointerEvents: shouldShow ? 'all' : 'none' }}
      >
        <motion.button
          className="anb-toggle-btn"
          onClick={toggle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={manuallyHidden ? 'Add button hidden. Click to show (Ctrl+Shift+A)' : 'Hide add button (Ctrl+Shift+A)'}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: THEME.primary.main,
            fontSize: '10px',
            zIndex: 2,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          {isVisible ? <EyeOff size={10} /> : <Eye size={10} />}
        </motion.button>

        <motion.button
          type="button"
          className={`anb-btn${isLocked ? ' anb-btn-locked' : ''}`}
          onClick={handleActivate}
          onKeyDown={handleKeyDown}
          disabled={isLocked}
          whileHover={isLocked ? undefined : { y: -2 }}
          whileTap={isLocked ? undefined : { scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          aria-label={isFormOpen ? 'Add node form is open' : 'Add a new node'}
          aria-pressed={isFormOpen}
          title={isFormOpen ? 'Form already open' : `Add a new node (Ctrl+Shift+A)`}
        >
          <span className="anb-icon" aria-hidden="true">
            <AnimatePresence mode="wait" initial={false}>
              {isFormOpen ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
                  transition={{ duration: 0.18 }}
                >
                  <X size={16} strokeWidth={2.25} />
                </motion.span>
              ) : (
                <motion.span
                  key="plus"
                  initial={{ opacity: 0, rotate: 45, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -45, scale: 0.6 }}
                  transition={{ duration: 0.18 }}
                >
                  <Plus size={16} strokeWidth={2.25} />
                </motion.span>
              )}
            </AnimatePresence>
          </span>

          <span className="anb-divider" aria-hidden="true">
            <span className="anb-signal-dot" />
          </span>

          <span className="anb-label">{label}</span>

          {nodeCount > 0 && (
            <motion.span
              className="anb-count"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              aria-label={`${nodeCount} node${nodeCount === 1 ? '' : 's'} in the network`}
            >
              {nodeCount > 99 ? '99+' : nodeCount}
            </motion.span>
          )}
        </motion.button>

        <AnimatePresence>
          {isHovered && !isLocked && (
            <motion.div
              className="anb-tooltip"
              role="tooltip"
              initial={{ opacity: 0, x: 8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.95 }}
              transition={{ type: 'spring' as const, stiffness: 480, damping: 32 }}
            >
              <span className="anb-tooltip-title">Create a node</span>
              <span className="anb-tooltip-hint">Ctrl+Shift+A or double-click canvas</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default memo(AddNodeButton);