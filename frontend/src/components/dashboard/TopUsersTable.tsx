import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup, useAnimation, useInView } from 'framer-motion';
import {
  Search,
  TrendingUp,
  Medal,
  Star,
  Crown,
  Trophy,
  Award,
  Hash,
  BarChart3,
  Sparkles,
  X,
} from 'lucide-react';
import { useNetwork } from './NetworkContext';
import './TopUsersTable.css';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 25 };
const springBouncy = { type: 'spring' as const, stiffness: 500, damping: 20 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 28 };

const MOTION_VARIANTS: any = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.15,
        when: 'beforeChildren',
      },
    },
  },

  row: {
    hidden: (i: number) => ({
      opacity: 0,
      x: i < 3 ? -40 : i % 2 === 0 ? 30 : -30,
      scale: 0.92,
      filter: 'blur(3px)',
    }),
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        delay: i * 0.05,
        ...springSnappy,
        mass: 0.7,
      },
    }),
    exit: {
      opacity: 0,
      x: -50,
      scale: 0.9,
      transition: { duration: 0.25 },
    },
  },

  topRank: {
    hidden: (i: number) => ({
      opacity: 0,
      y: -30,
      scale: 1.2,
      rotate: i === 0 ? -8 : i === 2 ? 8 : 0,
    }),
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: {
        delay: i * 0.15 + 0.3,
        ...springBouncy,
        duration: 0.7,
      },
    }),
  },

  progressBar: {
    hidden: { width: 0, opacity: 0 },
    visible: (width: number) => ({
      width: `${width}%`,
      opacity: 1,
      transition: {
        delay: 0.4,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  },

  badgePop: {
    hidden: { opacity: 0, scale: 0, rotate: -30 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        ...springBouncy,
        delay: 0.5,
      },
    },
  },

  statItem: {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.2 + i * 0.1, duration: 0.4 },
    }),
  },

  hover: {
    rest: { scale: 1, boxShadow: '0 0 0 rgba(245, 158, 11, 0)' },
    hover: {
      scale: 1.01,
      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.12)',
      transition: { duration: 0.25 },
    },
  },

  crownFloat: {
    animate: {
      y: [0, -4, 0],
      rotate: [0, 5, 0, -5, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },

  emptyFloat: {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
};

const RANK_CONFIG: any = {
  1: {
    icon: Crown,
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.18)',
    border: 'rgba(245, 158, 11, 0.35)',
    gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
    label: '1st',
  },
  2: {
    icon: Trophy,
    color: '#9ca3af',
    bg: 'rgba(156, 163, 175, 0.15)',
    border: 'rgba(156, 163, 175, 0.3)',
    gradient: 'linear-gradient(135deg, #d1d5db, #9ca3af, #6b7280)',
    label: '2nd',
  },
  3: {
    icon: Award,
    color: '#cd7a32',
    bg: 'rgba(180, 83, 9, 0.15)',
    border: 'rgba(180, 83, 9, 0.3)',
    gradient: 'linear-gradient(135deg, #d97706, #b45309, #92400e)',
    label: '3rd',
  },
  default: {
    icon: Hash,
    color: '#94a3b8',
    bg: 'rgba(100, 116, 139, 0.1)',
    border: 'rgba(100, 116, 139, 0.2)',
    gradient: 'transparent',
    label: '',
  },
};

interface RankBadgeProps {
  rank: number;
  isTop3: boolean;
}

const RankBadge = React.memo(({ rank, isTop3 }: RankBadgeProps) => {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.default;
  const Icon = config.icon;
  
  return (
    <motion.div
      className="rank-badge"
      style={{
        '--rank-color': config.color,
        '--rank-bg': config.bg,
        '--rank-border': config.border,
        '--rank-gradient': config.gradient,
      } as React.CSSProperties}
      variants={isTop3 ? MOTION_VARIANTS.topRank : undefined}
      custom={rank - 1}
      initial={isTop3 ? 'hidden' : undefined}
      animate={isTop3 ? 'visible' : undefined}
      whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
      transition={springBouncy}
      layout
    >
      {isTop3 && (
        <motion.div
          variants={MOTION_VARIANTS.crownFloat}
          animate="animate"
          className="rank-glow"
        >
          <Sparkles size={8} />
        </motion.div>
      )}
      <Icon size={isTop3 ? 16 : 13} strokeWidth={2} />
      <span className="rank-number">{rank}</span>
    </motion.div>
  );
});

RankBadge.displayName = 'RankBadge';

interface DegreeBarProps {
  degree: number;
  maxDegree: number;
  isTop3: boolean;
}

const DegreeBar = React.memo(({ degree, maxDegree, isTop3 }: DegreeBarProps) => {
  const percentage = maxDegree > 0 ? (degree / maxDegree) * 100 : 0;
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return (
    <div className="degree-container" ref={ref}>
      <div className="degree-header">
        <motion.span
          className="degree-value"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, ...springBouncy }}
        >
          {degree.toLocaleString()}
        </motion.span>
        <motion.span
          className="degree-label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          connections
        </motion.span>
      </div>
      <div className="degree-bar-track">
        <motion.div
          className={`degree-bar-fill ${isTop3 ? 'top-rank-bar' : ''}`}
          variants={MOTION_VARIANTS.progressBar}
          initial="hidden"
          animate={controls}
          custom={percentage}
          style={{
            '--bar-percentage': `${percentage}%`,
            background: isTop3
              ? `linear-gradient(90deg, ${RANK_CONFIG[isTop3 ? 1 : 4]?.color || '#f59e0b'}, ${RANK_CONFIG[isTop3 ? 1 : 4]?.color || '#ea580c'}88)`
              : 'linear-gradient(90deg, #f59e0b, #ea580c)',
          } as React.CSSProperties}
        >
          <motion.div
            className="degree-bar-shimmer"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      </div>
    </div>
  );
});

DegreeBar.displayName = 'DegreeBar';

interface PercentageBadgeProps {
  percentage: string;
  isTop3: boolean;
}

const PercentageBadge = React.memo(({ percentage, isTop3 }: PercentageBadgeProps) => {
  return (
    <motion.div
      className={`percentage-badge ${isTop3 ? 'percentage-badge-top' : ''}`}
      variants={MOTION_VARIANTS.badgePop}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.08 }}
      transition={springBouncy}
      layout
    >
      <BarChart3 size={10} />
      <span>{percentage}%</span>
    </motion.div>
  );
});

PercentageBadge.displayName = 'PercentageBadge';

interface EmptyStateProps {
  onClear: () => void;
}

const EmptyState = React.memo(({ onClear }: EmptyStateProps) => (
  <motion.div
    className="empty-state-container"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={springGentle}
  >
    <motion.div
      variants={MOTION_VARIANTS.emptyFloat}
      animate="animate"
      className="empty-icon-wrapper"
    >
      <Search size={40} strokeWidth={1} className="empty-icon" />
    </motion.div>
    <motion.h3
      className="empty-title"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      No users match your search
    </motion.h3>
    <motion.p
      className="empty-description"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Try a different name or{' '}
      <motion.button
        className="empty-clear-link"
        onClick={onClear}
        whileHover={{ scale: 1.05, color: '#f59e0b' }}
        whileTap={{ scale: 0.95 }}
      >
        clear the search
      </motion.button>
    </motion.p>
  </motion.div>
));

EmptyState.displayName = 'EmptyState';

interface TableRowProps {
  user: any;
  maxDegree: number;
  onSelectUser?: (id: string) => void;
  isTop3: boolean;
  index: number;
}

const TableRow = React.memo(({ user, maxDegree, onSelectUser, isTop3, index }: TableRowProps) => {
  const controls = useAnimation();
  const ref = useRef<HTMLTableRowElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return (
    <motion.tr
      ref={ref}
      className={`leaderboard-row ${isTop3 ? 'top-rank-row' : ''}`}
      variants={{
        hidden: MOTION_VARIANTS.row.hidden,
        visible: MOTION_VARIANTS.row.visible,
        hover: {
          backgroundColor: isTop3
            ? 'rgba(245, 158, 11, 0.08)'
            : 'rgba(245, 158, 11, 0.04)',
          scale: 1.002,
          transition: { duration: 0.2 },
        },
      }}
      initial="hidden"
      animate={controls}
      custom={index}
      whileHover="hover"
      onClick={() => onSelectUser?.(user.id)}
      title={`Click to inspect ${user.name}`}
      layout
      style={{ cursor: 'pointer' }}
    >
      <td className="cell-rank">
        <RankBadge rank={user.rank} isTop3={isTop3} />
      </td>

      <td className="cell-name">
        <div className="user-info">
          <motion.div
            className={`user-avatar ${isTop3 ? 'avatar-top' : ''}`}
            whileHover={{ 
              scale: 1.15, 
              rotate: 5,
              boxShadow: isTop3 
                ? '0 4px 15px rgba(245, 158, 11, 0.5)' 
                : '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}
            transition={springBouncy}
            layoutId={`avatar-${user.id}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </motion.div>
          <div className="user-name-container">
            <span className="user-name">{user.name}</span>
            {isTop3 && (
              <motion.span
                className="top-rank-label"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Sparkles size={10} />
                Top {user.rank}
              </motion.span>
            )}
          </div>
        </div>
      </td>

      <td className="cell-degree">
        <DegreeBar
          degree={user.degree}
          maxDegree={maxDegree}
          isTop3={isTop3}
        />
      </td>

      <td className="cell-percentage">
        <PercentageBadge
          percentage={user.percentage}
          isTop3={isTop3}
        />
      </td>
    </motion.tr>
  );
});

TableRow.displayName = 'TableRow';

interface TopUsersTableProps {
  onSelectUser?: (id: string) => void;
  limit?: number;
}

export default function TopUsersTable({ onSelectUser, limit = 20 }: TopUsersTableProps): React.ReactElement {
  const { getTopUsers } = useNetwork();
  const [search, setSearch] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const topUsers = useMemo(() => getTopUsers(limit), [getTopUsers, limit]);

  const filteredUsers = useMemo(
    () =>
      search.trim()
        ? topUsers.filter((u: any) =>
            u.name.toLowerCase().includes(search.toLowerCase())
          )
        : topUsers,
    [topUsers, search]
  );

  const maxDegree = useMemo(() => {
    if (filteredUsers.length === 0) return 1;
    return Math.max(...filteredUsers.map((u: any) => u.degree));
  }, [filteredUsers]);

  const handleClearSearch = useCallback(() => {
    setSearch('');
    searchInputRef.current?.focus();
  }, []);

  const footerStats = useMemo(
    () => [
      { icon: Star, label: 'Showing', value: `${filteredUsers.length} of ${topUsers.length}` },
      { icon: Medal, label: 'Top degree', value: maxDegree.toLocaleString() },
      { icon: TrendingUp, label: 'Total connections', value: topUsers.reduce((s: number, u: any) => s + u.degree, 0).toLocaleString() },
    ],
    [filteredUsers.length, topUsers.length, maxDegree, topUsers]
  );

  return (
    <LayoutGroup>
      <motion.div
        ref={tableRef}
        className="leaderboard-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ...springGentle } as any}
        layout
      >
        <motion.div className="leaderboard-header" layout>
          <div className="header-left">
            <motion.div
              className="header-icon-wrapper"
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <TrendingUp size={16} strokeWidth={1.5} />
            </motion.div>
            <div>
              <h3 className="header-title">Top Users Leaderboard</h3>
              <p className="header-subtitle">
                Most connected nodes by degree centrality
              </p>
            </div>
          </div>

          <div className="search-wrapper">
            <Search size={13} className="search-icon-left" />
            <motion.input
              ref={searchInputRef}
              className="search-input"
              placeholder="Search users..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              whileFocus={{
                borderColor: '#f59e0b',
                boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.1)',
              }}
              transition={{ duration: 0.2 }}
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  initial={{ opacity: 0, scale: 0, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0, rotate: 90 }}
                  whileHover={{ scale: 1.2, color: '#f59e0b' }}
                  whileTap={{ scale: 0.8 }}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {filteredUsers.length === 0 ? (
            <EmptyState key="empty" onClear={handleClearSearch} />
          ) : (
            <motion.div
              key="table-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="table-scroll-wrapper">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th className="col-rank">
                        <span>Rank</span>
                      </th>
                      <th className="col-name">
                        <span>User</span>
                      </th>
                      <th className="col-degree">
                        <span>Degree</span>
                      </th>
                      <th className="col-percentage">
                        <span>Share</span>
                      </th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={MOTION_VARIANTS.container}
                    initial="hidden"
                    animate="visible"
                    layout
                  >
                    <AnimatePresence>
                      {filteredUsers.map((user: any, index: number) => (
                        <TableRow
                          key={user.id}
                          user={user}
                          maxDegree={maxDegree}
                          onSelectUser={onSelectUser}
                          isTop3={user.rank <= 3}
                          index={index}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.tbody>
                </table>
              </div>

              <motion.div
                className="leaderboard-footer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <div className="footer-stats-row">
                  {footerStats.map((stat: any, i: number) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.label}
                        className="footer-stat-item"
                        variants={MOTION_VARIANTS.statItem}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        whileHover={{ scale: 1.03, y: -1 }}
                      >
                        <Icon size={11} />
                        <span className="footer-stat-label">{stat.label}</span>
                        <span className="footer-stat-value">{stat.value}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}