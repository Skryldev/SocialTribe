import React, { useEffect, useRef, useMemo, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  Trash2,
  AlertTriangle,
  TrendingDown,
  Link2,
  Network,
  BarChart3,
  ArrowRight,
  Loader2,
  LucideIcon,
} from 'lucide-react';
import { getFullNetwork } from '../dashboard/getNodeApi';
import './NodeContextMenuModals.css';

// ============================================================
// Types
// ============================================================
interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    id: string;
    name: string;
    nodeType: string;
    role: string;
    friendCount: number;
    avgDistance: number;
    centrality: number;
  };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data: {
    Weight: number;
    createdAt: string;
    id: string;
    targetId: string;
  };
}

interface NetworkData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface AffectedNode {
  id: string;
  name: string;
  currentDegree: number;
  newDegree: number;
}

interface NetworkImpact {
  connectionCount: number;
  affected: AffectedNode[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;
    density: number;
  };
  isolatedCount: number;
  maySplitGraph: boolean;
}

interface UserData {
  id: string;
  name?: string;
  label?: string;
  data?: {
    id?: string;
    name?: string;
    nodeType?: string;
    role?: string;
    friendCount?: number;
    avgDistance?: number;
    centrality?: number;
  };
}

// ============================================================
// Constants
// ============================================================
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 28, mass: 0.8 };

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 8, filter: 'blur(2px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { ...SPRING },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    filter: 'blur(1px)',
    transition: { duration: 0.12, ease: 'easeIn' as const },
  },
};

// ============================================================
// Utility Functions
// ============================================================
const buildAdjacencyList = (edges: GraphEdge[]): Map<string, string[]> => {
  const adjacencyList = new Map<string, string[]>();
  
  edges.forEach((edge) => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
    
    if (!adjacencyList.has(edge.target)) {
      adjacencyList.set(edge.target, []);
    }
    adjacencyList.get(edge.target)!.push(edge.source);
  });
  
  return adjacencyList;
};

const calculateNetworkImpact = (
  nodeId: string,
  networkData: NetworkData
): NetworkImpact | null => {
  const { nodes, edges } = networkData;
  
  if (!nodes.length) return null;
  
  const adjacencyList = buildAdjacencyList(edges);
  const nodeConnections = adjacencyList.get(nodeId) || [];
  const connectionCount = nodeConnections.length;
  
  const affected: AffectedNode[] = nodeConnections.map((neighborId) => {
    const neighbor = nodes.find((n) => n.id === neighborId);
    const currentDegree = (adjacencyList.get(neighborId) || []).length;
    
    return {
      id: neighborId,
      name: neighbor?.data?.name || neighborId,
      currentDegree,
      newDegree: currentDegree - 1,
    };
  });
  
  const newNodes = nodes.length - 1;
  const newEdges = edges.length - connectionCount;
  const newAvg = newNodes > 0 ? (newEdges * 2) / newNodes : 0;
  const maxEdges = newNodes > 1 ? (newNodes * (newNodes - 1)) / 2 : 1;
  const newDensity = newEdges / maxEdges;
  
  return {
    connectionCount,
    affected,
    stats: {
      totalNodes: newNodes,
      totalEdges: newEdges,
      avgDegree: newAvg,
      density: newDensity,
    },
    isolatedCount: affected.filter((n) => n.newDegree === 0).length,
    maySplitGraph: connectionCount === 1 && nodes.length > 2,
  };
};

const extractNodeId = (user: UserData): string | null => {
  return user.id || user.data?.id || null;
};

const extractUserName = (user: UserData): string => {
  return user.name || user.label || user.data?.name || user.id || 'Unknown';
};

// ============================================================
// Components
// ============================================================

// --- ModalShell ---
interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
}

export function ModalShell({
  open,
  onClose,
  titleId,
  size = 'md',
  children,
  footer,
}: ModalShellProps): React.ReactElement | null {
  const shellRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      
      if (e.key === 'Tab' && shellRef.current) {
        const focusable = shellRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusable.length === 0) return;
        
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => shellRef.current?.focus());

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseDown={handleOverlayClick}
          aria-hidden="true"
        >
          <motion.div
            ref={shellRef}
            className={`modal-container modal-container--${size}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X size={15} strokeWidth={1.8} />
            </button>

            <div className="modal-body">{children}</div>

            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- ModalHeader ---
interface ModalHeaderProps {
  icon: LucideIcon;
  accent?: string;
  title: string;
  subtitle?: ReactNode;
  titleId: string;
}

export function ModalHeader({
  icon: Icon,
  accent = 'amber',
  title,
  subtitle,
  titleId,
}: ModalHeaderProps): React.ReactElement {
  return (
    <div className="modal-header">
      <div className={`modal-header-icon modal-header-icon--${accent}`}>
        <Icon size={16} strokeWidth={1.6} />
      </div>
      <div className="modal-header-text">
        <h2 id={titleId} className="modal-title">
          {title}
        </h2>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

// --- EmptyState ---
interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps): React.ReactElement {
  return (
    <div className="empty-state">
      <Icon size={20} strokeWidth={1.4} />
      <span>{message}</span>
    </div>
  );
}

// --- LoadingState ---
interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps): React.ReactElement {
  return (
    <div className="loading-state">
      <Loader2 size={18} className="loading-spinner" />
      <span>{message}</span>
    </div>
  );
}

// --- ErrorState ---
interface ErrorStateProps {
  message?: string;
}

export function ErrorState({ message = 'Something went wrong' }: ErrorStateProps): React.ReactElement {
  return (
    <div className="error-state">
      <AlertTriangle size={14} />
      <span>{message}</span>
    </div>
  );
}

// --- Badge ---
interface BadgeProps {
  children: ReactNode;
  variant?: string;
  size?: string;
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps): React.ReactElement {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {children}
    </span>
  );
}

// --- ImpactMetric ---
interface ImpactMetricProps {
  label: string;
  before: number;
  after: number;
  icon: LucideIcon;
  format?: 'number' | 'decimal' | 'float1';
}

export function ImpactMetric({
  label,
  before,
  after,
  icon: Icon,
  format = 'number',
}: ImpactMetricProps): React.ReactElement {
  const change = after - before;
  const isNegative = change < 0;
  const pctChange = before !== 0 ? ((Math.abs(change) / before) * 100).toFixed(1) : '0.0';

  const formatValue = (v: number): string => {
    switch (format) {
      case 'decimal':
        return v.toFixed(4);
      case 'float1':
        return v.toFixed(1);
      default:
        return String(v);
    }
  };

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <Icon size={11} strokeWidth={1.8} />
        <span>{label}</span>
      </div>
      <div className="metric-card-values">
        <div className="metric-card-val metric-card-val--before">
          <span className="metric-card-label">Before</span>
          <span className="metric-card-number">{formatValue(before)}</span>
        </div>
        <ArrowRight size={11} className="metric-card-arrow" />
        <div className="metric-card-val metric-card-val--after">
          <span className="metric-card-label">After</span>
          <span className={`metric-card-number ${isNegative ? 'text-danger' : ''}`}>
            {formatValue(after)}
          </span>
        </div>
      </div>
      {change !== 0 && (
        <div
          className={`metric-card-change ${
            isNegative ? 'metric-card-change--down' : 'metric-card-change--up'
          }`}
        >
          {isNegative ? '↓' : '↑'} {pctChange}%
        </div>
      )}
    </div>
  );
}

// ============================================================
// DeleteNodeModal
// ============================================================
interface DeleteNodeModalProps {
  open: boolean;
  onClose: () => void;
  user: UserData;
  onConfirm: (user: UserData) => Promise<void>;
}

export function DeleteNodeModal({
  open,
  onClose,
  user,
  onConfirm,
}: DeleteNodeModalProps): React.ReactElement | null {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Fetch network data when modal opens
  useEffect(() => {
    if (!open || !user) return;

    const fetchNetworkData = async () => {
      setIsLoadingNetwork(true);
      setNetworkError(null);
      
      try {
        const data = await getFullNetwork();
        setNetworkData(data);
      } catch (error) {
        console.error('Failed to fetch network data:', error);
        setNetworkError('Failed to load network analysis');
        setNetworkData(null);
      } finally {
        setIsLoadingNetwork(false);
      }
    };

    fetchNetworkData();
  }, [open, user]);

  // Extract node ID safely
  const nodeId = useMemo(() => extractNodeId(user), [user]);
  const userName = useMemo(() => extractUserName(user), [user]);

  // Calculate impact from fetched network data
  const impact = useMemo<NetworkImpact | null>(() => {
    if (!nodeId || !networkData) return null;
    return calculateNetworkImpact(nodeId, networkData);
  }, [nodeId, networkData]);

  const handleConfirm = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await onConfirm?.(user);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  const currentStats = useMemo(() => {
    if (!networkData) return null;
    
    const { nodes, edges } = networkData;
    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      avgDegree: nodes.length > 0 ? (edges.length * 2) / nodes.length : 0,
      density: nodes.length > 1
        ? (edges.length * 2) / (nodes.length * (nodes.length - 1))
        : 0,
    };
  }, [networkData]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="delete-modal-title"
      size="md"
      footer={
        <div className="modal-footer-buttons">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={handleConfirm}
            disabled={isDeleting || isLoadingNetwork || !!networkError}
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="loading-spinner" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete Node
              </>
            )}
          </button>
        </div>
      }
    >
      <ModalHeader
        icon={Trash2}
        accent="danger"
        title="Delete Node"
        subtitle={
          <>
            You're about to remove <strong>{userName}</strong>
          </>
        }
        titleId="delete-modal-title"
      />

      {/* Network Analysis Content */}
      {isLoadingNetwork && (
        <LoadingState message="Analyzing network impact..." />
      )}

      {networkError && (
        <ErrorState message={networkError} />
      )}

      {!isLoadingNetwork && !networkError && impact && currentStats && (
        <>
          {/* Impact Summary */}
          <div className="delete-impact">
            <div className="delete-impact-header">
              <AlertTriangle size={12} />
              Network Impact Analysis
            </div>

            <div className="delete-impact-stat">
              <Link2 size={13} />
              <span>
                Will remove <strong>{impact.connectionCount}</strong> connection
                {impact.connectionCount !== 1 ? 's' : ''}
              </span>
            </div>

            {impact.isolatedCount > 0 && (
              <div className="delete-impact-warning">
                <AlertTriangle size={12} />
                {impact.isolatedCount} node{impact.isolatedCount !== 1 ? 's' : ''} will become isolated
              </div>
            )}

            {impact.maySplitGraph && (
              <div className="delete-impact-warning delete-impact-warning--split">
                <AlertTriangle size={12} />
                Graph may split into disconnected components
              </div>
            )}
          </div>

          {/* Network Metrics */}
          <div className="delete-metrics">
            <ImpactMetric
              label="Total Nodes"
              before={currentStats.totalNodes}
              after={impact.stats.totalNodes}
              icon={Network}
            />
            <ImpactMetric
              label="Total Edges"
              before={currentStats.totalEdges}
              after={impact.stats.totalEdges}
              icon={BarChart3}
            />
            <ImpactMetric
              label="Avg Degree"
              before={currentStats.avgDegree}
              after={impact.stats.avgDegree}
              icon={TrendingDown}
              format="float1"
            />
            <ImpactMetric
              label="Density"
              before={currentStats.density}
              after={impact.stats.density}
              icon={BarChart3}
              format="decimal"
            />
          </div>

          {/* Affected Nodes List */}
          {impact.affected.length > 0 && (
            <div className="delete-affected">
              <div className="delete-affected-header">
                <Users size={12} />
                Affected Nodes ({impact.affected.length})
              </div>
              <div className="delete-affected-list">
                {impact.affected.slice(0, 6).map((node) => (
                  <div key={node.id} className="delete-affected-item">
                    <span className="delete-affected-name">{node.name}</span>
                    <span className="delete-affected-degree">
                      <span className="degree-before">{node.currentDegree}</span>
                      <ArrowRight size={10} />
                      <span className={`degree-after ${node.newDegree === 0 ? 'degree-isolated' : ''}`}>
                        {node.newDegree}
                      </span>
                    </span>
                  </div>
                ))}
                {impact.affected.length > 6 && (
                  <div className="delete-affected-more">
                    +{impact.affected.length - 6} more nodes
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Fallback when no impact data is available */}
      {!isLoadingNetwork && !networkError && !impact && (
        <EmptyState
          icon={AlertTriangle}
          message="Unable to calculate network impact"
        />
      )}
    </ModalShell>
  );
}