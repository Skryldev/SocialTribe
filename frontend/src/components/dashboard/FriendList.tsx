import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
} from 'framer-motion';
import {
  Users,
  UserPlus,
  Sparkles,
  Zap,
  User,
  Network,
  Handshake,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { useNetwork } from './NetworkContext';
import UserSelect from './UserSelect';
import './FriendList.css';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 25 };
const springBouncy = { type: 'spring' as const, stiffness: 500, damping: 20 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 28 };

const MOTION_VARIANTS: any = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.1 },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },

  tableRow: {
    hidden: (_i: number) => ({
      opacity: 0,
      y: 15,
      scale: 0.95,
    }),
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.04,
        ...springSnappy,
      },
    }),
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 },
    },
    hover: {
      backgroundColor: 'rgba(245, 158, 11, 0.06)',
      boxShadow: 'inset 3px 0 0 rgba(245, 158, 11, 0.5)',
      transition: { duration: 0.2 },
    },
  },

  statsBar: {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.4 },
    },
  },

  heartPulse: {
    rest: { scale: 1 },
    hover: { scale: 1.3, color: '#ef4444', transition: springBouncy },
  },

  float: {
    animate: {
      y: [0, -6, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
  },

  sparkle: {
    animate: {
      rotate: [0, 180, 360],
      scale: [1, 1.15, 1],
      transition: { duration: 3, repeat: Infinity, ease: 'linear' },
    },
  },
};

interface StatsBarProps {
  user: any;
  friendCount: number;
}

const StatsBar = React.memo(({ user, friendCount }: StatsBarProps) => {
  return (
    <motion.div
      className="stats-bar"
      variants={MOTION_VARIANTS.statsBar}
      initial="hidden"
      animate="visible"
      layout
    >
      <div className="stats-user-info">
        <div className="stats-avatar">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="stats-user-details">
          <span className="stats-user-name">{user?.name}</span>
          <span className="stats-user-label">Selected User</span>
        </div>
      </div>

      <div className="stats-divider" />

      <div className="stats-metrics">
        <div className="stats-metric">
          <UserPlus size={14} />
          <div>
            <motion.span
              className="stats-metric-value"
              key={friendCount}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={springBouncy}
            >
              {friendCount}
            </motion.span>
            <span className="stats-metric-label">Friends</span>
          </div>
        </div>
        <div className="stats-metric">
          <Zap size={14} />
          <div>
            <span className="stats-metric-value">{friendCount}</span>
            <span className="stats-metric-label">Degree</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

StatsBar.displayName = 'StatsBar';

interface EmptyStateProps {
  type: string;
  userName?: string;
}

const EmptyState = React.memo(({ type, userName }: EmptyStateProps) => {
  const configs: any = {
    'no-user': {
      icon: Users,
      title: 'Select a user',
      description: 'Choose a node to explore their connections',
      color: '#f59e0b',
    },
    'no-friends': {
      icon: User,
      title: `${userName || 'This user'} has no connections`,
      description: 'This node is isolated in the network',
      color: '#fbbf24',
    },
  };

  const config = configs[type] || configs['no-user'];
  const Icon = config.icon;

  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springGentle}
    >
      <motion.div
        className="empty-icon-wrap"
        variants={MOTION_VARIANTS.float}
        animate="animate"
      >
        <Icon size={32} strokeWidth={1.5} color={config.color} />
      </motion.div>
      <h3 className="empty-title">{config.title}</h3>
      <p className="empty-description">{config.description}</p>
    </motion.div>
  );
});

EmptyState.displayName = 'EmptyState';

interface FriendListProps {
  onSelectPair?: (a: string, b: string) => void;
}

export default function FriendList({ onSelectPair }: FriendListProps): React.ReactElement {
  const { users, getFriends } = useNetwork() as any;
  const [userId, setUserId] = useState<string>('');
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [sorting, setSorting] = useState<any[]>([]);
  const tableRef = useRef<any>(null);

  const friends = useMemo(() => {
    if (!userId) return [];
    
    try {
      const friendIds = getFriends(userId);
      
      if (!friendIds || !Array.isArray(friendIds)) {
        console.warn('getFriends did not return an array for userId:', userId);
        return [];
      }
      
      const friendUsers = friendIds
        .map((id: string) => {
          const user = users.find((u: any) => u.id === id);
          if (!user) {
            console.warn(`User not found for friend id: ${id}`);
          }
          return user;
        })
        .filter(Boolean);
      
      console.log(`Found ${friendUsers.length} friends for user ${userId}:`, friendUsers);
      return friendUsers;
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  }, [userId, users, getFriends]);

  const selectedUser = useMemo(
    () => users.find((u: any) => u.id === userId),
    [userId, users]
  );

  useEffect(() => {
    if (userId) {
      console.log('Selected user:', selectedUser);
      console.log('Friends found:', friends.length, friends);
    }
  }, [userId, selectedUser, friends]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }: any) => (
          <button
            className="col-header-btn"
            onClick={() => column.toggleSorting()}
          >
            <span>Friend Name</span>
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp size={12} />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown size={12} />
            ) : (
              <ArrowUpDown size={12} />
            )}
          </button>
        ),
        cell: ({ row }: any) => (
          <div className="friend-name-cell">
            <motion.div
              className="friend-avatar-sm"
              whileHover={{ scale: 1.15, rotate: 5 }}
              transition={springBouncy}
            >
              {row.original.name?.charAt(0).toUpperCase()}
            </motion.div>
            <span className="friend-name-text">{row.original.name}</span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="col-header-actions">Connect</span>,
        cell: ({ row }: any) => (
          <motion.button
            className="connect-btn"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelectPair?.(userId, row.original.id);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Handshake size={12} />
            <span>Analyze</span>
          </motion.button>
        ),
      },
    ],
    [userId, onSelectPair]
  );

  const table = useReactTable({
    data: friends,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    globalFilterFn: (row: any, _columnId: string, value: string) => {
      const name = row.getValue('name');
      return String(name).toLowerCase().includes(value.toLowerCase());
    },
  });

  const handleRowClick = useCallback(
    (friendId: string) => {
      if (onSelectPair && userId) {
        onSelectPair(userId, friendId);
      }
    },
    [onSelectPair, userId]
  );

  return (
    <LayoutGroup>
      <motion.div
        ref={tableRef}
        className="friend-list-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
        layout
      >
        <motion.div className="friend-header" layout>
          <div className="header-left">
            <motion.div
              className="header-icon"
              whileHover={{ rotate: [0, -10, 10, 0] }}
            >
              <Users size={16} strokeWidth={1.5} />
            </motion.div>
            <div>
              <h3 className="header-title">Friend Network</h3>
              <p className="header-subtitle">Explore connections</p>
            </div>
          </div>

          <AnimatePresence>
            {userId && friends.length > 0 && (
              <motion.div
                className="header-count-badge"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={springBouncy}
              >
                <Network size={12} />
                <span>{friends.length}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="user-selector-area">
          <UserSelect
            value={userId}
            onChange={setUserId}
            placeholder="Select a user to explore friends..."
          />
        </div>

        <AnimatePresence mode="wait">
          {!userId ? (
            <EmptyState key="no-user" type="no-user" />
          ) : friends.length === 0 ? (
            <EmptyState
              key="no-friends"
              type="no-friends"
              userName={selectedUser?.name}
            />
          ) : (
            <motion.div
              key="friends-table-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StatsBar
                user={selectedUser}
                friendCount={friends.length}
              />

              <div className="friend-search-bar">
                <Search size={13} className="search-icon-left" />
                <input
                  type="text"
                  className="friend-search-input"
                  placeholder="Filter friends..."
                  value={globalFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                />
                {globalFilter && (
                  <motion.button
                    className="search-clear-btn"
                    onClick={() => setGlobalFilter('')}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <X size={12} />
                  </motion.button>
                )}
              </div>

              <div className="friend-table-scroll">
                <table className="friend-table">
                  <thead>
                    {table.getHeaderGroups().map((hg: any) => (
                      <tr key={hg.id}>
                        {hg.headers.map((header: any) => (
                          <th key={header.id}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <motion.tbody
                    variants={MOTION_VARIANTS.container}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence>
                      {table.getRowModel().rows.map((row: any, index: number) => (
                        <motion.tr
                          key={row.id}
                          variants={MOTION_VARIANTS.tableRow}
                          custom={index}
                          whileHover="hover"
                          onClick={() => handleRowClick(row.original.id)}
                          style={{ cursor: 'pointer' }}
                          layout
                        >
                          {row.getVisibleCells().map((cell: any) => (
                            <td key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </motion.tbody>
                </table>
              </div>

              <motion.div
                className="friend-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div variants={MOTION_VARIANTS.sparkle} animate="animate">
                  <Sparkles size={11} />
                </motion.div>
                <span>
                  {table.getFilteredRowModel().rows.length} of {friends.length} friends
                </span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Handshake size={12} />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}