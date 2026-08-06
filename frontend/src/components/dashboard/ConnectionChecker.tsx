import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useNetwork } from './NetworkContext';
import UserSelect from './UserSelect';
import {
  Network,
  CheckCircle,
  XCircle,
  ArrowRight,
  Zap,
  Route,
  MapPin,
  Users,
  Loader2,
  Link2,
  GitBranch,
  Footprints,
  Sparkles,
  Search,
  ChevronRight,
  Target,
} from 'lucide-react';
import './ConnectionChecker.css';

const springBouncy = { type: 'spring' as const, stiffness: 500, damping: 20 };
const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 25 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 28 };

const ANIMATION_VARIANTS: any = {
  fadeIn: {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.25 } },
  },

  resultCard: {
    hidden: { opacity: 0, scale: 0.92, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { ...springSnappy, delay: 0.1 },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -15,
      transition: { duration: 0.2 },
    },
  },

  pathNode: {
    hidden: { opacity: 0, x: -30, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        delay: 0.3 + i * 0.15,
        ...springBouncy,
      },
    }),
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  },

  arrowPulse: {
    animate: {
      x: [0, 4, 0],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },

  checkButton: {
    rest: { scale: 1 },
    hover: { scale: 1.03, boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)' },
    tap: { scale: 0.97 },
  },

  iconBounce: {
    hidden: { scale: 0, rotate: -45 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: { ...springBouncy, delay: 0.2 },
    },
  },

  float: {
    animate: {
      y: [0, -6, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
  },

  drawLine: {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
      transition: { delay: 0.3, duration: 0.5, ease: 'easeOut' },
    },
  },
};

interface PathNodeProps {
  name: string;
  index: number;
  total: number;
  color: string;
}

const PathNode = React.memo(({ name, index, total, color }: PathNodeProps) => {
  const isLast = index === total - 1;

  return (
    <motion.div
      className="path-node-item"
      variants={ANIMATION_VARIANTS.pathNode}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.08, y: -3 }}
      style={{ '--node-color': color } as React.CSSProperties}
      layout
    >
      <div className="path-node-avatar" style={{ background: color }}>
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="path-node-name">{name}</span>

      {!isLast && (
        <motion.div
          className="path-node-arrow"
          variants={ANIMATION_VARIANTS.arrowPulse}
          animate="animate"
        >
          <ChevronRight size={14} />
        </motion.div>
      )}
    </motion.div>
  );
});

PathNode.displayName = 'PathNode';

interface ConnectedResultProps {
  userA: string;
  userB: string;
  path: string[];
  getUserName: (id: string) => string;
  getUserAvatar: (id: string) => string;
}

const ConnectedResult = React.memo(({ userA, userB, path, getUserName, getUserAvatar }: ConnectedResultProps) => {
  const hops = path.length - 1;
  const isDirect = hops === 1;
  const pathColors = [
    '#f59e0b',
    '#fbbf24',
    '#ea580c',
    '#d97706',
    '#f97316',
    '#fb923c',
  ];

  return (
    <motion.div
      className="result-card result-connected"
      variants={ANIMATION_VARIANTS.resultCard}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <div className="result-header">
        <motion.div
          className="result-icon success"
          variants={ANIMATION_VARIANTS.iconBounce}
          initial="hidden"
          animate="visible"
        >
          <CheckCircle size={18} />
        </motion.div>
        <div className="result-info">
          <span className="result-title">
            {isDirect ? 'Direct Connection' : 'Path Found'}
          </span>
          <span className="result-description">
            {isDirect
              ? 'Nodes are directly connected'
              : `${hops} hop${hops > 1 ? 's' : ''} between nodes`}
          </span>
        </div>
      </div>

      <div className="endpoint-users">
        <motion.div
          className="endpoint-user"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="endpoint-avatar source">
            {getUserAvatar(userA)}
          </div>
          <span className="endpoint-name">{getUserName(userA)}</span>
          <span className="endpoint-label">Source</span>
        </motion.div>

        <motion.div
          className="endpoint-connector"
          variants={ANIMATION_VARIANTS.drawLine}
          initial="hidden"
          animate="visible"
        >
          <div className="connector-line" />
          <motion.div
            className="connector-icon"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isDirect ? <Link2 size={22} /> : <Footprints size={22} />}
          </motion.div>
          <div className="connector-line" />
        </motion.div>

        <motion.div
          className="endpoint-user"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="endpoint-avatar target">
            {getUserAvatar(userB)}
          </div>
          <span className="endpoint-name">{getUserName(userB)}</span>
          <span className="endpoint-label">Target</span>
        </motion.div>
      </div>

      {!isDirect && path.length > 2 && (
        <motion.div
          className="path-visualization"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="path-label">
            <GitBranch size={12} />
            <span>Complete Path</span>
          </div>
          <div className="path-nodes-container">
            <AnimatePresence>
              {path.map((id: string, idx: number) => (
                <PathNode
                  key={id}
                  name={getUserName(id)}
                  index={idx}
                  total={path.length}
                  color={pathColors[idx % pathColors.length]}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

ConnectedResult.displayName = 'ConnectedResult';

interface DisconnectedResultProps {
  userA: string;
  userB: string;
  getUserName: (id: string) => string;
  getUserAvatar: (id: string) => string;
}

const DisconnectedResult = React.memo(({ userA, userB, getUserName, getUserAvatar }: DisconnectedResultProps) => {
  return (
    <motion.div
      className="result-card result-disconnected"
      variants={ANIMATION_VARIANTS.resultCard}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <div className="result-header">
        <motion.div
          className="result-icon error"
          variants={ANIMATION_VARIANTS.iconBounce}
          initial="hidden"
          animate="visible"
        >
          <XCircle size={18} />
        </motion.div>
        <div className="result-info">
          <span className="result-title">No Connection</span>
          <span className="result-description">
            These nodes belong to different components
          </span>
        </div>
      </div>

      <div className="disconnected-visual">
        <motion.div
          className="disconnected-user"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="disconnected-avatar">
            {getUserAvatar(userA)}
          </div>
          <span className="disconnected-name">{getUserName(userA)}</span>
        </motion.div>

        <motion.div
          className="disconnected-separator"
          animate={{ rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <XCircle size={24} />
        </motion.div>

        <motion.div
          className="disconnected-user"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="disconnected-avatar">
            {getUserAvatar(userB)}
          </div>
          <span className="disconnected-name">{getUserName(userB)}</span>
        </motion.div>
      </div>

      <motion.div
        className="disconnected-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Users size={12} />
        <span>No path exists between these nodes</span>
      </motion.div>
    </motion.div>
  );
});

DisconnectedResult.displayName = 'DisconnectedResult';

const EmptyState = React.memo(() => {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <motion.div
        className="empty-icon-wrap"
        variants={ANIMATION_VARIANTS.float}
        animate="animate"
      >
        <div className="empty-icon-circle">
          <Search size={28} strokeWidth={1.5} />
        </div>
        <motion.div
          className="empty-icon-sparkle"
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Sparkles size={14} />
        </motion.div>
      </motion.div>
      <h3 className="empty-title">Check Connectivity</h3>
      <p className="empty-description">
        Select source and target nodes to find the shortest path between them
      </p>
    </motion.div>
  );
});

EmptyState.displayName = 'EmptyState';

interface ConnectionCheckerProps {
  presetUserA?: string | number;
  presetUserB?: string | number;
}

export default function ConnectionChecker({ presetUserA, presetUserB }: ConnectionCheckerProps): React.ReactElement {
  const { users, shortestPath } = useNetwork() as any;
  const [userA, setUserA] = useState<string>('');
  const [userB, setUserB] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [checked, setChecked] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    if (presetUserA !== undefined) setUserA(String(presetUserA));
  }, [presetUserA]);

  useEffect(() => {
    if (presetUserB !== undefined) setUserB(String(presetUserB));
  }, [presetUserB]);

  const getUserName = useCallback(
    (id: string) => users.find((u: any) => u.id === id)?.name ?? String(id),
    [users]
  );

  const getUserAvatar = useCallback(
    (id: string) => {
      const name = getUserName(id);
      return name.charAt(0).toUpperCase();
    },
    [getUserName]
  );

  const handleCheck = useCallback(async () => {
    if (!userA || !userB) return;

    setIsChecking(true);

    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const path = shortestPath(userA, userB);
      console.log('Shortest path result:', path);
      setResult(path);
      setChecked(true);
    } catch (error) {
      console.error('Error finding path:', error);
      setResult(null);
      setChecked(true);
    }

    setIsChecking(false);
  }, [userA, userB, shortestPath]);

  useEffect(() => {
    setChecked(false);
    setResult(null);
  }, [userA, userB]);

  const handleSourceChange = useCallback(
    (value: string) => {
      setUserA(value);
      if (value === userB) {
        setUserB('');
      }
    },
    [userB]
  );

  const handleTargetChange = useCallback(
    (value: string) => {
      setUserB(value);
      if (value === userA) {
        setUserA('');
      }
    },
    [userA]
  );

  const showResult = checked;
  const isConnected = result && result.length > 0;
  const canCheck = userA && userB && !isChecking;

  return (
    <LayoutGroup>
      <motion.div
        className="connection-checker-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
        layout
      >
        <motion.div className="cc-header" layout>
          <div className="cc-header-left">
            <motion.div
              className="cc-header-icon"
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <Network size={16} strokeWidth={1.5} />
            </motion.div>
            <div>
              <h3 className="cc-header-title">Connection Checker</h3>
              <p className="cc-header-subtitle">
                Find the shortest path between any two nodes
              </p>
            </div>
          </div>

          {checked && (
            <motion.div
              className={`cc-status-badge ${isConnected ? 'connected' : 'disconnected'}`}
              initial={{ opacity: 0, scale: 0, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={springBouncy}
            >
              {isConnected ? (
                <CheckCircle size={12} />
              ) : (
                <XCircle size={12} />
              )}
              <span>{isConnected ? 'Connected' : 'No Path'}</span>
            </motion.div>
          )}
        </motion.div>

        <motion.div className="cc-selection" layout>
          <div className="cc-select-group">
            <div className="cc-select-label">
              <Target size={11} />
              <span>Source Node</span>
            </div>
            <UserSelect
              value={userA}
              onChange={handleSourceChange}
              placeholder="Select source..."
            />
          </div>

          <motion.div
            className="cc-swap-icon"
            whileHover={{ rotate: 180, scale: 1.2 }}
            transition={{ duration: 0.4 }}
          >
            <ArrowRight size={16} />
          </motion.div>

          <div className="cc-select-group">
            <div className="cc-select-label">
              <MapPin size={11} />
              <span>Target Node</span>
            </div>
            <UserSelect
              value={userB}
              onChange={handleTargetChange}
              placeholder="Select target..."
            />
          </div>

          <motion.button
            className={`cc-check-btn ${!canCheck ? 'disabled' : ''}`}
            onClick={handleCheck}
            disabled={!canCheck}
            variants={ANIMATION_VARIANTS.checkButton}
            whileHover={canCheck ? 'hover' : undefined}
            whileTap={canCheck ? 'tap' : undefined}
            layout
          >
            {isChecking ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 size={14} />
                </motion.div>
                <span>Checking...</span>
              </>
            ) : (
              <>
                <Route size={14} />
                <span>Find Path</span>
              </>
            )}
          </motion.button>
        </motion.div>

        <AnimatePresence mode="wait">
          {showResult && isConnected ? (
            <ConnectedResult
              key="connected"
              userA={userA}
              userB={userB}
              path={result}
              getUserName={getUserName}
              getUserAvatar={getUserAvatar}
            />
          ) : showResult && !isConnected ? (
            <DisconnectedResult
              key="disconnected"
              userA={userA}
              userB={userB}
              getUserName={getUserName}
              getUserAvatar={getUserAvatar}
            />
          ) : (
            <EmptyState key="empty" />
          )}
        </AnimatePresence>

        <motion.div
          className="cc-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          >
            <Zap size={10} />
          </motion.div>
          <span>Shortest path calculated using BFS algorithm</span>
        </motion.div>
      </motion.div>
    </LayoutGroup>
  );
}