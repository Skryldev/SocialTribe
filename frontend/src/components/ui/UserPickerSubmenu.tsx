import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import './UserPickerSubmenu.css';

const VIEWPORT_PADDING = 12;
const SUBMENU_WIDTH = 280;
const ITEM_HEIGHT = 40;
const SEARCH_HEIGHT = 48;
const VISIBLE_ITEMS_BEFORE_SCROLL = 8;

const submenuVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: -6,
    filter: 'blur(1px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 28,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    filter: 'blur(0.5px)',
    transition: { duration: 0.12, ease: 'easeIn' as const},
  },
};

interface Position {
  x: number;
  y: number;
}

interface User {
  id: string;
  label?: string;
  [key: string]: any;
}

interface UserPickerSubmenuProps {
  anchor: Position | null;
  users: User[];
  onSelect?: (user: User) => void;
  onClose?: () => void;
  ariaLabel?: string;
}

function calculateOptimalPosition(anchor: Position, submenuWidth: number, submenuHeight: number): Position {
  if (!anchor) return { x: 0, y: 0 };

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let x = anchor.x + 8;
  let y = anchor.y;

  if (x + submenuWidth > viewportW - VIEWPORT_PADDING) {
    x = anchor.x - submenuWidth - 8;
  }

  if (x < VIEWPORT_PADDING) {
    x = VIEWPORT_PADDING;
  }
  if (x + submenuWidth > viewportW - VIEWPORT_PADDING) {
    x = viewportW - submenuWidth - VIEWPORT_PADDING;
  }

  const maxY = viewportH - submenuHeight - VIEWPORT_PADDING;
  if (y > maxY) {
    y = maxY;
  }
  if (y < VIEWPORT_PADDING) {
    y = VIEWPORT_PADDING;
  }

  return { x, y };
}

export function UserPickerSubmenu({
  anchor,
  users,
  onSelect,
  onClose,
  ariaLabel = 'Select a user',
}: UserPickerSubmenuProps): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<any>({});
  const previousFocusRef = useRef<any>(null);

  const [query, setQuery] = useState<string>('');
  const [highlighted, setHighlighted] = useState<number>(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: User) =>
      (u.label || u.id || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  const position = useMemo(() => {
    if (!anchor) return null;

    const itemCount = Math.min(filtered.length, VISIBLE_ITEMS_BEFORE_SCROLL);
    const estimatedHeight = SEARCH_HEIGHT + itemCount * ITEM_HEIGHT + 16;

    return calculateOptimalPosition(anchor, SUBMENU_WIDTH, estimatedHeight);
  }, [anchor, filtered.length]);

  useEffect(() => {
    if (!anchor) return;

    previousFocusRef.current = document.activeElement;
    setQuery('');
    setHighlighted(0);

    const raf = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [anchor]);

  useEffect(() => {
    if (highlighted >= filtered.length) {
      setHighlighted(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, highlighted]);

  useEffect(() => {
    const el = itemRefs.current[filtered[highlighted]?.id];
    if (el && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect();
      const itemRect = el.getBoundingClientRect();

      if (itemRect.bottom > listRect.bottom - 8) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (itemRect.top < listRect.top + 8) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlighted, filtered]);

  const handleSelect = useCallback(
    (user: User) => {
      onSelect?.(user);
      onClose?.();
    },
    [onSelect, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (filtered.length === 0) break;
          setHighlighted((h: number) => (h + 1) % filtered.length);
          if (document.activeElement === searchInputRef.current) {
            searchInputRef.current?.focus();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (filtered.length === 0) break;
          setHighlighted((h: number) =>
            h <= 0 ? filtered.length - 1 : h - 1
          );
          if (document.activeElement === searchInputRef.current) {
            searchInputRef.current?.focus();
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (filtered.length > 0 && filtered[highlighted]) {
            handleSelect(filtered[highlighted]);
          }
          break;

        case 'Tab':
          break;

        default:
          break;
      }
    },
    [filtered, highlighted, handleSelect, onClose]
  );

  const handleBackdropMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        e.preventDefault();
        onClose?.();
      }
    },
    [onClose]
  );

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setHighlighted(0);
    searchInputRef.current?.focus();
  }, []);

  if (!anchor || !position) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        className="ups-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        onMouseDown={handleBackdropMouseDown}
        onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      >
        <motion.div
          ref={containerRef}
          className="ups-submenu"
          role="menu"
          aria-label={ariaLabel}
          style={{
            left: position.x,
            top: position.y,
          }}
          variants={submenuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onKeyDown={handleKeyDown}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className="ups-search-wrapper">
            <Search size={14} className="ups-search-icon" strokeWidth={1.8} />
            <input
              ref={searchInputRef}
              type="text"
              className="ups-search-input"
              placeholder="Search users…"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              aria-label={`${ariaLabel} search`}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                className="ups-search-clear"
                onClick={handleClearSearch}
                aria-label="Clear search"
                tabIndex={-1}
              >
                <X size={13} strokeWidth={1.8} />
              </button>
            )}
          </div>

          <div ref={listRef} className="ups-list">
            {filtered.length === 0 ? (
              <div className="ups-empty">
                <span className="ups-empty-text">No matching users</span>
                {query && (
                  <span className="ups-empty-hint">
                    Try a different search term
                  </span>
                )}
              </div>
            ) : (
              filtered.map((user: User, index: number) => {
                const isHighlighted = index === highlighted;
                const displayName = user.label || user.id;

                return (
                  <motion.button
                    key={user.id}
                    ref={(el: any) => {
                      itemRefs.current[user.id] = el;
                    }}
                    type="button"
                    role="menuitem"
                    className={`ups-item ${isHighlighted ? 'ups-item--highlighted' : ''}`}
                    aria-selected={isHighlighted}
                    onMouseEnter={() => setHighlighted(index)}
                    onMouseDown={(e: React.MouseEvent) => {
                      e.preventDefault();
                    }}
                    onClick={() => handleSelect(user)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.02,
                      duration: 0.15,
                      ease: 'easeOut',
                    }}
                  >
                    <div className="ups-item-avatar">
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    <span className="ups-item-name">{displayName}</span>

                    {isHighlighted && (
                      <motion.div
                        className="ups-item-indicator"
                        layoutId="highlight-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}