import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  RefreshCw,
  ArrowRightLeft,
  Clock,
  FileJson,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  Zap,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getGraphs, switchGraph } from './importApi';
import './SavedGraphsPanel.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 12,
    scale: 0.97,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.18, ease: 'easeIn' as const},
  },
  hover: {
    y: -2,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  tap: {
    y: 0,
    scale: 0.985,
    transition: { type: 'spring' as const, stiffness: 500, damping: 20 },
  },
};

const glowVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: [0, 0.12, 0],
    scale: [0.98, 1.01, 0.98],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

const iconVariants = {
  initial: { rotate: 0 },
  hover: { 
    rotate: [0, -8, 8, -4, 0],
    transition: { duration: 0.4 },
  },
};

const switchButtonVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.04,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  tap: { 
    scale: 0.96,
    transition: { type: 'spring' as const, stiffness: 500, damping: 20 },
  },
};

const emptyVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 250,
      damping: 22,
      delay: 0.15,
    },
  },
};

const getGraphTimestamp = (graph: any): number => {
  const dateStr = graph.created_at || graph.updated_at || graph.timestamp;
  return dateStr ? new Date(dateStr).getTime() : 0;
};

const sortGraphsByDate = (graphs: any[]): any[] => {
  return [...graphs].sort((a: any, b: any) => getGraphTimestamp(b) - getGraphTimestamp(a));
};

const normalizeGraphData = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.graphs && Array.isArray(data.graphs)) return data.graphs;
  if (typeof data === 'object') {
    return Object.entries(data).map(([id, info]: [string, any]) => ({
      id,
      ...(typeof info === 'object' ? info : { name: info }),
    }));
  }
  return [];
};

const formatRelativeTime = (dateString: string): string | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const getGraphInfo = (graph: any): { name: string; meta: string } => {
  const name = graph.name || graph.graph_name || graph.id || graph.graph_id || 'Unnamed Graph';
  const meta: string[] = [];
  
  if (graph.total_nodes !== undefined) {
    meta.push(`${graph.total_nodes.toLocaleString()} nodes`);
  }
  if (graph.total_edges !== undefined) {
    meta.push(`${graph.total_edges.toLocaleString()} edges`);
  }
  if (graph.file_name) {
    meta.push(graph.file_name);
  }
  
  return { name, meta: meta.join(' • ') };
};

const getGraphId = (graph: any): string => graph.id || graph.graph_id;

const isGraphActive = (graph: any, activeGraphId: string | null): boolean => {
  return activeGraphId === getGraphId(graph) || graph.is_active || graph.active;
};

function SkeletonLoader(): React.ReactElement {
  return (
    <div className="sgp-list-container">
      {[1, 2, 3].map((i: number) => (
        <div key={i} className="sgp-skeleton">
          <div className="sgp-skeleton-inner">
            <div className="sgp-skeleton-icon" />
            <div className="sgp-skeleton-content">
              <div className="sgp-skeleton-line sgp-skeleton-line--medium" />
              <div className="sgp-skeleton-line sgp-skeleton-line--short" />
              <div className="sgp-skeleton-line sgp-skeleton-line--short" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <motion.div
      className="sgp-empty"
      variants={emptyVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="sgp-empty-icon-wrapper"
        animate={{
          y: [0, -6, 0],
          borderColor: [
            'var(--iem-border)',
            'var(--iem-violet-border)',
            'var(--iem-border)',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Layers size={22} />
      </motion.div>
      <h4 className="sgp-empty-title">No saved graphs</h4>
      <p className="sgp-empty-desc">
        Import a dataset and it will<br />appear here automatically
      </p>
    </motion.div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps): React.ReactElement {
  return (
    <motion.div
      className="sgp-error"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
    >
      <AlertCircle size={15} className="sgp-error-icon" />
      <div>
        <p className="sgp-error-text">{message}</p>
        <button className="sgp-error-retry" onClick={onRetry}>
          Try again
        </button>
      </div>
    </motion.div>
  );
}

interface GraphCardProps {
  graph: any;
  isActive: boolean;
  isSwitching: boolean;
  onSwitch: (graphId: string) => void;
}

function GraphCard({ graph, isActive, isSwitching, onSwitch }: GraphCardProps): React.ReactElement {
  const graphId = getGraphId(graph);
  const { name, meta } = getGraphInfo(graph);
  const timestamp = graph.created_at || graph.updated_at || graph.timestamp;

  return (
    <motion.div
      className={`sgp-card ${isActive ? 'sgp-card--active' : ''}`}
      variants={cardVariants}
      whileHover="hover"
      whileTap="tap"
      layout
      onClick={() => {
        if (!isActive && !isSwitching) onSwitch(graphId);
      }}
    >
      {isActive && (
        <motion.div
          className="sgp-active-glow"
          variants={glowVariants}
          initial="initial"
          animate="animate"
        />
      )}

      <div className="sgp-card-inner">
        <motion.div
          className={`sgp-card-icon-wrapper ${
            isActive 
              ? 'sgp-card-icon-wrapper--active' 
              : 'sgp-card-icon-wrapper--inactive'
          }`}
          variants={iconVariants}
          whileHover="hover"
        >
          {isActive ? <Activity size={14} /> : <FileJson size={14} />}
        </motion.div>

        <div className="sgp-card-content">
          <div className="sgp-card-header">
            <span className="sgp-card-name" title={name}>{name}</span>
            {isActive && (
              <motion.span
                className="sgp-active-badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 450, 
                  damping: 22,
                  delay: 0.08,
                }}
              >
                <span className="sgp-active-dot" />
                Active
              </motion.span>
            )}
          </div>

          {meta && (
            <p className="sgp-card-meta">
              {meta.split(' • ').map((part: string, i: number) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="sgp-meta-dot" />}
                  <span>{part}</span>
                </React.Fragment>
              ))}
            </p>
          )}

          {timestamp && (
            <div className="sgp-card-time">
              <Clock size={10} />
              <span>{formatRelativeTime(timestamp)}</span>
            </div>
          )}
        </div>

        <motion.button
          className={`sgp-switch-btn ${
            isActive 
              ? 'sgp-switch-btn--active' 
              : isSwitching 
                ? 'sgp-switch-btn--loading'
                : 'sgp-switch-btn--inactive'
          }`}
          variants={switchButtonVariants}
          whileHover={isActive ? undefined : "hover"}
          whileTap={isActive ? undefined : "tap"}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onSwitch(graphId);
          }}
          disabled={isActive || isSwitching}
        >
          {isSwitching ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity, 
                  ease: 'linear' 
                }}
              >
                <Loader2 size={11} />
              </motion.div>
              Switching
            </>
          ) : isActive ? (
            <>
              <CheckCircle2 size={11} />
              Current
            </>
          ) : (
            <>
              <ArrowRightLeft size={11} />
              Switch
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

interface SavedGraphsPanelProps {
  onGraphSwitch?: (graphId: string, result: any) => void;
  onRefresh?: () => void;
}

export function SavedGraphsPanel({ onGraphSwitch, onRefresh }: SavedGraphsPanelProps): React.ReactElement {
  const [graphs, setGraphs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [switchingGraphId, setSwitchingGraphId] = useState<string | null>(null);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const toastOptions: any = {
    duration: 3000,
    position: 'top-right',
  };

  const sortedGraphs = useMemo(() => sortGraphsByDate(graphs), [graphs]);

  const fetchGraphs = useCallback(async (showLoader: boolean = true) => {
    if (showLoader) setLoading(true);
    setIsRefreshing(true);
    setError(null);
    
    try {
      const data = await getGraphs();
      const normalizedData = normalizeGraphData(data);
      const sorted = sortGraphsByDate(normalizedData);
      
      setGraphs(sorted);
      
      const activeGraph = sorted.find((g: any) => g.is_active || g.active);
      if (activeGraph) {
        setActiveGraphId(getGraphId(activeGraph));
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch graphs';
      setError(errorMessage);
      toast.error(errorMessage, { ...toastOptions, duration: 4000 });
      console.error('[SavedGraphs] Fetch error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleSwitchGraph = useCallback(async (graphId: string) => {
    if (!graphId || switchingGraphId) return;
    
    setSwitchingGraphId(graphId);
    
    try {
      const result = await switchGraph(graphId);
      
      setActiveGraphId(graphId);
      
      toast.success('Graph switched successfully', {
        ...toastOptions,
        icon: <CheckCircle2 size={15} style={{ color: 'var(--iem-violet)' }} />,
      });
      
      onGraphSwitch?.(graphId, result);
      onRefresh?.();
      
      setTimeout(() => fetchGraphs(false), 800);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to switch graph';
      toast.error(errorMessage, { ...toastOptions, duration: 4000 });
      console.error('[SavedGraphs] Switch error:', err);
    } finally {
      setSwitchingGraphId(null);
    }
  }, [onGraphSwitch, onRefresh, fetchGraphs, switchingGraphId]);

  useEffect(() => {
    fetchGraphs();
  }, [fetchGraphs]);

  return (
    <div className="sgp-container">
      <motion.div 
        className="sgp-header"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="sgp-header-top">
          <div className="sgp-title-group">
            <motion.div
              className="sgp-header-icon"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Database size={16} />
            </motion.div>
            <div>
              <h3 className="sgp-title">Saved Graphs</h3>
              <p className="sgp-subtitle">Switch between your datasets</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {sortedGraphs.length > 0 && (
              <motion.span
                className="sgp-count-badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 400, 
                  damping: 20,
                  delay: 0.05,
                }}
              >
                {sortedGraphs.length}
              </motion.span>
            )}
            <motion.button
              className={`sgp-refresh-btn ${isRefreshing ? 'sgp-refresh-btn--loading' : ''}`}
              onClick={() => fetchGraphs(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh list"
            >
              <motion.div
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={isRefreshing ? { 
                  duration: 0.8, 
                  repeat: Infinity, 
                  ease: 'linear' 
                } : {}}
              >
                <RefreshCw size={14} />
              </motion.div>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <ErrorState 
            key="error"
            message={error} 
            onRetry={() => fetchGraphs(true)} 
          />
        )}
      </AnimatePresence>

      {loading ? (
        <SkeletonLoader />
      ) : sortedGraphs.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          className="sgp-list-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {sortedGraphs.map((graph: any) => (
              <GraphCard
                key={getGraphId(graph)}
                graph={graph}
                isActive={isGraphActive(graph, activeGraphId)}
                isSwitching={switchingGraphId === getGraphId(graph)}
                onSwitch={handleSwitchGraph}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {sortedGraphs.length > 0 && (
          <motion.div
            className="sgp-footer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ delay: 0.15 }}
          >
            <div className="sgp-footer-inner">
              <div className="sgp-footer-left">
                <Layers size={10} />
                <span>
                  {sortedGraphs.length} graph{sortedGraphs.length !== 1 ? 's' : ''}
                </span>
              </div>
              {activeGraphId && (
                <motion.div
                  className="sgp-footer-right"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="sgp-footer-dot" />
                  <Zap size={10} />
                  <span>{activeGraphId}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SavedGraphsPanel;