import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Check, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

export const SELECT_COL_ID = '__select__';
export const ROWNUM_COL_ID = '__rownum__';

export const formatCellValue = (value: any): { display: string; type: string } => {
  if (value === null || value === undefined) return { display: '∅', type: 'null' };
  if (typeof value === 'boolean') return { display: value ? 'true' : 'false', type: 'boolean' };
  if (typeof value === 'number') return { display: value.toLocaleString(), type: 'number' };
  if (value instanceof Date) return { display: value.toISOString(), type: 'date' };
  if (typeof value === 'object') return { display: JSON.stringify(value), type: 'json' };
  return { display: String(value), type: 'string' };
};

export const truncateText = (text: any, maxLength: number = 100): any => {
  if (typeof text !== 'string') return text;
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
};

interface RowCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}

export const RowCheckbox = React.memo(function RowCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: RowCheckboxProps): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      aria-label={label}
      className="qr-checkbox-wrapper"
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="qr-checkbox-input"
      />
      <span className={`qr-checkbox ${checked ? 'qr-checkbox-checked' : ''}`}>
        {checked && <Check size={9} strokeWidth={3} />}
      </span>
    </label>
  );
});

interface SortIndicatorProps {
  sorted: 'asc' | 'desc' | false;
}

export const SortIndicator = React.memo(function SortIndicator({ sorted }: SortIndicatorProps): React.ReactElement {
  if (sorted === 'asc') {
    return <ChevronUp size={12} className="qr-sort-icon qr-sort-asc" />;
  }
  if (sorted === 'desc') {
    return <ChevronDown size={12} className="qr-sort-icon qr-sort-desc" />;
  }
  return <ArrowUpDown size={12} className="qr-sort-icon qr-sort-neutral" />;
});

export const useQueryResults = (): any => {
  const [sorting, setSorting] = useState<any[]>([]);
  const [rowSelection, setRowSelection] = useState<any>({});
  const [columnVisibility, setColumnVisibility] = useState<any>({});
  const [globalFilter, setGlobalFilter] = useState<string>('');

  const resetAll = useCallback(() => {
    setSorting([]);
    setRowSelection({});
    setColumnVisibility({});
    setGlobalFilter('');
  }, []);

  return {
    sorting,
    setSorting,
    rowSelection,
    setRowSelection,
    columnVisibility,
    setColumnVisibility,
    globalFilter,
    setGlobalFilter,
    resetAll,
  };
};

interface UseColumnBuilderProps {
  columnDefs?: any[];
  enableSelection?: boolean;
  density?: string;
  minWidth?: number;
  maxWidth?: number;
}

export const useColumnBuilder = ({
  columnDefs = [],
  enableSelection = true,
  density = 'compact',
  minWidth = 120,
  maxWidth = 350,
}: UseColumnBuilderProps): any => {
  const columnHelper = useMemo(() => createColumnHelper(), []);

  const columns = useMemo(() => {
    const cols: any[] = [];

    if (enableSelection) {
      cols.push({
        id: SELECT_COL_ID,
        size: 36,
        minSize: 36,
        maxSize: 36,
        enableSorting: false,
        enableResizing: false,
        header: ({ table }: any) => (
          <RowCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            label="Select all rows"
          />
        ),
        cell: ({ row }: any) => (
          <RowCheckbox
            checked={row.getIsSelected()}
            indeterminate={false}
            onChange={row.getToggleSelectedHandler()}
            label={`Select row ${row.index + 1}`}
          />
        ),
      });
    }

    cols.push({
      id: ROWNUM_COL_ID,
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableSorting: false,
      enableResizing: false,
      header: () => <span className="qr-th-rownum-text">#</span>,
      cell: ({ row }: any) => (
        <span className="qr-cell-rownum">
          {row.index + 1}
        </span>
      ),
    });

    const dataCols = columnDefs.map((col: any) => {
      const id = typeof col === 'string' ? col : col.id || col.accessorKey;
      const header = typeof col === 'object' && col.header ? col.header : id;
      const estimatedSize = Math.min(maxWidth, Math.max(minWidth, id.length * 9 + 40));

      return columnHelper.accessor(
        (row: any) => row[id],
        {
          id,
          header,
          size: typeof col === 'object' && col.size ? col.size : estimatedSize,
          minSize: minWidth,
          maxSize: maxWidth,
          enableSorting: true,
          cell: (info: any) => {
            const value = info.getValue();
            const formatted = formatCellValue(value);
            
            if (formatted.type === 'null') {
              return <span className="qr-cell-null" title="NULL">∅</span>;
            }
            
            const display = truncateText(formatted.display);
            
            return (
              <span
                className={`qr-cell-value qr-cell-${formatted.type}`}
                title={formatted.display}
              >
                {display}
              </span>
            );
          },
        }
      );
    });

    return [...cols, ...dataCols];
  }, [columnDefs, enableSelection, density, minWidth, maxWidth, columnHelper]);

  return { columns };
};

interface UseExportActionsProps {
  data?: any[];
  columnDefs?: any[];
  rowSelection?: any;
}

export const useExportActions = ({ data = [], columnDefs = [], rowSelection = {} }: UseExportActionsProps): any => {
  const getExportData = useCallback(() => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    
    if (selectedIndices.length > 0) {
      return selectedIndices.map((index: number) => data[index]).filter(Boolean);
    }
    
    return data;
  }, [data, rowSelection]);

  const handleCopy = useCallback(() => {
    const exportData = getExportData();
    
    if (exportData.length === 0) return;

    const columns = columnDefs.map((col: any) =>
      typeof col === 'string' ? col : col.id || col.accessorKey
    );

    const header = columns.join('\t');
    const body = exportData.map((row: any) =>
      columns.map((col: string) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }).join('\t')
    ).join('\n');

    navigator.clipboard?.writeText(`${header}\n${body}`).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = `${header}\n${body}`;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        console.error('Copy failed:', e);
      }
      document.body.removeChild(textarea);
    });
  }, [getExportData, columnDefs]);

  const handleExportCSV = useCallback(() => {
    const exportData = getExportData();
    
    if (exportData.length === 0) return;

    const columns = columnDefs.map((col: any) =>
      typeof col === 'string' ? col : col.id || col.accessorKey
    );

    const escape = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csv = [
      columns.join(','),
      ...exportData.map((row: any) =>
        columns.map((col: string) => escape(row[col])).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [getExportData, columnDefs]);

  return { handleCopy, handleExportCSV, getExportData };
};