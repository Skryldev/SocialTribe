import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNodeSearch } from './useNodeSearch';
import { useViewportGraphStore } from './viewportGraphStore';
import { Search, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const THEME = {
  primary: {
    main: '#ea580c',
    dark: '#c2410c',
    light: '#f97316',
    glow: 'rgba(234,88,12,0.35)',
  },
  background: {
    base: 'rgba(12, 10, 15, 0.94)',
    surface: 'rgba(30, 27, 36, 0.6)',
    border: 'rgba(68, 58, 48, 0.5)',
    glass: 'rgba(255,255,255,0.03)',
  },
  text: {
    primary: '#fef3c7',
    secondary: '#fde68a',
    muted: 'rgba(253, 230, 138, 0.5)',
    dim: 'rgba(253, 230, 138, 0.3)',
  },
  font: {
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    sans: "'Inter', 'SF Pro Text', system-ui, sans-serif",
  },
};

const IDLE_TIMEOUT = 5000;
const FLOATING_BUTTON_POSITION = { top: '104px', right: '16px' };

interface UseHideOnIdleOptions {
  idleTimeout?: number;
  initiallyVisible?: boolean;
}

interface UseHideOnIdleReturn {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  manuallyHidden: boolean;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

const useHideOnIdle = ({ idleTimeout = IDLE_TIMEOUT, initiallyVisible = true }: UseHideOnIdleOptions = {}): UseHideOnIdleReturn => {
  const [isVisible, setIsVisible] = useState<boolean>(initiallyVisible);
  const [manuallyHidden, setManuallyHidden] = useState<boolean>(false);
  const idleTimerRef = useRef<any>(null);
  const isManuallyHiddenRef = useRef<boolean>(false);

  useEffect(() => {
    isManuallyHiddenRef.current = manuallyHidden;
  }, [manuallyHidden]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isManuallyHiddenRef.current) {
      idleTimerRef.current = setTimeout(() => setIsVisible(false), idleTimeout);
    }
  }, [idleTimeout]);

  const show = useCallback(() => {
    setManuallyHidden(false);
    setIsVisible(true);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const hide = useCallback(() => {
    setIsVisible(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    setIsVisible((prev: boolean) => {
      if (prev) {
        setManuallyHidden(true);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        return false;
      } else {
        setManuallyHidden(false);
        resetIdleTimer();
        return true;
      }
    });
  }, [resetIdleTimer]);

  const handleMouseEnter = useCallback(() => {
    if (isManuallyHiddenRef.current) return;
    setIsVisible(true);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const handleMouseLeave = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  return {
    isVisible,
    show,
    hide,
    toggle,
    manuallyHidden,
    handleMouseEnter,
    handleMouseLeave,
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
      const isMatch =
        e.code === shortcut.code &&
        !!e.ctrlKey === !!shortcut.ctrl &&
        !!e.shiftKey === !!shortcut.shift &&
        !!e.altKey === !!shortcut.alt &&
        !!e.metaKey === !!shortcut.meta;

      if (isMatch) {
        e.preventDefault();
        e.stopPropagation();
        callback();
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [shortcut.code, shortcut.ctrl, shortcut.shift, shortcut.alt, shortcut.meta, callback, enabled]);
};

const searchVariants = {
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
  },
  hidden: {
    opacity: 0,
    y: -30,
    scale: 0.95,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const floatingBtnVariants = {
  initial: { opacity: 0, scale: 0.8, y: -10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: 0.3, type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.8, y: -10 },
};

interface FloatingShowButtonProps {
  onClick: () => void;
}

const FloatingShowButton = memo(({ onClick }: FloatingShowButtonProps) => (
  <motion.button
    onClick={onClick}
    variants={floatingBtnVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    whileHover={{ scale: 1.1, boxShadow: `0 4px 16px ${THEME.primary.glow}` }}
    whileTap={{ scale: 0.95 }}
    title="Show search (Ctrl+Shift+F)"
    style={{
      position: 'fixed',
      ...FLOATING_BUTTON_POSITION,
      zIndex: 1098,
      width: 36,
      height: 36,
      borderRadius: 10,
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
    }}
  >
    <Search size={16} />
  </motion.button>
));

FloatingShowButton.displayName = 'FloatingShowButton';

const LoadingState = () => (
  <div style={styles.empty}>
    <Loader2 size={20} style={styles.spinner} />
    <p style={styles.emptyText}>Loading nodes...</p>
  </div>
);

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <div style={styles.empty}>
    <AlertCircle size={20} style={{ color: '#ef4444', marginBottom: 8 }} />
    <p style={styles.emptyText}>{message}</p>
    <button style={styles.retryBtn} onClick={onRetry}>
      Retry
    </button>
  </div>
);

interface EmptyResultsProps {
  query: string;
}

const EmptyResults = ({ query }: EmptyResultsProps) => (
  <div style={styles.empty}>
    <span style={styles.emptyIcon}>🔍</span>
    <p style={styles.emptyText}>No nodes matching "{query}"</p>
  </div>
);

const styles: any = {
  root: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 50,
    fontFamily: THEME.font.sans,
    pointerEvents: 'auto',
  },
  wrapper: (focused: boolean) => ({
    position: 'relative',
    width: 320,
    background: THEME.background.base,
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: `1px solid ${focused ? THEME.primary.main + '80' : THEME.background.border}`,
    borderRadius: 14,
    boxShadow: focused
      ? `0 0 0 2px ${THEME.primary.glow}, 0 8px 32px rgba(0,0,0,0.5)`
      : `0 8px 28px -8px rgba(0,0,0,0.4)`,
    transition: 'border-color 0.18s, box-shadow 0.18s',
    overflow: 'visible',
  }),
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    position: 'relative',
    zIndex: 1,
  },
  input: {
    all: 'unset',
    flex: 1,
    fontSize: 13,
    fontFamily: THEME.font.mono,
    color: THEME.text.primary,
    letterSpacing: '-0.01em',
    caretColor: THEME.primary.main,
    fontWeight: 450,
  },
  counter: {
    fontSize: 10,
    fontFamily: THEME.font.mono,
    fontWeight: 600,
    color: THEME.primary.light,
    background: `${THEME.primary.main}15`,
    padding: '2px 8px',
    borderRadius: 20,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    border: `1px solid ${THEME.primary.main}25`,
  },
  iconBtn: {
    all: 'unset',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 6,
    color: THEME.text.muted,
    transition: 'all 0.12s',
    flexShrink: 0,
  },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontFamily: THEME.font.mono,
    color: THEME.text.dim,
    border: `1px solid ${THEME.background.border}`,
    borderRadius: 5,
    padding: '2px 6px',
    minWidth: 28,
    background: THEME.background.glass,
    letterSpacing: '0.04em',
    flexShrink: 0,
    fontWeight: 500,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    background: THEME.background.base,
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: `1px solid ${THEME.background.border}`,
    borderRadius: 14,
    boxShadow: '0 12px 40px -12px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    zIndex: 9999,
  },
  dropHeader: {
    padding: '8px 14px 6px',
    fontSize: 9,
    fontFamily: THEME.font.mono,
    fontWeight: 600,
    color: THEME.text.muted,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${THEME.background.border}`,
  },
  list: {
    maxHeight: 240,
    overflowY: 'auto',
  },
  item: (active: boolean, accent: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    cursor: 'pointer',
    background: active ? `${THEME.primary.main}12` : 'transparent',
    borderLeft: active ? `3px solid ${accent}` : '3px solid transparent',
    transition: 'background 0.1s, border-left-color 0.1s',
  }),
  itemLabel: {
    fontSize: 12.5,
    fontFamily: THEME.font.sans,
    fontWeight: 500,
    color: THEME.text.primary,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemIdx: {
    fontSize: 9,
    fontFamily: THEME.font.mono,
    color: THEME.text.dim,
    flexShrink: 0,
  },
  hints: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px 10px',
    borderTop: `1px solid ${THEME.background.border}`,
  },
  hintText: {
    fontSize: 9,
    fontFamily: THEME.font.mono,
    color: THEME.text.muted,
  },
  empty: {
    padding: '24px 14px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 28,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 11,
    fontFamily: THEME.font.sans,
    color: THEME.text.muted,
    fontWeight: 500,
  },
  retryBtn: {
    all: 'unset',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: THEME.font.mono,
    color: THEME.primary.light,
    padding: '4px 12px',
    borderRadius: 6,
    border: `1px solid ${THEME.primary.main}40`,
    marginTop: 4,
    transition: 'all 0.12s',
  },
  spinner: {
    color: THEME.primary.light,
    animation: 'spin 0.8s linear infinite',
  },
  searchIcon: (focused: boolean) => ({
    flexShrink: 0,
    color: focused ? THEME.primary.light : THEME.text.muted,
    transition: 'color 0.15s',
  }),
};

function injectStyles(): void {
  if (document.getElementById('nsb-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'nsb-global-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

interface NodeSearchBoxProps {
  onNodeSelect: (nodeId: string) => void;
  highlightColor?: string;
  zoomDuration?: number;
  placeholder?: string;
}

export function NodeSearchBox({
  onNodeSelect,
  highlightColor,
  zoomDuration = 600,
  placeholder = 'Search nodes…',
}: NodeSearchBoxProps): React.ReactElement {
  const { fitView, setCenter } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [focused, setFocused] = useState<boolean>(false);

  const {
    query,
    setQuery,
    results,
    currentNode,
    currentIndex,
    isDebouncing,
    hasQuery,
    isLoading,
    error,
    totalNodes,
    next,
    prev,
    clearSearch,
    refetch,
  } = useNodeSearch({ autoFetch: true });

  const accent = highlightColor ?? THEME.primary.main;

  const {
    isVisible,
    show,
    toggle,
    manuallyHidden,
    handleMouseEnter,
    handleMouseLeave,
  } = useHideOnIdle({ idleTimeout: IDLE_TIMEOUT });

  useKeyboardShortcut(
    { code: 'KeyF', ctrl: true, shift: true },
    () => {
      toggle();
      if (!isVisible) {
        setTimeout(() => {
          inputRef.current?.focus();
          setOpen(true);
        }, 100);
      }
    },
    true
  );

  useEffect(() => {
    injectStyles();
  }, []);

  const flyToNode = useCallback((node: any) => {
    if (!node) return;

    const position = node.position || { x: 0, y: 0 };
    const hasValidPosition =
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      isFinite(position.x) &&
      isFinite(position.y);

    const storeNode = useViewportGraphStore.getState()._nodeMap.get(node.id);
    if (storeNode) {
      fitView({
        nodes: [storeNode],
        duration: zoomDuration,
        padding: 0.25,
        maxZoom: 1.5,
      });
      onNodeSelect?.(node.id);
      return;
    }

    if (hasValidPosition) {

      setCenter(position.x, position.y, {
        duration: zoomDuration,
        zoom: 1.2,
      });

      setTimeout(() => {
        const updatedNode = useViewportGraphStore.getState()._nodeMap.get(node.id);
        if (updatedNode) {
          fitView({
            nodes: [updatedNode],
            duration: 400,
            padding: 0.25,
            maxZoom: 1.5,
          });
          onNodeSelect?.(node.id);
        }
      }, zoomDuration + 300);
      return;
    }

    setCenter(0, 0, { duration: zoomDuration, zoom: 1 });
    onNodeSelect?.(node.id);
  }, [fitView, setCenter, zoomDuration, onNodeSelect]);

  useEffect(() => {
    if (!currentNode) return;
    requestAnimationFrame(() => {
      flyToNode(currentNode);
    });
  }, [currentNode?.id, flyToNode]);

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        show();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        show();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [show]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSearch();
        setOpen(false);
        inputRef.current?.blur();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        prev();
      }
    },
    [next, prev, clearSearch]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setOpen(true);
    },
    [setQuery]
  );

  const selectItem = useCallback(
    (node: any) => {
      setQuery(node.data?.name || node.id || '');
      setOpen(false);
      requestAnimationFrame(() => {
        flyToNode(node);
      });
    },
    [setQuery, flyToNode]
  );

  const showDropdown = open && focused && (results.length > 0 || (hasQuery && !isDebouncing));
  const shouldShow = isVisible || focused || open;

  return (
    <>
      <AnimatePresence>
        {!shouldShow && <FloatingShowButton onClick={show} />}
      </AnimatePresence>

      <motion.div
        style={styles.root}
        variants={searchVariants}
        initial="visible"
        animate={shouldShow ? 'visible' : 'hidden'}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div style={styles.wrapper(focused)}>
          <div style={styles.row}>
            <svg
              style={styles.searchIcon(focused)}
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>

            <input
              ref={inputRef}
              style={styles.input}
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setFocused(true);
                setOpen(true);
              }}
              onBlur={() => {
                setFocused(false);
                setTimeout(() => setOpen(false), 160);
              }}
              placeholder={isLoading ? 'Loading nodes...' : placeholder}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search nodes"
              aria-haspopup="listbox"
              aria-expanded={showDropdown}
              disabled={isLoading}
            />

            {isLoading && (
              <Loader2 size={14} style={styles.spinner} />
            )}

            {!isDebouncing && hasQuery && results.length > 0 && (
              <>
                <span style={styles.counter}>
                  {currentIndex + 1}/{results.length}
                </span>
                <button
                  style={styles.iconBtn}
                  onClick={prev}
                  aria-label="Previous match"
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    (e.target as HTMLElement).style.background = THEME.background.glass;
                    (e.target as HTMLElement).style.color = THEME.text.primary;
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    (e.target as HTMLElement).style.background = 'transparent';
                    (e.target as HTMLElement).style.color = THEME.text.muted;
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M8 8L5 5.5 8 3"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  style={styles.iconBtn}
                  onClick={next}
                  aria-label="Next match"
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    (e.target as HTMLElement).style.background = THEME.background.glass;
                    (e.target as HTMLElement).style.color = THEME.text.primary;
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    (e.target as HTMLElement).style.background = 'transparent';
                    (e.target as HTMLElement).style.color = THEME.text.muted;
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M4 3l3 2.5L4 8"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}

            <button
              style={styles.iconBtn}
              onClick={toggle}
              title={
                manuallyHidden
                  ? 'Show search (Ctrl+Shift+F)'
                  : 'Hide search (Ctrl+Shift+F)'
              }
              aria-label="Toggle search visibility"
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                (e.target as HTMLElement).style.background = THEME.background.glass;
                (e.target as HTMLElement).style.color = THEME.text.primary;
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                (e.target as HTMLElement).style.background = 'transparent';
                (e.target as HTMLElement).style.color = THEME.text.muted;
              }}
            >
              {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>

            {query ? (
              <button
                style={{ ...styles.iconBtn, color: THEME.text.dim }}
                onClick={() => {
                  clearSearch();
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  (e.target as HTMLElement).style.background = THEME.background.glass;
                  (e.target as HTMLElement).style.color = THEME.text.primary;
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  (e.target as HTMLElement).style.background = 'transparent';
                  (e.target as HTMLElement).style.color = THEME.text.dim;
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ) : (
              <span style={styles.kbd}>
                <span style={{ marginRight: 3 }}>⌘</span>K
              </span>
            )}
          </div>

          {showDropdown && (
            <div style={styles.dropdown} role="listbox">
              {isLoading && <LoadingState />}

              {error && !isLoading && (
                <ErrorState message={error} onRetry={refetch} />
              )}

              {!isLoading && !error && results.length > 0 && (
                <>
                  <div style={styles.dropHeader}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>✦</span>
                      {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                      <span style={{ color: THEME.text.dim }}>
                        / {totalNodes} nodes
                      </span>
                    </span>
                  </div>
                  <div style={styles.list}>
                    {results.map((node: any, i: number) => (
                      <div
                        key={node.id}
                        style={styles.item(i === currentIndex, accent)}
                        onMouseDown={() => selectItem(node)}
                        role="option"
                        aria-selected={i === currentIndex}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 12 12"
                          fill="none"
                          style={{
                            flexShrink: 0,
                            color: i === currentIndex ? accent : THEME.text.dim,
                          }}
                        >
                          <circle
                            cx="6"
                            cy="6"
                            r="4.5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            fill={i === currentIndex ? `${accent}30` : 'none'}
                          />
                        </svg>
                        <span style={styles.itemLabel}>
                          {node.data?.name || node.id}
                        </span>
                        <span style={styles.itemIdx}>#{i + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div style={styles.hints}>
                    <span style={styles.hintText}>↑↓ navigate</span>
                    <span style={{ ...styles.kbd, marginLeft: 0, padding: '2px 4px', minWidth: 'auto' }}>↵</span>
                    <span style={styles.hintText}>select</span>
                    <span style={{ ...styles.kbd, marginLeft: 4, padding: '2px 4px', minWidth: 'auto' }}>Esc</span>
                    <span style={styles.hintText}>close</span>
                  </div>
                </>
              )}

              {!isLoading && !error && hasQuery && !isDebouncing && results.length === 0 && (
                <EmptyResults query={query} />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}