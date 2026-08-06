import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
} from 'framer-motion';
import { useNetwork } from './NetworkContext';
import UserSelect from './UserSelect';
import {
  Users,
  Heart,
  Sparkles,
  Zap,
  UserPlus,
  UserCheck,
  Shield,
  Handshake,
  GitMerge,
  UserX,
  Search,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import './CommonFriends.css';

const springBouncy = { type: 'spring' as const, stiffness: 500, damping: 20 };
const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 25 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 28 };

const MOTION_VARIANTS: any = {
  contentFade: {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.08 },
    },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  },

  statsContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  },

  statCard: {
    hidden: (i: number) => ({
      opacity: 0,
      y: 20,
      x: i === 0 ? -20 : i === 2 ? 20 : 0,
    }),
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        delay: 0.1 + i * 0.1,
        ...springSnappy,
      },
    }),
  },

  friendBadge: {
    hidden: (i: number) => ({
      opacity: 0,
      scale: 0.7,
      y: 15,
      rotate: i % 2 === 0 ? -8 : 8,
    }),
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      rotate: 0,
      transition: {
        delay: 0.2 + i * 0.05,
        ...springBouncy,
      },
    }),
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 },
    },
    hover: {
      scale: 1.05,
      y: -3,
      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.2)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 },
    },
  },

  heartBeat: {
    animate: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 1,
      },
    },
  },

  emptyFloat: {
    animate: {
      y: [0, -6, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
  },

  sectionHeader: {
    hidden: { opacity: 0, x: -15 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { delay: 0.2, duration: 0.3 },
    },
  },

  sparkle: {
    animate: {
      rotate: [0, 180, 360],
      scale: [1, 1.2, 1],
      transition: { duration: 3, repeat: Infinity, ease: 'linear' },
    },
  },
};

interface StatCardProps {
  value: number;
  label: string;
  icon: LucideIcon;
  color: string;
  index: number;
  isHighlighted?: boolean;
}

const StatCard = React.memo(({ value, label, icon: Icon, color, index, isHighlighted }: StatCardProps) => {
  return (
    <motion.div
      className={`stat-card ${isHighlighted ? 'highlighted' : ''}`}
      variants={MOTION_VARIANTS.statCard}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2, scale: 1.02 }}
      style={{ '--stat-color': color } as React.CSSProperties}
    >
      <motion.div
        className="stat-card-icon"
        style={{ background: `${color}18`, color }}
        whileHover={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 0.3 }}
      >
        <Icon size={14} strokeWidth={1.5} />
      </motion.div>
      <div className="stat-card-info">
        <motion.span
          className="stat-card-value"
          key={value}
          initial={{ scale: 1.3, color }}
          animate={{ scale: 1, color: '#f1f5f9' }}
          transition={springBouncy}
        >
          {value}
        </motion.span>
        <span className="stat-card-label">{label}</span>
      </div>
      {isHighlighted && (
        <motion.div
          className="stat-card-glow"
          variants={MOTION_VARIANTS.heartBeat}
          animate="animate"
        >
          <Heart size={9} color={color} fill={color} />
        </motion.div>
      )}
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

interface FriendBadgeProps {
  friend: { id: string; name: string };
  index: number;
}

const FriendBadge = React.memo(({ friend, index }: FriendBadgeProps) => {
  return (
    <motion.div
      className="friend-badge"
      variants={MOTION_VARIANTS.friendBadge}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      layout
    >
      <div className="friend-badge-avatar">
        {friend.name.charAt(0).toUpperCase()}
      </div>
      <div className="friend-badge-info">
        <span className="friend-badge-name">{friend.name}</span>
        <span className="friend-badge-relation">Mutual Friend</span>
      </div>
      <motion.div
        className="friend-badge-arrow"
        initial={{ opacity: 0, x: -5 }}
        whileHover={{ opacity: 1, x: 0 }}
      >
        <ChevronRight size={12} />
      </motion.div>
    </motion.div>
  );
});

FriendBadge.displayName = 'FriendBadge';

interface NoMutualEmptyProps {
  userAName: string;
  userBName: string;
}

const NoMutualEmpty = React.memo(({ userAName, userBName }: NoMutualEmptyProps) => {
  return (
    <motion.div
      className="no-mutual-state"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, ...springGentle }}
    >
      <motion.div
        className="no-mutual-icon-wrap"
        variants={MOTION_VARIANTS.emptyFloat}
        animate="animate"
      >
        <div className="no-mutual-icon">
          <UserX size={28} strokeWidth={1.5} />
        </div>
      </motion.div>
      <h4 className="no-mutual-title">No Mutual Friends</h4>
      <p className="no-mutual-description">
        <strong>{userAName}</strong> and <strong>{userBName}</strong> don't share
        any common connections
      </p>
    </motion.div>
  );
});

NoMutualEmpty.displayName = 'NoMutualEmpty';

const SelectUsersEmpty = React.memo(() => {
  return (
    <motion.div
      className="select-users-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <motion.div
        className="select-users-icon-wrap"
        variants={MOTION_VARIANTS.emptyFloat}
        animate="animate"
      >
        <div className="select-users-icon">
          <Search size={28} strokeWidth={1.5} />
        </div>
        <motion.div
          className="select-users-sparkle"
          variants={MOTION_VARIANTS.sparkle}
          animate="animate"
        >
          <Sparkles size={14} />
        </motion.div>
      </motion.div>
      <h3 className="select-users-title">Find Mutual Friends</h3>
      <p className="select-users-description">
        Select two users to discover their shared connections
      </p>
    </motion.div>
  );
});

SelectUsersEmpty.displayName = 'SelectUsersEmpty';

export default function CommonFriends(): React.ReactElement {
  const { users, getFriends } = useNetwork() as any;
  const [userA, setUserA] = useState<string>('');
  const [userB, setUserB] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  const mutualData = useMemo(() => {
    if (!userA || !userB) {
      return { common: [], friendsA: [], friendsB: [], userAData: null, userBData: null };
    }

    try {
      const friendsOfA = getFriends(userA) || [];
      const friendsOfB = getFriends(userB) || [];
      
      const setA = new Set(friendsOfA);
      const setB = new Set(friendsOfB);
      
      const commonIds = [...setA].filter((id: any) => setB.has(id));

      const userAData = users.find((u: any) => u.id === userA);
      const userBData = users.find((u: any) => u.id === userB);

      console.log('Common friends found:', commonIds.length, commonIds);

      return {
        common: commonIds,
        friendsA: friendsOfA,
        friendsB: friendsOfB,
        userAData,
        userBData,
      };
    } catch (error) {
      console.error('Error computing mutual friends:', error);
      return { common: [], friendsA: [], friendsB: [], userAData: null, userBData: null };
    }
  }, [userA, userB, getFriends, users]);

  const commonFriendsList = useMemo(() => {
    return mutualData.common.map((id: any) => {
      const user = users.find((u: any) => u.id === id);
      return { id, name: user?.name || String(id) };
    });
  }, [mutualData.common, users]);

  const hasBothUsers = userA && userB;

  const handleUserAChange = useCallback(
    (value: string) => {
      setUserA(value);
      if (value === userB) setUserB('');
    },
    [userB]
  );

  const handleUserBChange = useCallback(
    (value: string) => {
      setUserB(value);
      if (value === userA) setUserA('');
    },
    [userA]
  );

  return (
    <LayoutGroup>
      <motion.div
        className="common-friends-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
        layout
      >
        <motion.div className="cf-header" layout>
          <div className="cf-header-left">
            <motion.div
              className="cf-header-icon"
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <Shield size={16} strokeWidth={1.5} />
            </motion.div>
            <div>
              <h3 className="cf-header-title">Mutual Friends</h3>
              <p className="cf-header-subtitle">
                Discover shared connections between nodes
              </p>
            </div>
          </div>

          <AnimatePresence>
            {hasBothUsers && mutualData.common.length > 0 && (
              <motion.div
                className="cf-mutual-badge"
                initial={{ opacity: 0, scale: 0, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={springBouncy}
              >
                <Heart size={12} fill="#fbbf24" />
                <span>{mutualData.common.length} mutual</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div className="cf-selection" layout>
          <div className="cf-select-group">
            <div className="cf-select-label">
              <UserPlus size={11} />
              <span>First User</span>
            </div>
            <UserSelect
              value={userA}
              onChange={handleUserAChange}
              placeholder="Select first user..."
            />
          </div>

          <motion.div
            className="cf-connector"
            whileHover={{ scale: 1.2, rotate: 180 }}
            transition={{ duration: 0.4 }}
          >
            <GitMerge size={16} />
          </motion.div>

          <div className="cf-select-group">
            <div className="cf-select-label">
              <UserCheck size={11} />
              <span>Second User</span>
            </div>
            <UserSelect
              value={userB}
              onChange={handleUserBChange}
              placeholder="Select second user..."
            />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {hasBothUsers ? (
            <motion.div
              key="results"
              ref={contentRef}
              className="cf-content"
              variants={MOTION_VARIANTS.contentFade}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <motion.div
                className="cf-stats-row"
                variants={MOTION_VARIANTS.statsContainer}
              >
                <StatCard
                  value={mutualData.friendsA.length}
                  label="Connections"
                  icon={Users}
                  color="#f59e0b"
                  index={0}
                />
                <StatCard
                  value={mutualData.common.length}
                  label="Mutual"
                  icon={Heart}
                  color="#fbbf24"
                  index={1}
                  isHighlighted
                />
                <StatCard
                  value={mutualData.friendsB.length}
                  label="Connections"
                  icon={Users}
                  color="#f59e0b"
                  index={2}
                />
              </motion.div>

              <motion.div
                className="cf-users-compare"
                variants={MOTION_VARIANTS.sectionHeader}
              >
                <div className="cf-user-tag">
                  <div className="cf-user-tag-avatar source">
                    {mutualData.userAData?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="cf-user-tag-name">
                    {mutualData.userAData?.name}
                  </span>
                </div>
                <span className="cf-user-tag-divider">&</span>
                <div className="cf-user-tag">
                  <div className="cf-user-tag-avatar target">
                    {mutualData.userBData?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="cf-user-tag-name">
                    {mutualData.userBData?.name}
                  </span>
                </div>
              </motion.div>

              <div className="cf-mutual-section">
                <motion.div
                  className="cf-section-header"
                  variants={MOTION_VARIANTS.sectionHeader}
                >
                  <div className="cf-section-title">
                    <Handshake size={13} />
                    <span>Shared Connections</span>
                  </div>
                  <span className="cf-section-count">
                    {commonFriendsList.length} friend{commonFriendsList.length !== 1 ? 's' : ''}
                  </span>
                </motion.div>

                <AnimatePresence mode="wait">
                  {commonFriendsList.length > 0 ? (
                    <motion.div
                      key="friends-grid"
                      className="cf-friends-grid"
                      variants={MOTION_VARIANTS.statsContainer}
                      initial="hidden"
                      animate="visible"
                    >
                      {commonFriendsList.map((friend: { id: string; name: string }, idx: number) => (
                        <FriendBadge
                          key={friend.id}
                          friend={friend}
                          index={idx}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <NoMutualEmpty
                      key="no-mutual"
                      userAName={mutualData.userAData?.name || ''}
                      userBName={mutualData.userBData?.name || ''}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <SelectUsersEmpty key="select-users" />
          )}
        </AnimatePresence>

        <motion.div
          className="cf-footer"
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
          <span>Mutual friends = intersection of both users' connections</span>
        </motion.div>
      </motion.div>
    </LayoutGroup>
  );
}