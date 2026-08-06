import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import type { ReactElement } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

import { LuComponent } from "react-icons/lu";
import { SiReasonstudios, SiGraphql } from "react-icons/si";
import { IoMenu } from "react-icons/io5";
import { RiOrganizationChart } from "react-icons/ri";
import { PiTerminalFill, PiPathFill } from "react-icons/pi";
import { FaBookOpen } from "react-icons/fa6";
import type { IconType } from "react-icons";

import "./FloatingSidebar.css";

/* --------------------------------------------------------------------------
   Icon lookup
   -------------------------------------------------------------------------- */
const ICON_MAP: Record<string, IconType> = {
  dashboard: LuComponent,
  "graph-editor": SiGraphql,
  communities: RiOrganizationChart,
  "path-finder": PiPathFill,
  terminal: PiTerminalFill,
  documentation: FaBookOpen,
  "graph-studio": SiReasonstudios,
};

const getIconById = (id: string): IconType => ICON_MAP[id] || LuComponent;

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */
interface SidebarBadge {
  text: string;
  color: string;
}

interface SidebarItem {
  id: string;
  label: string;
  desc?: string;
  path: string;
  badge?: SidebarBadge;
}

interface FloatingSidebarProps {
  sidebarItems: SidebarItem[];
  onNavigate?: (itemId: string) => void;
}

interface NavItemProps {
  item: SidebarItem;
  isActive: boolean;
  index: number;
  onNavigate: (id: string) => void;
}

interface SidebarContentProps {
  activeItem: string;
  onNavigate: (id: string) => void;
  navItems: SidebarItem[];
}

/* --------------------------------------------------------------------------
   NavItem — memoized so a rerender of the sidebar (e.g. from the hover
   timers) doesn't re-render every row, only the ones whose props changed.
   -------------------------------------------------------------------------- */
const NavItem = memo(function NavItem({ item, isActive, index, onNavigate }: NavItemProps): ReactElement {
  const IconComponent = getIconById(item.id);

  const handleClick = useCallback(() => onNavigate(item.id), [onNavigate, item.id]);

  return (
    <motion.button
      type="button"
      className={`fsb-nav-item${isActive ? " fsb-nav-item--active" : ""}`}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 24, delay: index * 0.02 }}
    >
      <span className={`fsb-nav-icon${isActive ? " fsb-nav-icon--active" : ""}`}>
        <IconComponent size={18} aria-hidden="true" />
        {isActive && <span className="fsb-active-dot" aria-hidden="true" />}
      </span>
      <span className="fsb-nav-meta">
        <span className={`fsb-nav-label${isActive ? " fsb-nav-label--active" : ""}`}>{item.label}</span>
        <span className="fsb-nav-desc">{item.desc || `Navigate to ${item.label}`}</span>
      </span>
      {item.badge && (
        <span className={`fsb-badge fsb-badge--${item.badge.color}`}>{item.badge.text}</span>
      )}
      {isActive && <span className="fsb-active-accent" aria-hidden="true" />}
    </motion.button>
  );
});

/* --------------------------------------------------------------------------
   SidebarContent
   -------------------------------------------------------------------------- */
const SidebarContent = memo(function SidebarContent({
  activeItem,
  onNavigate,
  navItems,
}: SidebarContentProps): ReactElement {
  return (
    <div className="fsb-sidebar-inner">
      <div className="fsb-header">
        <div className="fsb-logo">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--fsb-primary)"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="fsb-logo-text">
            Graph<span className="fsb-logo-accent">lytics</span>
          </span>
        </div>
        <span className="fsb-version">v2.0</span>
      </div>

      <nav className="fsb-nav-list" aria-label="Primary">
        {navItems.map((item, i) => (
          <NavItem key={item.id} item={item} isActive={activeItem === item.id} index={i} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
});

/* --------------------------------------------------------------------------
   FloatingSidebar
   -------------------------------------------------------------------------- */
const SIDEBAR_PANEL_ID = "floating-sidebar-panel";

export default function FloatingSidebar({
  sidebarItems,
  onNavigate: propOnNavigate,
}: FloatingSidebarProps): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [triggerTop, setTriggerTop] = useState<string>("50%");

  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const edgeTriggerRef = useRef<HTMLDivElement | null>(null);

  const items = sidebarItems || [];

  const activeItem = useMemo<string>(() => {
    const match = items.find((item) => item.path === location.pathname);
    return match ? match.id : "graph-editor";
  }, [items, location.pathname]);

  const getPathById = useCallback(
    (id: string): string => {
      const item = items.find((entry) => entry.id === id);
      return item ? item.path : "/graph-editor";
    },
    [items]
  );

  const handleNavigate = useCallback(
    (itemId: string): void => {
      if (propOnNavigate) {
        propOnNavigate(itemId);
      } else {
        navigate(getPathById(itemId));
      }
      if (isMobile) setIsOpen(false);
    },
    [propOnNavigate, navigate, getPathById, isMobile]
  );

  // Track viewport size to switch between the desktop hover rail and the
  // mobile drawer + FAB pattern.
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Remember where the sidebar was vertically centered so the collapsed
  // edge trigger reappears in the same spot it was last opened from.
  useEffect(() => {
    if (!isOpen && sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      setTriggerTop(`${centerY}px`);
    }
  }, [isOpen]);

  // The trigger's vertical position is the one value in this component that
  // has to be computed at runtime from a DOM measurement. Rather than pass
  // it through a JSX `style` prop, write it straight to the element as a
  // CSS custom property — the element stays styled entirely by
  // FloatingSidebar.css (see `.fsb-edge-trigger { top: var(--fsb-trigger-top) }`).
  useEffect(() => {
    edgeTriggerRef.current?.style.setProperty("--fsb-trigger-top", isOpen ? "50%" : triggerTop);
  }, [isOpen, triggerTop]);

  // Keyboard shortcut: Cmd/Ctrl+B toggles the sidebar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleTriggerEnter = useCallback(() => {
    if (isMobile) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    openTimerRef.current = setTimeout(() => setIsOpen(true), 45);
  }, [isMobile]);

  const handleSidebarLeave = useCallback(() => {
    if (isMobile) return;
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 150);
  }, [isMobile]);

  const handleSidebarEnter = useCallback(() => {
    if (isMobile) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, [isMobile]);

  // Guarantee both timers are cleared on unmount, regardless of which
  // ones happen to be pending.
  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleDragEnd = useCallback((_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo): void => {
    if (info.offset.x < -60) setIsOpen(false);
  }, []);

  const handleFabOpen = useCallback(() => setIsOpen(true), []);
  const handleBackdropClose = useCallback(() => setIsOpen(false), []);

  const springConfig = { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 };

  const sidebarVariants = {
    hidden: { x: -30, opacity: 0, scale: 0.95, pointerEvents: "none" as const },
    visible: { x: 0, opacity: 1, scale: 1, pointerEvents: "auto" as const },
  };

  return (
    <div className="fsb-root">
      {!isMobile && (
        <div
          ref={edgeTriggerRef}
          className="fsb-edge-trigger"
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={handleSidebarLeave}
          role="button"
          tabIndex={0}
          aria-label="Open sidebar"
          aria-expanded={isOpen}
          aria-controls={SIDEBAR_PANEL_ID}
          onFocus={handleTriggerEnter}
          onBlur={handleSidebarLeave}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen((v) => !v);
            }
          }}
        >
          <motion.div
            className="fsb-edge-pill"
            animate={{ scaleY: isOpen ? 0.6 : 1, opacity: isOpen ? 0 : 0.8 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />
        </div>
      )}

      {isMobile && !isOpen && (
        <motion.button
          type="button"
          className="fsb-fab"
          onClick={handleFabOpen}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open sidebar"
          aria-expanded={isOpen}
          aria-controls={SIDEBAR_PANEL_ID}
        >
          <IoMenu aria-hidden="true" />
        </motion.button>
      )}

      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            className="fsb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && !isMobile && (
          <div className="fsb-sidebar-anchor">
            <motion.aside
              id={SIDEBAR_PANEL_ID}
              ref={sidebarRef}
              role="navigation"
              aria-label="Main sidebar"
              className="fsb-sidebar"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={springConfig}
              onMouseEnter={handleSidebarEnter}
              onMouseLeave={handleSidebarLeave}
            >
              <SidebarContent activeItem={activeItem} onNavigate={handleNavigate} navItems={items} />
            </motion.aside>
          </div>
        )}
        {isOpen && isMobile && (
          <motion.aside
            id={SIDEBAR_PANEL_ID}
            ref={sidebarRef}
            role="navigation"
            aria-label="Main sidebar"
            className="fsb-sidebar fsb-sidebar--mobile"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={springConfig}
            drag="x"
            dragConstraints={{ left: -200, right: 0 }}
            dragElastic={{ left: 0.3, right: 0 }}
            onDragEnd={handleDragEnd}
          >
            <SidebarContent activeItem={activeItem} onNavigate={handleNavigate} navItems={items} />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}