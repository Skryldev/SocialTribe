import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
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
  useAnimation,
  useInView,
} from 'framer-motion';
import {
  Download,
  Users,
  MapPin,
  Target,
  TrendingUp,
  Zap,
  BarChart3,
  Search,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  X,
  UserPlus,
  Infinity,
  Network,
  Route,
  GitBranch,
  Sparkles,
} from 'lucide-react';
import { useNetwork } from './NetworkContext';
import UserSelect from './UserSelect';
import './UserDistanceTable.css';

const springConfig = { type: 'spring' as const, stiffness: 400, damping: 30 };
const gentleSpring = { type: 'spring' as const, stiffness: 200, damping: 25 };
const bouncySpring = { type: 'spring' as const, stiffness: 500, damping: 20 };

const ANIMATION_VARIANTS: any = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.1,
        when: 'beforeChildren',
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2, when: 'afterChildren' },
    },
  },

  listItem: {
    hidden: { 
      opacity: 0, 
      y: 15, 
      scale: 0.97,
      filter: 'blur(2px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 28,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 },
    },
  },

  statsCard: {
    hidden: (i: number) => ({
      opacity: 0,
      x: i % 2 === 0 ? -30 : 30,
      scale: 0.9,
    }),
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        delay: i * 0.08,
        ...springConfig,
      },
    }),
  },

  fadeUp: {
    hidden: { opacity: 0, y: 8 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' },
    },
  },

  scaleBounce: {
    hover: { scale: 1.04, transition: bouncySpring },
    tap: { scale: 0.96, transition: springConfig },
  },

  badgePop: {
    hidden: { opacity: 0, scale: 0.5, rotate: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 450,
        damping: 22,
      },
    },
  },

  rowHover: {
    rest: { 
      backgroundColor: 'rgba(245, 158, 11, 0)',
      scale: 1,
    },
    hover: {
      backgroundColor: 'rgba(245, 158, 11, 0.05)',
      scale: 1.005,
      transition: { duration: 0.2 },
    },
  },

  floating: {
    animate: {
      y: [0, -8, 0],
      rotate: [0, 3, 0, -3, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },

  draw: {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay: 0.2, type: 'spring', duration: 1, bounce: 0 },
        opacity: { delay: 0.2, duration: 0.01 },
      },
    },
  },
};

const PAGINATION_SIZES = [10, 20, 50];

const DISTANCE_CONFIG: any = {
  1: { label: 'Direct', color: '#34d399', icon: GitBranch },
  2: { label: 'Close', color: '#fbbf24', icon: Route },
  3: { label: 'Medium', color: '#a78bfa', icon: Network },
  4: { label: 'Far', color: '#22d3ee', icon: Route },
  far: { label: 'Very Far', color: '#f97316', icon: Route },
  unreachable: { label: 'Unreachable', color: '#f87171', icon: Infinity },
};

const exportToCSV = (rows: any[], targetName: string): void => {
  const header = 'Name,Distance,Status';
  const lines = rows.map((r: any) => {
    const dist = r.distance === Infinity ? 'unreachable' : r.distance;
    const status = r.distance === Infinity ? 'Unreachable' : 'Reachable';
    return `"${r.name}",${dist},"${status}"`;
  });
  
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `distances-${targetName || 'source'}-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const getDistanceConfig = (distance: number): any => {
  if (distance === Infinity as any) return DISTANCE_CONFIG.unreachable;
  if (distance >= 5) return DISTANCE_CONFIG.far;
  return DISTANCE_CONFIG[distance] || DISTANCE_CONFIG.far;
};

interface DistanceBadgeProps {
  distance: number;
}

const DistanceBadge = React.memo(({ distance }: DistanceBadgeProps) => {
  const config = getDistanceConfig(distance);
  const Icon = config.icon;
  
  return (
    <motion.div
      className="dist-badge"
      style={{
        '--bd-color': config.color,
        '--bd-bg': `${config.color}15`,
        '--bd-border': `${config.color}30`,
      } as React.CSSProperties}
      variants={ANIMATION_VARIANTS.badgePop}
      initial="hidden"
      animate="visible"
      whileHover={{
        scale: 1.08,
        boxShadow: `0 0 12px ${config.color}40`,
        transition: bouncySpring,
      }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity as any, repeatDelay: 3 }}
      >
        <Icon size={12} strokeWidth={2} />
      </motion.div>
      <motion.span
        className="dist-value"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ...springConfig }}
      >
        {distance === Infinity as any ? '∞' : distance}
      </motion.span>
      <span className="dist-label">{config.label}</span>
    </motion.div>
  );
});

DistanceBadge.displayName = 'DistanceBadge';

interface StatsCardsProps {
  stats: any;
  isVisible: boolean;
}

const StatsCards = React.memo(({ stats, isVisible }: StatsCardsProps) => {
  const controls = useAnimation();
  
  useEffect(() => {
    if (isVisible) {
      controls.start('visible');
    }
  }, [isVisible, controls]);

  const cards = [
    { 
      icon: Users, 
      label: 'Users', 
      value: stats.totalUsers.toLocaleString(), 
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    },
    { 
      icon: TrendingUp, 
      label: 'Avg Dist', 
      value: stats.avgDistance === 0 ? '∞' : stats.avgDistance.toFixed(1), 
      color: '#fbbf24',
      gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    },
    { 
      icon: Target, 
      label: 'Max Dist', 
      value: stats.maxDistance === 0 ? '∞' : stats.maxDistance, 
      color: '#ea580c',
      gradient: 'linear-gradient(135deg, #ea580c, #f97316)',
    },
    { 
      icon: Zap, 
      label: 'Unreachable', 
      value: stats.unreachableCount, 
      color: stats.unreachableCount > 0 ? '#ef4444' : '#34d399',
      gradient: stats.unreachableCount > 0 
        ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
        : 'linear-gradient(135deg, #34d399, #10b981)',
    },
  ];

  return (
    <motion.div
      className="stats-row"
      initial="hidden"
      animate={controls}
      variants={{
        visible: {
          transition: { staggerChildren: 0.08 },
        },
      }}
    >
      {cards.map((card: any, i: number) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            className="stat-item"
            variants={ANIMATION_VARIANTS.statsCard}
            custom={i}
            whileHover={{
              y: -3,
              scale: 1.03,
              boxShadow: `0 8px 25px ${card.color}20`,
              transition: gentleSpring,
            }}
            whileTap={{ scale: 0.98 }}
            style={{
              '--stat-color': card.color,
              '--stat-gradient': card.gradient,
            } as React.CSSProperties}
          >
            <motion.div
              className="stat-icon-wrap"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.4 }}
            >
              <Icon size={14} strokeWidth={1.5} />
            </motion.div>
            <motion.span
              className="stat-val"
              key={card.value}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={bouncySpring}
            >
              {card.value}
            </motion.span>
            <span className="stat-lbl">{card.label}</span>
          </motion.div>
        );
      })}
    </motion.div>
  );
});

StatsCards.displayName = 'StatsCards';

interface PaginationProps {
  table: any;
}

const Pagination = React.memo(({ table }: PaginationProps) => {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();

  return (
    <motion.div
      className="pagination-bar"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      <div className="pagination-info">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity as any, ease: 'linear' }}
        >
          <BarChart3 size={12} />
        </motion.div>
        <span>
          {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, totalRows)} of {totalRows}
        </span>
      </div>

      <div className="pagination-actions">
        <motion.select
          value={pageSize}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => table.setPageSize(Number(e.target.value))}
          className="page-size-select"
          whileFocus={{ borderColor: '#f59e0b', boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.15)' }}
        >
          {PAGINATION_SIZES.map((s: number) => (
            <option key={s} value={s}>{s}/page</option>
          ))}
        </motion.select>

        <div className="page-nav">
          <motion.button
            className="page-btn"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            variants={ANIMATION_VARIANTS.scaleBounce}
            whileHover="hover"
            whileTap="tap"
          >
            <ChevronsLeft size={14} />
          </motion.button>
          <motion.button
            className="page-btn"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            variants={ANIMATION_VARIANTS.scaleBounce}
            whileHover="hover"
            whileTap="tap"
          >
            <ChevronLeft size={14} />
          </motion.button>

          <motion.span
            className="page-indicator"
            key={`${pageIndex}-${totalPages}`}
            initial={{ scale: 1.2, color: '#f59e0b' }}
            animate={{ scale: 1, color: '#64748b' }}
            transition={springConfig}
          >
            {pageIndex + 1}/{totalPages || 1}
          </motion.span>

          <motion.button
            className="page-btn"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            variants={ANIMATION_VARIANTS.scaleBounce}
            whileHover="hover"
            whileTap="tap"
          >
            <ChevronRight size={14} />
          </motion.button>
          <motion.button
            className="page-btn"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage()}
            variants={ANIMATION_VARIANTS.scaleBounce}
            whileHover="hover"
            whileTap="tap"
          >
            <ChevronsRight size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
});

Pagination.displayName = 'Pagination';

interface EmptyStateProps {
  type: string;
}

const EmptyState = React.memo(({ type }: EmptyStateProps) => {
  const configs: any = {
    'no-target': {
      icon: Target,
      title: 'Select a source user',
      desc: 'Choose a user to analyze path distances',
      color: '#f59e0b',
    },
    'no-data': {
      icon: UserPlus,
      title: 'No users found',
      desc: 'This user is isolated or network is empty',
      color: '#fbbf24',
    },
    'no-results': {
      icon: Search,
      title: 'No matches',
      desc: 'Try different search terms',
      color: '#94a3b8',
    },
  };

  const config = configs[type] || configs['no-target'];
  const Icon = config.icon;

  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={gentleSpring}
    >
      <motion.div
        variants={ANIMATION_VARIANTS.floating}
        animate="animate"
        style={{ display: 'inline-block' }}
      >
        <motion.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          <Icon 
            size={40} 
            strokeWidth={1} 
            color={config.color}
            className="empty-icon"
          />
        </motion.div>
      </motion.div>
      
      <motion.h3
        className="empty-title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {config.title}
      </motion.h3>
      
      <motion.p
        className="empty-desc"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {config.desc}
      </motion.p>
    </motion.div>
  );
});

EmptyState.displayName = 'EmptyState';

interface TableRowProps {
  row: any;
  index: number;
}

const TableRow = React.memo(({ row, index }: TableRowProps) => {
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
      variants={{
        hidden: ANIMATION_VARIANTS.listItem.hidden,
        visible: ANIMATION_VARIANTS.listItem.visible,
        exit: ANIMATION_VARIANTS.listItem.exit,
        hover: {
          backgroundColor: 'rgba(245, 158, 11, 0.04)',
          scale: 1.002,
          transition: { duration: 0.2 },
        },
      }}
      initial="hidden"
      animate={controls}
      exit="exit"
      custom={index}
      whileHover="hover"
      layout
      style={{ cursor: 'default' }}
    >
      {row.getVisibleCells().map((cell: any) => (
        <td key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </motion.tr>
  );
});

TableRow.displayName = 'TableRow';

export default function UserDistanceTable(): React.ReactElement {
  const { users, allDistancesFrom } = useNetwork();
  
  const [targetId, setTargetId] = useState<string>('');
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [sorting, setSorting] = useState<any[]>([{ id: 'distance', desc: false }]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const isTableInView = useInView(tableRef, { once: false, margin: '-100px' });

  const targetUser = useMemo(
    () => users.find((u: any) => u.id === targetId),
    [users, targetId]
  );

  const tableData = useMemo(() => {
    if (!targetId) return [];
    const distances = allDistancesFrom(targetId);
    
    return users
      .filter((u: any) => u.id !== targetId)
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        distance: distances[u.id] ?? Infinity,
        reachable: distances[u.id] !== Infinity && distances[u.id] !== undefined,
      }));
  }, [targetId, users, allDistancesFrom]);

  const stats = useMemo(() => {
    if (!tableData.length) {
      return { totalUsers: 0, avgDistance: 0, maxDistance: 0, unreachableCount: 0 };
    }

    const reachable = tableData.filter((r: any) => r.reachable);
    const unreachable = tableData.filter((r: any) => !r.reachable);
    
    return {
      totalUsers: tableData.length,
      avgDistance: reachable.length > 0
        ? reachable.reduce((s: number, r: any) => s + r.distance, 0) / reachable.length
        : 0,
      maxDistance: reachable.length > 0
        ? Math.max(...reachable.map((r: any) => r.distance))
        : 0,
      unreachableCount: unreachable.length,
    };
  }, [tableData]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }: any) => (
          <motion.button
            className="col-header-btn"
            onClick={() => column.toggleSorting()}
            whileHover={{ color: '#f59e0b', scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>Name</span>
            <motion.div
              animate={{
                rotate: column.getIsSorted() === 'asc' ? 180 : 0,
              }}
              transition={{ duration: 0.2 }}
            >
              {column.getIsSorted() ? (
                <ChevronUp size={12} />
              ) : (
                <ArrowUpDown size={12} />
              )}
            </motion.div>
          </motion.button>
        ),
        cell: ({ row }: any) => (
          <div className="name-cell">
            <motion.span
              className="user-avatar-sm"
              whileHover={{ 
                scale: 1.15, 
                rotate: 5,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              }}
              transition={bouncySpring}
              layoutId={`avatar-${row.original.id}`}
            >
              {row.original.name.charAt(0).toUpperCase()}
            </motion.span>
            <span className="user-name-sm">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'distance',
        header: ({ column }: any) => (
          <motion.button
            className="col-header-btn"
            onClick={() => column.toggleSorting()}
            whileHover={{ color: '#f59e0b', scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>Distance</span>
            <motion.div
              animate={{
                rotate: column.getIsSorted() === 'asc' ? 180 : 0,
              }}
              transition={{ duration: 0.2 }}
            >
              {column.getIsSorted() ? (
                <ChevronUp size={12} />
              ) : (
                <ArrowUpDown size={12} />
              )}
            </motion.div>
          </motion.button>
        ),
        cell: ({ row }: any) => (
          <DistanceBadge distance={row.original.distance} />
        ),
        sortingFn: (a: any, b: any) => {
          const da = a.original.distance;
          const db = b.original.distance;
          if (da === Infinity && db === Infinity) return 0;
          if (da === Infinity) return 1;
          if (db === Infinity) return -1;
          return da - db;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    globalFilterFn: (row: any, columnId: string, value: string) =>
      String(row.getValue(columnId))
        .toLowerCase()
        .includes(value.toLowerCase()),
  });

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    const rows = table.getFilteredRowModel().rows.map((r: any) => r.original);
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    exportToCSV(rows, targetUser?.name);
    
    setIsExporting(false);
  }, [table, targetUser]);

  const emptyType = !targetId
    ? 'no-target'
    : tableData.length === 0
      ? 'no-data'
      : table.getFilteredRowModel().rows.length === 0
        ? 'no-results'
        : null;

  return (
    <LayoutGroup>
      <motion.div
        ref={tableRef}
        className="dist-table-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ...gentleSpring }}
        layout
      >
        <motion.div 
          className="dist-table-header"
          layout
        >
          <div className="header-left">
            <motion.div
              whileHover={{ rotate: [0, -15, 15, 0] }}
              transition={{ duration: 0.6 }}
            >
              <MapPin size={16} strokeWidth={1.5} className="header-icon" />
            </motion.div>
            <div>
              <h3 className="header-title">Distance Explorer</h3>
              <p className="header-subtitle">
                Shortest path analysis from source node
              </p>
            </div>
          </div>
          
          <AnimatePresence>
            {targetUser && (
              <motion.div
                className="source-badge"
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={bouncySpring}
                layout
              >
                <Sparkles size={10} />
                <span className="source-badge-label">Source:</span>
                <span className="source-badge-name">{targetUser.name}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div 
          className="dist-controls"
          layout
        >
          <div className="user-select-wrap">
            <UserSelect
              value={targetId}
              onChange={setTargetId}
              placeholder="Select source user..."
            />
          </div>

          <AnimatePresence>
            {tableData.length > 0 && (
              <motion.div
                className="controls-right"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                <div className="search-wrap">
                  <Search size={13} className="search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="search-inp"
                    placeholder="Filter users..."
                    value={globalFilter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
                  />
                  <AnimatePresence>
                    {globalFilter && (
                      <motion.button
                        className="search-clear"
                        onClick={() => {
                          setGlobalFilter('');
                          searchInputRef.current?.focus();
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        whileHover={{ scale: 1.2, color: '#f59e0b' }}
                        whileTap={{ scale: 0.8 }}
                      >
                        <X size={12} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  className="export-btn-sm"
                  onClick={handleExport}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  animate={isExporting ? { scale: [1, 0.95, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    animate={isExporting ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ 
                      duration: 0.5, 
                      repeat: isExporting ? Infinity : 0 as any,
                      ease: 'linear',
                    }}
                  >
                    {isExporting ? (
                      <Sparkles size={12} />
                    ) : (
                      <Download size={12} />
                    )}
                  </motion.div>
                  <span>{isExporting ? 'Saving...' : 'CSV'}</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence mode="wait">
          {emptyType ? (
            <EmptyState key="empty" type={emptyType} />
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tableData.length > 0 && (
                <StatsCards 
                  stats={stats} 
                  isVisible={isTableInView} 
                />
              )}

              <div className="table-scroll-container">
                <table className="data-table-sm">
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
                    variants={ANIMATION_VARIANTS.container}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence>
                      {table.getRowModel().rows.map((row: any, index: number) => (
                        <TableRow 
                          key={row.id} 
                          row={row} 
                          index={index} 
                        />
                      ))}
                    </AnimatePresence>
                  </motion.tbody>
                </table>
              </div>

              <AnimatePresence>
                {table.getPageCount() > 1 && (
                  <Pagination table={table} />
                )}
              </AnimatePresence>

              <motion.div
                className="dist-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity as any, ease: 'linear' }}
                >
                  <GitBranch size={11} />
                </motion.div>
                <span>BFS algorithm · {tableData.length} nodes processed</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}