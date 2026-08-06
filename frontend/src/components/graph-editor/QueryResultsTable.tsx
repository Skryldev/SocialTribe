import React, { useRef, useCallback, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'motion/react';
import { SortIndicator } from './queryResultsUtils';

const SELECT_COL_ID = '__select__';
const ROWNUM_COL_ID = '__rownum__';

const ROW_VARIANTS = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.12, ease: [0.4, 0, 0.2, 1] } as const },
  exit: { opacity: 0, y: -4, transition: { duration: 0.08 } },
};

interface TableHeaderProps {
  headerGroups: any[];
  totalWidth: number;
  density: string;
}

const TableHeader = memo(function TableHeader({ headerGroups, totalWidth }: TableHeaderProps): React.ReactElement {
  return (
    <div role="rowgroup" className="qr-thead">
      {headerGroups.map((headerGroup: any) => (
        <div
          key={headerGroup.id}
          role="row"
          className="qr-tr-header"
          style={{ display: 'flex', width: totalWidth }}
        >
          {headerGroup.headers.map((header: any) => {
            const isSorted = header.column.getIsSorted();
            const sortIndex = header.column.getSortIndex();
            const canSort = header.column.getCanSort();
            const isSelect = header.column.id === SELECT_COL_ID;
            const isRowNum = header.column.id === ROWNUM_COL_ID;

            return (
              <div
                key={header.id}
                role="columnheader"
                aria-sort={
                  isSorted === 'asc' ? 'ascending' :
                  isSorted === 'desc' ? 'descending' : 'none'
                }
                className={`qr-th ${isSorted ? 'qr-th-sorted' : ''} ${isSelect ? 'qr-th-select' : ''} ${isRowNum ? 'qr-th-rownum' : ''}`}
                style={{
                  width: header.getSize(),
                  minWidth: header.getSize(),
                }}
              >
                {isSelect || isRowNum ? (
                  <div className="qr-th-center">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={canSort ? 0 : -1}
                    className="qr-th-inner"
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()(e);
                      }
                    }}
                  >
                    <span className="qr-th-label">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {canSort && <SortIndicator sorted={isSorted} />}
                    {isSorted && sortIndex > 0 && (
                      <span className="qr-sort-badge">{sortIndex + 1}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});

interface TableRowProps {
  row: any;
  virtualRow: any;
  totalWidth: number;
  isSelected: boolean;
  isEven: boolean;
  animIndex: number;
  onRowClick?: (row: any, index: number) => void;
  density: string;
}

const TableRow = memo(function TableRow({
  row,
  virtualRow,
  totalWidth,
  isSelected,
  isEven,
  animIndex,
  onRowClick,
}: TableRowProps): React.ReactElement {
  const handleClick = useCallback(() => {
    row.toggleSelected();
    if (onRowClick) onRowClick(row.original, row.index);
  }, [row, onRowClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      row.toggleSelected();
      if (onRowClick) onRowClick(row.original, row.index);
    }
  }, [row, onRowClick]);

  return (
    <motion.div
      role="row"
      aria-selected={isSelected}
      className={`qr-tr ${isSelected ? 'qr-tr-selected' : ''} ${isEven ? 'qr-tr-even' : ''}`}
      style={{
        position: 'absolute',
        top: virtualRow.start,
        height: virtualRow.size,
        display: 'flex',
        width: totalWidth,
        left: 0,
      }}
      variants={ROW_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={animIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      whileHover={{
        backgroundColor: isSelected ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.04)',
      }}
    >
      {row.getVisibleCells().map((cell: any) => {
        const isSelect = cell.column.id === SELECT_COL_ID;
        const isRowNum = cell.column.id === ROWNUM_COL_ID;

        return (
          <div
            key={cell.id}
            role="cell"
            className={`qr-td ${isSelect ? 'qr-td-select' : ''} ${isRowNum ? 'qr-td-rownum' : ''}`}
            style={{
              width: cell.column.getSize(),
              minWidth: cell.column.getSize(),
            }}
            onClick={isSelect ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        );
      })}
    </motion.div>
  );
});

interface StatusBarProps {
  dataCount: number;
  columnCount: number;
  selectedCount: number;
  sorting: any[];
  density: string;
}

const StatusBar = memo(function StatusBar({
  dataCount,
  columnCount,
  selectedCount,
  sorting,
  density,
}: StatusBarProps): React.ReactElement {
  return (
    <div className="qr-footer">
      <div className="qr-footer-left">
        <span className="qr-footer-stat">
          <strong>{dataCount.toLocaleString()}</strong> rows
        </span>
        <span className="qr-footer-separator" />
        <span className="qr-footer-stat">{columnCount} columns</span>
        {selectedCount > 0 && (
          <>
            <span className="qr-footer-separator" />
            <span className="qr-footer-stat qr-footer-highlight">
              {selectedCount} selected
            </span>
          </>
        )}
      </div>
      <div className="qr-footer-right">
        {sorting.length > 0 && (
          <span className="qr-footer-stat qr-footer-sort">
            Sorted: {sorting.map((s: any) => `${s.id} ${s.desc ? '↓' : '↑'}`).join(', ')}
          </span>
        )}
        <span className="qr-footer-stat qr-footer-density">{density}</span>
      </div>
    </div>
  );
});

interface QueryResultsTableProps {
  data: any[];
  columns: any[];
  sorting: any[];
  onSortingChange: (sorting: any) => void;
  rowSelection: any;
  onRowSelectionChange: (selection: any) => void;
  columnVisibility: any;
  onColumnVisibilityChange: (visibility: any) => void;
  rowHeight?: number;
  overscan?: number;
  enableSorting?: boolean;
  enableSelection?: boolean;
  onRowClick?: (row: any, index: number) => void;
  density?: string;
}

const QueryResultsTable = memo(function QueryResultsTable({
  data,
  columns,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
  rowHeight = 40,
  overscan = 8,
  enableSorting = true,
  enableSelection = true,
  onRowClick,
  density = 'compact',
}: QueryResultsTableProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange,
    onRowSelectionChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: enableSorting,
    enableSorting,
    enableRowSelection: enableSelection,
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const totalWidth = table.getTotalSize();
  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="qr-table-wrapper">
      <div ref={scrollRef} className="qr-scroll">
        <div
          role="table"
          className="qr-table"
          style={{ width: totalWidth, minWidth: '100%' }}
        >
          <TableHeader
            headerGroups={table.getHeaderGroups()}
            totalWidth={totalWidth}
            density={density}
          />

          <div
            role="rowgroup"
            className="qr-tbody"
            style={{ height: totalSize, position: 'relative' }}
          >
            <AnimatePresence mode="popLayout">
              {virtualItems.map((virtualRow: any, index: number) => {
                const row = rows[virtualRow.index];
                const isSelected = row.getIsSelected();
                const isEven = virtualRow.index % 2 === 0;

                return (
                  <TableRow
                    key={row.id}
                    row={row}
                    virtualRow={virtualRow}
                    totalWidth={totalWidth}
                    isSelected={isSelected}
                    isEven={isEven}
                    animIndex={index}
                    onRowClick={onRowClick}
                    density={density}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <StatusBar
        dataCount={data.length}
        columnCount={columns.length - (enableSelection ? 2 : 1)}
        selectedCount={selectedCount}
        sorting={sorting}
        density={density}
      />
    </div>
  );
});

export default QueryResultsTable;