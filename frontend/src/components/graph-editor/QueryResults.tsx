import React, { memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Inbox } from 'lucide-react';
import { useQueryResults, useExportActions, useColumnBuilder } from './queryResultsUtils';
import QueryResultsToolbar from './QueryResultsToolbar';
import QueryResultsTable from './QueryResultsTable';
import './QueryResults.css';

const EMPTY_VARIANTS = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const} },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } },
};

const SKELETON_COUNT = 8;
const DEFAULT_ROW_HEIGHT = 40;
const OVERSCAN = 8;
const COL_MIN_WIDTH = 120;
const COL_MAX_WIDTH = 350;

interface EmptyStateProps {
  message?: string;
  icon?: React.ComponentType<any>;
}

const EmptyState = memo(function EmptyState({ message, icon: Icon = Inbox }: EmptyStateProps): React.ReactElement {
  return (
    <motion.div
      className="qr-empty"
      variants={EMPTY_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <Icon size={32} className="qr-empty-icon" strokeWidth={1.5} />
      <p className="qr-empty-title">{message}</p>
      <p className="qr-empty-sub">Execute a query to see results</p>
    </motion.div>
  );
});

interface SkeletonLoaderProps {
  rows?: number;
  rowHeight?: number;
}

const SkeletonLoader = memo(function SkeletonLoader({ rows = SKELETON_COUNT, rowHeight = DEFAULT_ROW_HEIGHT }: SkeletonLoaderProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="qr-skeleton-container"
    >
      {Array.from({ length: rows }, (_, i: number) => (
        <div
          key={i}
          className="qr-skeleton-row"
          style={{ height: rowHeight }}
        >
          <div className="qr-skeleton-cell qr-skeleton-narrow" />
          <div className="qr-skeleton-cell qr-skeleton-medium" />
          <div className="qr-skeleton-cell qr-skeleton-wide" />
          <div className="qr-skeleton-cell qr-skeleton-medium" />
          <div className="qr-skeleton-cell qr-skeleton-wide" />
          <div className="qr-skeleton-cell qr-skeleton-narrow" />
        </div>
      ))}
    </motion.div>
  );
});

interface ColumnDef {
  id?: string;
  accessorKey?: string;
  header?: string;
  size?: number;
  cell?: (info: any) => React.ReactNode;
}

interface QueryResultsProps {
  data?: any[];
  columns?: (string | ColumnDef)[];
  loading?: boolean;
  error?: string;
  height?: number | string;
  rowHeight?: number;
  density?: 'compact' | 'comfortable';
  emptyMessage?: string;
  enableSelection?: boolean;
  enableExport?: boolean;
  enableSorting?: boolean;
  onRowClick?: (row: any) => void;
  className?: string;
}

const QueryResults = memo(function QueryResults({
  data = [],
  columns: columnDefs = [],
  loading = false,
  error = null as any,
  height = '100%',
  rowHeight = DEFAULT_ROW_HEIGHT,
  density = 'compact',
  emptyMessage = 'No results yet',
  enableSelection = true,
  enableExport = true,
  enableSorting = true,
  onRowClick,
  className = '',
}: QueryResultsProps): React.ReactElement {
  const {
    sorting,
    setSorting,
    rowSelection,
    setRowSelection,
    columnVisibility,
    setColumnVisibility,
  } = useQueryResults();

const { columns } = useColumnBuilder({
  columnDefs,
  enableSelection,
  density,
  minWidth: COL_MIN_WIDTH,
  maxWidth: COL_MAX_WIDTH,
});

  const { handleCopy, handleExportCSV } = useExportActions({
    data,
    columnDefs,
    rowSelection,
  });

  const selectedCount = Object.keys(rowSelection).length;
  const hasData = data.length > 0;
  const isEmpty = !loading && !hasData && !error;

  const rootClasses = useMemo(() => {
    const classes = ['qr-root', `qr-density-${density}`];
    if (className) classes.push(className);
    return classes.join(' ');
  }, [density, className]);

  return (
    <div className={rootClasses} style={{ height }}>
      <QueryResultsToolbar
        loading={loading}
        dataCount={data.length}
        columnCount={columnDefs.length}
        selectedCount={selectedCount}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onCopy={handleCopy}
        onExportCSV={handleExportCSV}
        enableExport={enableExport}
        density={density}
      />

      <div className="qr-content">
        <AnimatePresence mode="wait">
          {loading && (
            <SkeletonLoader
              key="skeleton"
              rows={SKELETON_COUNT}
              rowHeight={rowHeight}
            />
          )}

          {error && (
            <EmptyState
              key="error"
              message={error}
              icon={Inbox}
            />
          )}

          {isEmpty && (
            <EmptyState
              key="empty"
              message={emptyMessage}
            />
          )}

          {hasData && !loading && (
            <QueryResultsTable
              key="table"
              data={data}
              columns={columns}
              sorting={sorting}
              onSortingChange={setSorting}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              rowHeight={rowHeight}
              overscan={OVERSCAN}
              enableSorting={enableSorting}
              enableSelection={enableSelection}
              onRowClick={onRowClick}
              density={density}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default QueryResults;