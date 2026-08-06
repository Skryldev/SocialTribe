import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { createPortal }   from "react-dom";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import "./CustomUserNode.css";

const ROLE_CONFIG: any = {
  influencer:       { label: "Influencer",       avatarFrom: "#e63946", avatarTo: "#ff6b75" },
  bridge:           { label: "Bridge",            avatarFrom: "#ff8c42", avatarTo: "#ffb380" },
  community_leader: { label: "Community Leader",  avatarFrom: "#7b2cbf", avatarTo: "#c77dff" },
  recommended:      { label: "Recommended",       avatarFrom: "#27ae60", avatarTo: "#56e89b" },
  normal:           { label: "Normal",            avatarFrom: "#1a72ff", avatarTo: "#80b8ff" },
  isolated:         { label: "Isolated",          avatarFrom: "#495057", avatarTo: "#868e96" },
};

const DEFAULT_ROLE = "normal";

function getRoleConfig(role: string): any {
  return ROLE_CONFIG[role] ?? ROLE_CONFIG[DEFAULT_ROLE];
}

function avatarGradient(role: string): string {
  const { avatarFrom, avatarTo } = getRoleConfig(role);
  return `linear-gradient(135deg, ${avatarFrom}, ${avatarTo})`;
}

const SIM_OVERLAY: any = {
  ignorant: {
    filter:     'saturate(0.4) brightness(0.7)',
    borderColor: null,
    glowColor:   null,
  },
  spreader: {
    filter:      null,
    borderColor: 'rgba(230, 57, 70, 0.85)',
    glowColor:   'rgba(230, 57, 70, 0.55)',
  },
  informed: {
    filter:      null,
    borderColor: 'rgba(74, 222, 128, 0.7)',
    glowColor:   'rgba(74, 222, 128, 0.35)',
  },
  stifler: {
    filter:      'sepia(0.3) saturate(0.75)',
    borderColor: 'rgba(251, 146, 60, 0.6)',
    glowColor:   'rgba(251, 146, 60, 0.28)',
  },
};

function simOverlayStyle(status: string): any {
  if (!status || status === 'ignorant') return {};
  const o = SIM_OVERLAY[status] ?? {};
  const style: any = {};
  if (o.filter)      style.filter = o.filter;
  if (o.borderColor) style.border = `1.5px solid ${o.borderColor}`;
  if (o.glowColor) {
    style.boxShadow = `
      0 0 0 2px ${o.glowColor},
      0 6px 14px rgba(0,0,0,0.65),
      0 0 12px ${o.glowColor} inset
    `;
  }
  return style;
}

const IconUsers = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconSigma = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 7V4H6l7 8-7 8h12v-3"/>
  </svg>
);

const IconEdit = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconStar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

interface SpreaderPulseProps {
  nodeId: string;
  isExiting: boolean;
}

function SpreaderPulse({ nodeId, isExiting }: SpreaderPulseProps): React.ReactElement | null {
  const { getNode } = useReactFlow();
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const requestRef = useRef<any>(null);

  const updatePosition = useCallback(() => {
    const node = getNode(nodeId);
    if (node) {
      const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
      if (nodeElement) {
        const rect = nodeElement.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        });
      }
    }
    requestRef.current = requestAnimationFrame(updatePosition);
  }, [nodeId, getNode]);

  useEffect(() => {
    updatePosition();
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [updatePosition]);

  if (position.width === 0) return null;

  const cx = position.x;
  const cy = position.y;
  const r = position.width / 2;
  const maxR = Math.max(position.width, position.height) / 2;

  const exitAnimation = isExiting ? {
    opacity: [1, 0.5, 0],
    scale: [1, 1.1, 1.2],
  } : {};

  return createPortal(
    <>
      <motion.div
        style={{
          position: 'fixed',
          left: cx - maxR * 1.2,
          top: cy - maxR * 1.2,
          width: maxR * 2.4,
          height: maxR * 2.4,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,57,70,0.08) 0%, rgba(230,57,70,0) 70%)',
          pointerEvents: 'none',
          zIndex: 8798,
        }}
        animate={isExiting ? exitAnimation : {
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.1, 0.5],
        }}
        transition={isExiting ? {
          duration: 1.2,
          ease: "easeOut",
        } : {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        style={{
          position: 'fixed',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: '50%',
          border: '1.5px solid rgba(230, 57, 70, 0.5)',
          pointerEvents: 'none',
          zIndex: 8799,
        }}
        animate={isExiting ? exitAnimation : {
          scale: [0.85, 1.35, 1.6],
          opacity: [0, 0.6, 0]
        }}
        transition={isExiting ? {
          duration: 1,
          ease: "easeOut",
        } : {
          duration: 1.4,
          delay: 0,
          repeat: Infinity,
          ease: [0.25, 0.1, 0.25, 1],
          repeatDelay: 0.1,
        }}
      />

      <motion.div
        style={{
          position: 'fixed',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: '50%',
          border: '2px solid rgba(230, 57, 70, 0.7)',
          pointerEvents: 'none',
          zIndex: 8799,
        }}
        animate={isExiting ? exitAnimation : {
          scale: [0.85, 1.25, 1.5],
          opacity: [0, 0.5, 0]
        }}
        transition={isExiting ? {
          duration: 1,
          ease: "easeOut",
        } : {
          duration: 1.4,
          delay: 0.35,
          repeat: Infinity,
          ease: [0.25, 0.1, 0.25, 1],
          repeatDelay: 0.1,
        }}
      />

      <motion.div
        style={{
          position: 'fixed',
          left: cx - 5,
          top: cy - 5,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,57,70,0.9), rgba(230,57,70,0.2))',
          pointerEvents: 'none',
          zIndex: 8800,
        }}
        animate={isExiting ? {
          scale: [1, 1.5],
          opacity: [0.7, 0],
        } : {
          scale: [1, 2.2, 3.5],
          opacity: [0.7, 0.3, 0],
        }}
        transition={isExiting ? {
          duration: 0.8,
          ease: "circOut",
        } : {
          duration: 0.9,
          repeat: Infinity,
          ease: "circOut",
          repeatDelay: 0.25,
        }}
      />

      <motion.div
        style={{
          position: 'fixed',
          left: cx - r * 0.2,
          top: cy - r * 0.2,
          width: r * 0.4,
          height: r * 0.4,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(230,57,70,0.6))',
          filter: 'blur(2px)',
          pointerEvents: 'none',
          zIndex: 8801,
        }}
        animate={isExiting ? {
          scale: [1, 1.3],
          opacity: [0.8, 0],
        } : {
          scale: [1, 1.4, 1],
          opacity: [0.8, 0.2, 0.8],
        }}
        transition={isExiting ? {
          duration: 0.8,
          ease: "easeOut",
        } : {
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </>,
    document.body
  );
}

interface DayBadgeProps {
  day: number;
  status: string;
}

function DayBadge({ day, status }: DayBadgeProps): React.ReactElement | null {
  const COLOR_MAP: any = {
    spreader: { bg: 'rgba(230,57,70,0.90)',  text: '#ffe4e6' },
    informed: { bg: 'rgba(34,197,94,0.85)',  text: '#f0fdf4' },
    stifler:  { bg: 'rgba(251,146,60,0.85)', text: '#fff7ed' },
  };
  const c = COLOR_MAP[status];
  if (!c || day == null) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 25,
        delay: 0.1 
      }}
      style={{
        position:   'absolute',
        top:        -6,
        right:      -6,
        width:      14,
        height:     14,
        borderRadius: '50%',
        background: c.bg,
        border:     '1px solid rgba(0,0,0,0.5)',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize:   7,
        color:      c.text,
        fontFamily: "'DM Mono', monospace",
        fontWeight: 700,
        zIndex:     10,
        boxShadow:  '0 1px 4px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
      }}
    >
      {day}
    </motion.div>
  );
}

interface SocialUserNodeProps {
  data: any;
  selected: boolean;
  id: string;
}

function SocialUserNodeComponent({ data, selected, id: nodeId }: SocialUserNodeProps): React.ReactElement {
  const {
    id = nodeId,
    name:            initialName = "Unknown",
    role                        = DEFAULT_ROLE,
    friendCount                 = 0,
    avgDistance,
    centrality,
    onUserUpdate,
    simulation,
    showDayBadges = true,
  } = data;

  const [name,        setName]        = useState<string>(initialName);
  const [editing,     setEditing]     = useState<boolean>(false);
  const [hovered,     setHovered]     = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  
  const [showPulse, setShowPulse] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const prevStatusRef = useRef<any>(null);

  const safeRole      = ROLE_CONFIG[role] ? role : DEFAULT_ROLE;
  const centralityPct = centrality != null ? Math.max(0, Math.min(1, centrality)) : null;

  const simStatus     = simulation?.status ?? null;
  const simDay        = simulation?.day    ?? null;
  const isSpreader    = simStatus === 'spreader';

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    
    if (isSpreader && !prevStatus?.spreader) {
      setShowPulse(true);
      setIsExiting(false);
    }
    
    if (!isSpreader && prevStatus?.spreader && showPulse && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShowPulse(false);
        setIsExiting(false);
      }, 1200);
      
      return () => clearTimeout(timer);
    }
    
    prevStatusRef.current = { spreader: isSpreader };
  }, [isSpreader, showPulse, isExiting]);

  const handleDoubleClick = useCallback(() => setEditing(true), []);
  const handleNameChange  = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);

  const handleNameBlur = useCallback(() => {
    setEditing(false);
    onUserUpdate?.(id, { name });
  }, [id, name, onUserUpdate]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
  }, []);

  const handleMouseEnter = useCallback(() => { setHovered(true);  setShowTooltip(true);  }, []);
  const handleMouseLeave = useCallback(() => { setHovered(false); setShowTooltip(false); }, []);

  const cls = ["sun-node", selected && "selected", hovered && "hovered", isSpreader && "spreader-active"]
    .filter(Boolean)
    .join(" ");

  const simStyle = simStatus ? simOverlayStyle(simStatus) : {};

  return (
    <>
      <AnimatePresence>
        {showPulse && <SpreaderPulse key="pulse" nodeId={id} isExiting={isExiting} />}
      </AnimatePresence>

      <div
        data-id={id}
        className={cls}
        data-role={safeRole}
        data-sim-status={simStatus ?? 'none'}
        style={simStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Handle id="top-src"    type="source" position={Position.Top}    isConnectable={true} />
        <Handle id="top-tgt"    type="target" position={Position.Top}    isConnectable={true} />
        <Handle id="bottom-src" type="source" position={Position.Bottom} isConnectable={true} />
        <Handle id="bottom-tgt" type="target" position={Position.Bottom} isConnectable={true} />
        <Handle id="left-src"   type="source" position={Position.Left}   isConnectable={true} />
        <Handle id="left-tgt"   type="target" position={Position.Left}   isConnectable={true} />
        <Handle id="right-src"  type="source" position={Position.Right}  isConnectable={true} />
        <Handle id="right-tgt"  type="target" position={Position.Right}  isConnectable={true} />

        <AnimatePresence>
          {showDayBadges && simStatus && simStatus !== 'ignorant' && (
            <DayBadge day={simDay} status={simStatus} />
          )}
        </AnimatePresence>

        <div
          className="sun-avatar"
          style={{ background: avatarGradient(safeRole) }}
          title={getRoleConfig(safeRole).label}
        >
          <span className="sun-avatar-letter">{(name || "?")[0]}</span>
          <span className="sun-online-dot" title="Online" />
        </div>

        <div className="sun-info">
          <div className="sun-name-row">
            {editing ? (
              <input
                className="sun-name-input nodrag"
                value={name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                autoFocus
              />
            ) : (
              <>
                <span
                  className="sun-name"
                  onDoubleClick={handleDoubleClick}
                  title="Double-click to edit"
                >
                  {name}
                </span>
                <span
                  className="sun-edit-hint"
                  onClick={handleDoubleClick}
                  title="Edit name"
                >
                  <IconEdit />
                </span>
              </>
            )}
          </div>

          <div className="sun-id">ID: {id}</div>

          <div className="sun-badges">
            <div className="sun-friends-badge">
              <IconUsers />
              {friendCount.toLocaleString()} friends
            </div>

            {avgDistance != null && (
              <div className="sun-metric-chip">
                <IconSigma />
                avg dist&nbsp;
                <span className="metric-value">{avgDistance.toFixed(2)}</span>
              </div>
            )}

            {centralityPct != null && (
              <div className="sun-metric-chip">
                <IconStar />
                centrality&nbsp;
                <span className="metric-value">{(centralityPct * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>

          {centralityPct != null && (
            <div className="sun-centrality-bar-wrap">
              <span className="sun-centrality-label">NETWORK REACH</span>
              <div className="sun-centrality-track">
                <motion.div
                  className="sun-centrality-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${centralityPct * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {simStatus && simStatus !== 'ignorant' && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5, transition: { duration: 0.3 } }}
              style={{
                marginTop:  2,
                fontSize:   6,
                letterSpacing: '0.4px',
                fontFamily: "'DM Mono', monospace",
                color: simStatus === 'spreader' ? '#fca5a5'
                     : simStatus === 'informed' ? '#86efac'
                     : '#fdba74',
              }}
            >
              {simStatus.toUpperCase()}
              {simDay != null ? ` · DAY ${simDay}` : ''}
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {showTooltip && !editing && (
            <motion.div
              className="sun-tooltip"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="sun-tooltip-row">
                <span className="sun-tooltip-key">Role</span>
                <span className="sun-tooltip-val">{getRoleConfig(safeRole).label}</span>
              </div>
              <div className="sun-tooltip-row">
                <span className="sun-tooltip-key">Friends</span>
                <span className="sun-tooltip-val">{friendCount.toLocaleString()}</span>
              </div>
              {avgDistance != null && (
                <div className="sun-tooltip-row">
                  <span className="sun-tooltip-key">Avg Distance</span>
                  <span className="sun-tooltip-val">{avgDistance.toFixed(3)}</span>
                </div>
              )}
              {centrality != null && (
                <div className="sun-tooltip-row">
                  <span className="sun-tooltip-key">Centrality</span>
                  <span className="sun-tooltip-val">{(centrality * 100).toFixed(1)}%</span>
                </div>
              )}
              {simStatus && (
                <div className="sun-tooltip-row">
                  <span className="sun-tooltip-key">Sim Status</span>
                  <span className="sun-tooltip-val">{simStatus}</span>
                </div>
              )}
              <div className="sun-tooltip-row">
                <span className="sun-tooltip-key">Right-click</span>
                <span className="sun-tooltip-val">actions ›</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export const SocialUserNode = React.memo(SocialUserNodeComponent);