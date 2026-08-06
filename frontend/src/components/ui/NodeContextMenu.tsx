import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Route,
  Users,
  Trash2,
  ChevronRight,
} from 'lucide-react';

import { useClampedPosition } from './useClampedPosition';
import { UserPickerSubmenu } from './UserPickerSubmenu';
import './NodeContextMenu.css';

const SUBMENU_NONE = null;
const SUBMENU_SHORTEST_PATH = 'shortest-path';
const SUBMENU_COMMON_FRIENDS = 'common-friends';

const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 28,
  mass: 0.8,
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const menuVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: -6,
    filter: 'blur(2px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { ...SPRING_CONFIG },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    filter: 'blur(1px)',
    transition: { duration: 0.12, ease: 'easeIn' as const},
  },
};

const itemHover = {
  rest: { x: 0 },
  hover: {
    x: 4,
    transition: { ...SPRING_CONFIG, stiffness: 400, damping: 25 },
  },
};

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  shortcut?: string;
  danger?: boolean;
  submenu?: string | null;
  onSelect?: () => void;
}

interface MenuGroup {
  id: string;
  items: MenuItem[];
}

interface NodeContextMenuProps {
  menuState: any;
  nodes?: any[];
  edges?: any[];
  onClose: () => void;
  onSuggestFriends?: (node: any) => void;
  onAddFriend?: (source: any, target: any) => void;
  onFindShortestPath?: (source: any, target: any) => void;
  onCommonFriends?: (nodeA: any, nodeB: any) => void;
  onDeleteNode?: (node: any) => void;
}

export function NodeContextMenu({
  menuState,
  nodes = [],
  onClose,
  onSuggestFriends,
  onFindShortestPath,
  onCommonFriends,
  onDeleteNode,
}: NodeContextMenuProps): React.ReactElement | null {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<any>({});
  const previousFocusRef = useRef<any>(null);

  const pos = useClampedPosition(menuState?.screenPos ?? null, menuRef as any);
  const [submenu, setSubmenu] = useState<string | null>(SUBMENU_NONE);
  const [submenuAnchor, setSubmenuAnchor] = useState<any>(null);
  const [highlighted, setHighlighted] = useState<number>(0);

  const node = menuState?.node ?? null;

  const getLabel = useCallback(
    (n: any) => n?.data?.label || n?.data?.name || n?.label || n?.id,
    []
  );

  const otherUsers = useMemo(() => {
    if (!node) return [];
    return nodes
      .filter((n: any) => n.id !== node.id)
      .map((n: any) => ({ id: n.id, label: getLabel(n) }))
      .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label)));
  }, [nodes, node, getLabel]);

  const closeMenu = useCallback(() => {
    setSubmenu(SUBMENU_NONE);
    setSubmenuAnchor(null);
    onClose?.();
  }, [onClose]);

  const handleSuggestFriend = useCallback(() => {
    if (!node) return;
    onSuggestFriends?.(node);
    closeMenu();
  }, [node, onSuggestFriends, closeMenu]);

  const handleDeleteNode = useCallback(() => {
    if (!node) return;
    onDeleteNode?.(node);
    closeMenu();
  }, [node, onDeleteNode, closeMenu]);

  const menuGroups = useMemo((): MenuGroup[] => {
    if (!node) return [];
    return [
      {
        id: 'connections',
        items: [
          {
            id: 'suggest-friend',
            label: 'Suggest Friend',
            icon: UserPlus,
            shortcut: '⌘F',
            onSelect: handleSuggestFriend,
          },
          {
            id: 'shortest-path',
            label: 'Find Shortest Path to…',
            icon: Route,
            shortcut: '⌘⇧P',
            submenu: SUBMENU_SHORTEST_PATH,
          },
          {
            id: 'common-friends',
            label: 'Common Friends with…',
            icon: Users,
            shortcut: '⌘⇧F',
            submenu: SUBMENU_COMMON_FRIENDS,
          },
        ],
      },
      {
        id: 'danger',
        items: [
          {
            id: 'delete-node',
            label: 'Delete Node',
            icon: Trash2,
            shortcut: '⌘⌫',
            danger: true,
            onSelect: handleDeleteNode,
          },
        ],
      },
    ];
  }, [node, handleSuggestFriend, handleDeleteNode]);

  const selectableItems = useMemo(
    () => menuGroups.flatMap((group: MenuGroup) => group.items),
    [menuGroups]
  );

  const handlePickShortestPathTarget = useCallback(
    (target: any) => {
      if (!node) return;
      onFindShortestPath?.(
        { id: node.id, label: getLabel(node) },
        { id: target.id, label: target.label }
      );
      setSubmenu(SUBMENU_NONE);
      setSubmenuAnchor(null);
      closeMenu();
    },
    [node, onFindShortestPath, getLabel, closeMenu]
  );

  const handlePickCommonFriendsTarget = useCallback(
    (target: any) => {
      if (!node) return;
      onCommonFriends?.(node, { id: target.id, label: target.label });
      setSubmenu(SUBMENU_NONE);
      setSubmenuAnchor(null);
      closeMenu();
    },
    [node, onCommonFriends, closeMenu]
  );

  useEffect(() => {
    if (menuState && !submenu) {
      previousFocusRef.current = document.activeElement;
      setHighlighted(0);
      requestAnimationFrame(() => menuRef.current?.focus());
    }
    return () => {
      if (!menuState && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [menuState, submenu]);

  const openSubmenu = useCallback((itemId: string, kind: string) => {
    const el = itemRefs.current[itemId];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSubmenuAnchor({ x: rect.right + 6, y: rect.top });
    setSubmenu(kind);
  }, []);

  const activateItem = useCallback(
    (item: MenuItem) => {
      if (!item) return;
      if (item.submenu) {
        openSubmenu(item.id, item.submenu);
        return;
      }
      item.onSelect?.();
    },
    [openSubmenu]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (submenu) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeMenu();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlighted((h: number) => (h + 1) % selectableItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlighted(
            (h: number) => (h - 1 + selectableItems.length) % selectableItems.length
          );
          break;
        case 'ArrowRight': {
          const item = selectableItems[highlighted];
          if (item?.submenu) {
            e.preventDefault();
            activateItem(item);
          }
          break;
        }
        case 'Enter':
        case ' ':
          e.preventDefault();
          activateItem(selectableItems[highlighted]);
          break;
      }
    },
    [submenu, selectableItems, highlighted, activateItem, closeMenu]
  );

  useEffect(() => {
    const item = selectableItems[highlighted];
    if (item && itemRefs.current[item.id]) {
      itemRefs.current[item.id].scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, selectableItems]);

  if (!menuState || !node) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="ncm-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseDown={closeMenu}
          onTouchStart={closeMenu}
          aria-hidden="true"
        />
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          ref={menuRef}
          className="ncm-menu"
          role="menu"
          aria-label={`Actions for ${getLabel(node)}`}
          aria-orientation="vertical"
          tabIndex={-1}
          style={{
            left: pos?.x ?? menuState.screenPos.x,
            top: pos?.y ?? menuState.screenPos.y,
          }}
          variants={menuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onKeyDown={handleKeyDown}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {menuGroups.map((group: MenuGroup, groupIndex: number) => (
            <React.Fragment key={group.id}>
              {groupIndex > 0 && (
                <div className="ncm-separator" role="separator" />
              )}
              <div className="ncm-group" role="group" aria-label={group.id}>
                {group.items.map((item: MenuItem) => {
                  const Icon = item.icon;
                  const selectableIndex = selectableItems.findIndex(
                    (i: MenuItem) => i.id === item.id
                  );
                  const isHighlighted = selectableIndex === highlighted;

                  return (
                    <motion.button
                      key={item.id}
                      ref={(el: any) => {
                        itemRefs.current[item.id] = el;
                      }}
                      type="button"
                      role="menuitem"
                      className={[
                        'ncm-item',
                        item.danger ? 'ncm-item--danger' : '',
                        isHighlighted ? 'ncm-item--highlighted' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={`${item.label}${item.shortcut ? `, ${item.shortcut}` : ''}`}
                      aria-haspopup={item.submenu ? 'menu' : undefined}
                      aria-expanded={
                        item.submenu ? submenu === item.submenu : undefined
                      }
                      variants={itemHover}
                      initial="rest"
                      whileHover="hover"
                      onMouseEnter={() => setHighlighted(selectableIndex)}
                      onClick={() => activateItem(item)}
                    >
                      <span className="ncm-item-icon" aria-hidden="true">
                        <Icon size={16} strokeWidth={1.6} />
                      </span>
                      <span className="ncm-item-label">{item.label}</span>
                      {item.shortcut && (
                        <span className="ncm-item-shortcut" aria-hidden="true">
                          {item.shortcut}
                        </span>
                      )}
                      {item.submenu && (
                        <span className="ncm-item-chevron" aria-hidden="true">
                          <ChevronRight size={14} strokeWidth={1.5} />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </motion.div>
      </AnimatePresence>

      {submenu === SUBMENU_SHORTEST_PATH && (
        <UserPickerSubmenu
          anchor={submenuAnchor}
          users={otherUsers}
          ariaLabel="Find shortest path to"
          onSelect={handlePickShortestPathTarget}
          onClose={() => {
            setSubmenu(SUBMENU_NONE);
            setSubmenuAnchor(null);
          }}
        />
      )}
      {submenu === SUBMENU_COMMON_FRIENDS && (
        <UserPickerSubmenu
          anchor={submenuAnchor}
          users={otherUsers}
          ariaLabel="Common friends with"
          onSelect={handlePickCommonFriendsTarget}
          onClose={() => {
            setSubmenu(SUBMENU_NONE);
            setSubmenuAnchor(null);
          }}
        />
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {menuState ? 'Context menu opened' : 'Context menu closed'}
      </div>
    </>
  );
}