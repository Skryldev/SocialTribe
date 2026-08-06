import React, { useRef, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useAnimation,
  useInView,
} from 'framer-motion';
import {
  Crown,
  Trophy,
  Award,
  Star,
  TrendingUp,
  Hash,
  Sparkles,
  Target,
} from 'lucide-react';
import './CentralityLeaderboard.css';

const springBouncy = { type: 'spring' as const, stiffness: 500, damping: 20 };
const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 25 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 28 };

const MOTION_VARIANTS: any = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  },

  row: {
    hidden: (i: number) => ({
      opacity: 0,
      x: i < 3 ? -40 : i % 2 === 0 ? 25 : -25,
      scale: 0.9,
    }),
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        delay: i * 0.05,
        ...springSnappy,
        mass: 0.8,
      },
    }),
    exit: {
      opacity: 0,
      x: -30,
      transition: { duration: 0.2 },
    },
  },

  topRank: {
    hidden: (i: number) => ({
      opacity: 0,
      scale: 1.3,
      rotate: i === 0 ? -10 : i === 2 ? 10 : 0,
    }),
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        delay: 0.2 + i * 0.15,
        ...springBouncy,
      },
    }),
  },

  rankHover: {
    rest: { scale: 1 },
    hover: {
      scale: 1.15,
      rotate: [0, -5, 5, 0],
      transition: { duration: 0.3 },
    },
  },

  valuePop: {
    hidden: { scale: 0.5, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { delay: 0.3, ...springBouncy },
    },
  },

  crownFloat: {
    animate: {
      y: [0, -3, 0],
      rotate: [0, 5, 0, -5, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
  },

  sparkle: {
    animate: {
      rotate: [0, 180, 360],
      scale: [1, 1.2, 1],
      transition: { duration: 3, repeat: Infinity, ease: 'linear' },
    },
  },

  emptyFloat: {
    animate: {
      y: [0, -6, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
  },
};

const RANK_CONFIG: any = {
  1: {
    icon: Crown,
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.2)',
    border: 'rgba(245, 158, 11, 0.4)',
    glow: '0 0 16px rgba(245, 158, 11, 0.3)',
    label: '1st',
  },
  2: {
    icon: Trophy,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.3)',
    glow: '0 0 10px rgba(148, 163, 184, 0.15)',
    label: '2nd',
  },
  3: {
    icon: Award,
    color: '#d97706',
    bg: 'rgba(180, 83, 9, 0.18)',
    border: 'rgba(180, 83, 9, 0.3)',
    glow: '0 0 10px rgba(180, 83, 9, 0.2)',
    label: '3rd',
  },
  default: {
    icon: Hash,
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.1)',
    border: 'rgba(100, 116, 139, 0.15)',
    glow: 'none',
    label: '',
  },
};

interface RankBadgeProps {
  rank: number;
}

const RankBadge = React.memo(({ rank }: RankBadgeProps) => {
  const isTop3 = rank <= 3;
  const config = RANK_CONFIG[rank] || RANK_CONFIG.default;
  const Icon = config.icon;

  return (
    <motion.div
      className={`rank-badge ${isTop3 ? `rank-top rank-${rank}` : 'rank-normal'}`}
      style={{
        '--rank-color': config.color,
        '--rank-bg': config.bg,
        '--rank-border': config.border,
        '--rank-glow': config.glow,
      } as React.CSSProperties}
      variants={isTop3 ? MOTION_VARIANTS.topRank : undefined}
      custom={rank - 1}
      initial={isTop3 ? 'hidden' : undefined}
      animate={isTop3 ? 'visible' : undefined}
      whileHover="hover"
      layout
    >
      {isTop3 && rank === 1 && (
        <motion.div
          className="rank-sparkle"
          variants={MOTION_VARIANTS.crownFloat}
          animate="animate"
        >
          <Sparkles size={8} />
        </motion.div>
      )}
      <Icon size={isTop3 ? 14 : 11} strokeWidth={2} />
      <span className="rank-number">{rank}</span>
    </motion.div>
  );
});

RankBadge.displayName = 'RankBadge';

interface LeaderboardItem {
  id?: string;
  name?: string;
  value?: number;
}

interface LeaderboardRowProps {
  item: LeaderboardItem;
  index: number;
}

const LeaderboardRow = React.memo(({ item, index }: LeaderboardRowProps) => {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  const rank = index + 1;
  const value = item.value !== undefined && item.value !== null
    ? Number(item.value).toFixed(4)
    : '0.0000';

  return (
    <motion.div
      ref={ref}
      className={`leaderboard-item ${rank <= 3 ? 'item-top-rank' : ''}`}
      variants={MOTION_VARIANTS.row}
      initial="hidden"
      animate={controls}
      custom={index}
      whileHover={{
        backgroundColor: 'rgba(245, 158, 11, 0.06)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        boxShadow: 'inset 3px 0 0 rgba(245, 158, 11, 0.5)',
        transition: { duration: 0.2 },
      }}
      layout
    >
      <div className="item-rank">
        <RankBadge rank={rank} />
      </div>

      <div className="item-info">
        <span className="item-name" title={item.name || item.id}>
          {item.name || item.id || 'Unknown'}
        </span>
        {item.id && item.name && item.id !== item.name && (
          <span className="item-id">{item.id}</span>
        )}
      </div>

      <motion.div
        className="item-value"
        variants={MOTION_VARIANTS.valuePop}
        initial="hidden"
        animate={controls}
      >
        <span className="value-number">{value}</span>
      </motion.div>

      {rank <= 3 && (
        <div className="item-progress">
          <div
            className="item-progress-bar"
            style={{
              width: `${rank === 1 ? 100 : rank === 2 ? 75 : 50}%`,
            }}
          />
        </div>
      )}
    </motion.div>
  );
});

LeaderboardRow.displayName = 'LeaderboardRow';

interface EmptyStateProps {
  title: string;
}

const EmptyState = React.memo(({ title }: EmptyStateProps) => {
  return (
    <motion.div
      className="leaderboard-empty"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springGentle}
    >
      <motion.div
        className="empty-icon-wrap"
        variants={MOTION_VARIANTS.emptyFloat}
        animate="animate"
      >
        <Target size={32} strokeWidth={1.5} />
      </motion.div>
      <p className="empty-text">No data available</p>
      <span className="empty-subtitle">{title} — waiting for data</span>
    </motion.div>
  );
});

EmptyState.displayName = 'EmptyState';

interface CentralityLeaderboardProps {
  data?: LeaderboardItem[];
  title?: string;
  colorScheme?: string;
}

export default function CentralityLeaderboard({
  data = [],
  title = 'Leaderboard',
  colorScheme = 'amber',
}: CentralityLeaderboardProps): React.ReactElement {
  if (!data || data.length === 0) {
    return (
      <motion.div
        className={`centrality-leaderboard scheme-${colorScheme}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
      >
        <div className="leaderboard-header">
          <div className="header-left">
            <div className="header-icon">
              <TrendingUp size={14} strokeWidth={1.5} />
            </div>
            <h3 className="leaderboard-title">{title}</h3>
          </div>
        </div>
        <EmptyState title={title} />
      </motion.div>
    );
  }

  return (
    <LayoutGroup>
      <motion.div
        className={`centrality-leaderboard scheme-${colorScheme}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
        layout
      >
        <motion.div className="leaderboard-header" layout>
          <div className="header-left">
            <motion.div
              className="header-icon"
              whileHover={{ rotate: [0, -8, 8, 0] }}
            >
              <TrendingUp size={14} strokeWidth={1.5} />
            </motion.div>
            <h3 className="leaderboard-title">{title}</h3>
          </div>

          <motion.div
            className="header-count"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, ...springBouncy } as any}
          >
            <Star size={10} />
            <span>{data.length} entries</span>
          </motion.div>
        </motion.div>

        <div className="leaderboard-scroll">
          <motion.div
            className="leaderboard-list"
            variants={MOTION_VARIANTS.container}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {data.map((item: LeaderboardItem, index: number) => (
                <LeaderboardRow
                  key={item.id || index}
                  item={item}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        <motion.div
          className="leaderboard-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            variants={MOTION_VARIANTS.sparkle}
            animate="animate"
          >
            <Sparkles size={10} />
          </motion.div>
          <span>Sorted by centrality score</span>
        </motion.div>
      </motion.div>
    </LayoutGroup>
  );
}