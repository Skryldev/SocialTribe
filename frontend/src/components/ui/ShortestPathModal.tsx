import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Route,
  Target,
  Network,
  Link2,
  Flag,
  MapPin,
  GitCommit,
} from 'lucide-react';
import {
  ModalShell,
  ModalHeader,
  LoadingState,
  EmptyState,
  Badge,
} from './NodeContextMenuModals';
import './ShortestPathModal.css';

const SPRING_GENTLE = { type: 'spring' as const, stiffness: 340, damping: 28, mass: 0.9 };
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 450, damping: 30, mass: 0.7 };

const staggerFadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.07 * i, duration: 0.28, ease: [0.16, 1, 0.3, 1] as const},
  }),
};

const staggerNode = {
  hidden: { opacity: 0, y: 16, scale: 0.88 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.08 * i, ...SPRING_GENTLE },
  }),
};

const connectorReveal = {
  hidden: { width: 0, opacity: 0 },
  visible: (i: number) => ({
    width: 32,
    opacity: 1,
    transition: { delay: 0.14 + i * 0.06, duration: 0.32, ease: [0.16, 1, 0.3, 1] as const},
  }),
};

const pulseGlow = {
  initial: { boxShadow: '0 0 0 0 hsl(262 83% 58% / 0.4)' },
  animate: {
    boxShadow: [
      '0 0 0 0 hsl(262 83% 58% / 0.4)',
      '0 0 0 8px hsl(262 83% 58% / 0)',
      '0 0 0 0 hsl(262 83% 58% / 0)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

interface Step {
  id: string;
  index: number;
  isSource: boolean;
  isTarget: boolean;
}

interface PathNodeProps {
  step: Step;
  isSource: boolean;
  isTarget: boolean;
  totalSteps: number;
}

function PathNode({ step, isSource, isTarget, totalSteps }: PathNodeProps): React.ReactElement {
  const progressPercent = totalSteps > 1
    ? Math.round((step.index / (totalSteps - 1)) * 100)
    : 0;

  return (
    <motion.div
      className={`sp-node ${isSource ? 'sp-node--source' : ''} ${isTarget ? 'sp-node--target' : ''}`}
      whileHover={{ scale: 1.05, y: -3 }}
      transition={SPRING_SNAPPY}
      layout
    >
      <motion.div
        className="sp-node-circle"
        variants={isSource || isTarget ? pulseGlow : undefined}
        initial="initial"
        animate={isSource || isTarget ? 'animate' : undefined}
      >
        {isSource ? (
          <Flag size={16} strokeWidth={1.8} />
        ) : isTarget ? (
          <MapPin size={16} strokeWidth={1.8} />
        ) : (
          <span className="sp-node-step-num">{step.index + 1}</span>
        )}
      </motion.div>

      <span className="sp-node-label" title={step.id}>
        {step.id}
      </span>

      {!isSource && !isTarget && (
        <div className="sp-node-progress">
          <div
            className="sp-node-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <AnimatePresence>
        {isSource && (
          <motion.span
            className="sp-node-role sp-node-role--source"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ delay: 0.3, ...SPRING_SNAPPY }}
          >
            START
          </motion.span>
        )}
        {isTarget && (
          <motion.span
            className="sp-node-role sp-node-role--target"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ delay: 0.3, ...SPRING_SNAPPY }}
          >
            END
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface PathConnectorProps {
  index: number;
}

function PathConnector({ index }: PathConnectorProps): React.ReactElement {
  return (
    <motion.div
      className="sp-connector"
      variants={connectorReveal}
      initial="hidden"
      animate="visible"
      custom={index}
    >
      <div className="sp-connector-line">
        <div className="sp-connector-line-inner" />
      </div>
      <motion.div
        className="sp-connector-arrow-wrap"
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 + index * 0.06, duration: 0.2 }}
      >
        <ArrowRight size={11} className="sp-connector-arrow" strokeWidth={2.5} />
      </motion.div>
    </motion.div>
  );
}

interface PathSummaryProps {
  nodeCount: number;
  edgeCount: number;
  isDirected: boolean;
}

function PathSummary({ nodeCount, edgeCount, isDirected }: PathSummaryProps): React.ReactElement {
  return (
    <motion.div
      className="sp-summary"
      variants={staggerFadeUp}
      initial="hidden"
      animate="visible"
      custom={nodeCount + 1}
    >
      <div className="sp-summary-stat">
        <div className="sp-summary-icon sp-summary-icon--nodes">
          <Network size={13} strokeWidth={1.6} />
        </div>
        <div className="sp-summary-info">
          <span className="sp-summary-value">{nodeCount}</span>
          <span className="sp-summary-label">Nodes</span>
        </div>
      </div>

      <div className="sp-summary-divider" />

      <div className="sp-summary-stat">
        <div className="sp-summary-icon sp-summary-icon--edges">
          <GitCommit size={13} strokeWidth={1.6} />
        </div>
        <div className="sp-summary-info">
          <span className="sp-summary-value">{edgeCount}</span>
          <span className="sp-summary-label">Edges</span>
        </div>
      </div>

      <div className="sp-summary-divider" />

      <div className="sp-summary-stat">
        <div className="sp-summary-icon sp-summary-icon--type">
          <Target size={13} strokeWidth={1.6} />
        </div>
        <div className="sp-summary-info">
          <span className="sp-summary-value sp-summary-value--type">
            {isDirected ? 'Directed' : 'Undirected'}
          </span>
          <span className="sp-summary-label">Type</span>
        </div>
      </div>
    </motion.div>
  );
}

interface ShortestPathModalProps {
  open: boolean;
  onClose: () => void;
  sourceNode: any;
  targetNode: any;
  pathData: any;
  loading: boolean;
}

export function ShortestPathModal({
  open,
  onClose,
  sourceNode,
  targetNode,
  pathData,
  loading,
}: ShortestPathModalProps): React.ReactElement {
  const path = pathData?.path ?? [];
  const isDirected = pathData?.is_directed ?? false;
  const message = pathData?.message ?? '';

  const steps = useMemo(
    () =>
      path.map((nodeId: string, i: number) => ({
        id: nodeId,
        index: i,
        isSource: i === 0,
        isTarget: i === path.length - 1 && path.length > 1,
      })),
    [path]
  );

  const edgeCount = path.length > 0 ? path.length - 1 : 0;
  const hasPath = path.length > 0;
  const sourceName = sourceNode?.label || sourceNode?.id || 'Source';
  const targetName = targetNode?.label || targetNode?.id || 'Target';

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="sp-modal-title"
      size="md"
    >
      <ModalHeader
        icon={Route}
        accent="violet"
        title="Shortest Path"
        subtitle={
          <span className="sp-header-subtitle">
            <span className="sp-header-node sp-header-node--source">
              <Flag size={10} strokeWidth={2} />
              {sourceName}
            </span>
            <ArrowRight size={12} className="sp-header-arrow" />
            <span className="sp-header-node sp-header-node--target">
              <MapPin size={10} strokeWidth={2} />
              {targetName}
            </span>
          </span>
        }
        titleId="sp-modal-title"
      />

      {loading ? (
        <div className="sp-loading-wrapper">
          <LoadingState message="Finding the best route…" />
        </div>
      ) : !pathData ? (
        <EmptyState icon={Route} message="No result available" />
      ) : (
        <div className="sp-result">
          <motion.div
            className="sp-status"
            variants={staggerFadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <div className="sp-status-left">
              <Badge variant={hasPath ? 'success' : 'danger'} size="sm">
                {hasPath ? 'Path Found' : 'No Path'}
              </Badge>
              {isDirected && (
                <Badge variant="violet" size="sm">
                  Directed
                </Badge>
              )}
            </div>
            <div className="sp-status-right">
              <span className="sp-hops-label">Distance</span>
              <span className="sp-hops-value">
                {hasPath ? edgeCount : 0}
                <span className="sp-hops-unit"> hop{edgeCount !== 1 ? 's' : ''}</span>
              </span>
            </div>
          </motion.div>

          {message && (
            <motion.div
              className="sp-message"
              variants={staggerFadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
            >
              <div className="sp-message-icon">
                <Route size={14} strokeWidth={1.8} />
              </div>
              <p className="sp-message-text">{message}</p>
            </motion.div>
          )}

          {hasPath && (
            <div className="sp-chain">
              <AnimatePresence mode="popLayout">
                {steps.map((step: Step, i: number) => (
                  <motion.div
                    key={step.id}
                    className="sp-chain-item"
                    variants={staggerNode}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    layout
                  >
                    <PathNode
                      step={step}
                      isSource={step.isSource}
                      isTarget={step.isTarget}
                      totalSteps={steps.length}
                    />
                    {i < steps.length - 1 && <PathConnector index={i} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!hasPath && !loading && (
            <motion.div
              className="sp-no-path"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, ...SPRING_GENTLE }}
            >
              <div className="sp-no-path-icon">
                <Link2 size={28} strokeWidth={1.2} />
              </div>
              <span className="sp-no-path-text">No path exists between these nodes</span>
              <span className="sp-no-path-hint">
                The nodes may be in different components or the graph is directed
              </span>
            </motion.div>
          )}

          {hasPath && (
            <PathSummary
              nodeCount={path.length}
              edgeCount={edgeCount}
              isDirected={isDirected}
            />
          )}
        </div>
      )}
    </ModalShell>
  );
}