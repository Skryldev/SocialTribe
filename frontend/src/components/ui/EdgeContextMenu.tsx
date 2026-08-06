import React, { useEffect, useRef, useState } from 'react';
import { Trash2, X, Users, Link2, Minus } from 'lucide-react';

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap');

@keyframes ecm-slide-in {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes ecm-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.ecm-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  width: 100%;
  background: none;
  border: none;
  text-align: left;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.ecm-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: currentColor;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.ecm-item:hover::before {
  opacity: 1;
}

.ecm-delete {
  color: #f87171;
}

.ecm-delete:hover {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.12), transparent);
  color: #fca5a5;
}

.ecm-cancel {
  color: #94a3b8;
}

.ecm-cancel:hover {
  background: linear-gradient(90deg, rgba(100, 116, 139, 0.1), transparent);
  color: #cbd5e1;
}

.ecm-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3), transparent);
  margin: 6px 0;
}

.ecm-warning-badge {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 20px;
  color: #f87171;
  font-weight: 600;
  letter-spacing: 0.03em;
}
`;

let stylesInjected = false;
function injectStyles(): void {
  if (stylesInjected) return;
  const tag = document.createElement('style');
  tag.textContent = STYLES;
  document.head.appendChild(tag);
  stylesInjected = true;
}

const MenuPattern = () => (
  <svg style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.035,
    pointerEvents: 'none',
    borderRadius: '16px',
    overflow: 'hidden',
  }}>
    <defs>
      <pattern id="menuGrid" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.6" fill="#3b82f6" />
        <circle cx="8" cy="8" r="0.4" fill="#8b5cf6" />
      </pattern>
      <pattern id="menuDiagonal" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1="0" y1="0" x2="0" y2="24" stroke="#3b82f6" strokeWidth="0.4" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#menuGrid)" />
    <rect width="100%" height="100%" fill="url(#menuDiagonal)" opacity="0.6" />
  </svg>
);

interface EdgeContextMenuProps {
  screenPos: { x: number; y: number };
  edgeId: string;
  edgeType?: string;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
}

export function EdgeContextMenu({ screenPos, edgeId, edgeType = 'friendship', onDelete, onClose }: EdgeContextMenuProps): React.ReactElement {
  injectStyles();

  const menuRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  
  const MENU_W = 240;
  const MENU_H = 112;
  const safeX = clamp(screenPos.x, 12, window.innerWidth - MENU_W - 12);
  const safeY = clamp(screenPos.y, 12, window.innerHeight - MENU_H - 12);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  const handleDelete = (): void => {
    console.log('🖱️ [EdgeContextMenu] Delete button clicked for edge:', edgeId);
    onDelete(edgeId);
    onClose();
  };

  const getEdgeTypeInfo = (): any => {
    switch (edgeType) {
      case 'weightedEdge':
        return { icon: <Minus size={10} />, label: 'Weighted Connection', color: '#f59e0b' };
      case 'friendship':
        return { icon: <Users size={10} />, label: 'Friendship', color: '#10b981' };
      default:
        return { icon: <Link2 size={10} />, label: 'Connection', color: '#64748b' };
    }
  };

  const edgeInfo = getEdgeTypeInfo();

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Edge options"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        left: safeX,
        top: safeY,
        width: MENU_W,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: isHovered ? '1.5px solid rgba(59, 130, 246, 0.35)' : '1.5px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 18,
        boxShadow: isHovered
          ? '0 25px 40px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(59, 130, 246, 0.15), 0 0 20px rgba(59, 130, 246, 0.08)'
          : '0 20px 35px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(59, 130, 246, 0.1)',
        padding: '6px 0',
        fontFamily: "'Inter', sans-serif",
        animation: 'ecm-slide-in 0.18s cubic-bezier(0.34, 1.2, 0.64, 1) both',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
      }}
    >
      <MenuPattern />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 18px 4px',
        borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
        marginBottom: 4,
      }}>
        <div style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          background: `${edgeInfo.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: edgeInfo.color,
        }}>
          {edgeInfo.icon}
        </div>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#64748b',
        }}>
          {edgeInfo.label}
        </span>
      </div>

      <button
        className="ecm-item ecm-delete"
        role="menuitem"
        onClick={handleDelete}
        aria-label="Delete this connection"
      >
        <Trash2 size={15} />
        <span>Delete Connection</span>
      </button>

      <div className="ecm-divider" />

      <button
        className="ecm-item ecm-cancel"
        role="menuitem"
        onClick={onClose}
      >
        <X size={15} />
        <span>Cancel</span>
      </button>
    </div>
  );
}

export default EdgeContextMenu;