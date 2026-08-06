import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy,
  Download,
  Columns3,
  Check,
  Search,
  Maximize2,
  Minimize2,
  LucideIcon,
} from 'lucide-react';

interface IconButtonProps {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  size?: number;
}

const IconButton = memo(function IconButton({ onClick, title, active, disabled, icon: Icon, size = 14 }: IconButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`qr-icon-btn${active ? ' qr-icon-btn-active' : ''}${disabled ? ' qr-icon-btn-disabled' : ''}`}
    >
      <Icon size={size} strokeWidth={1.5} />
    </button>
  );
});

interface ColumnMenuProps {
  columns: any[];
  onToggle: (visibility: any) => void;
  onClose: () => void;
}

const ColumnMenu = memo(function ColumnMenu({ columns, onClose }: ColumnMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const visibleColumns = columns.filter((col: any) => col.getIsVisible()).length;

  return (
    <motion.div
      ref={menuRef}
      className="qr-col-menu"
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.12 }}
    >
      <div className="qr-col-menu-header">
        <span>Columns</span>
        <span className="qr-col-menu-count">{visibleColumns} visible</span>
      </div>
      <div className="qr-col-menu-list">
        {columns.map((col: any) => (
          <label key={col.id} className="qr-col-menu-item">
            <input
              type="checkbox"
              checked={col.getIsVisible()}
              onChange={col.getToggleVisibilityHandler()}
              className="qr-col-menu-checkbox"
            />
            <span className="qr-col-menu-checkmark">
              {col.getIsVisible() && <Check size={10} strokeWidth={3} />}
            </span>
            <span className="qr-col-menu-label">{col.id}</span>
          </label>
        ))}
      </div>
    </motion.div>
  );
});

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

const SearchInput = memo(function SearchInput({ value, onChange, onClear }: SearchInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="qr-search">
      <Search size={13} className="qr-search-icon" strokeWidth={1.5} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder="Filter results..."
        className="qr-search-input"
      />
      {value && (
        <button onClick={onClear} className="qr-search-clear" aria-label="Clear search">
          ×
        </button>
      )}
    </div>
  );
});

interface QueryResultsToolbarProps {
  loading: boolean;
  dataCount: number;
  columnCount: number;
  selectedCount: number;
  columnVisibility: any;
  onColumnVisibilityChange: (visibility: any) => void;
  onCopy: () => void;
  onExportCSV: () => void;
  enableExport?: boolean;
  density?: string;
}

const QueryResultsToolbar = memo(function QueryResultsToolbar({
  loading,
  dataCount,
  selectedCount,
  columnVisibility,
  onColumnVisibilityChange,
  onCopy,
  onExportCSV,
  enableExport = true,
}: QueryResultsToolbarProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev: boolean) => !prev);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev: boolean) => !prev);
  }, []);

  return (
    <div className="qr-toolbar">
      <div className="qr-toolbar-left">
        <span className="qr-toolbar-title">Results</span>
        {!loading && (
          <span className="qr-toolbar-badge">
            {dataCount.toLocaleString()}
          </span>
        )}
        {selectedCount > 0 && (
          <span className="qr-toolbar-badge qr-toolbar-badge-selected">
            {selectedCount} selected
          </span>
        )}
      </div>

      <div className="qr-toolbar-center">
        <SearchInput
          value={searchValue}
          onChange={setSearchValue}
          onClear={handleClearSearch}
        />
      </div>

      <div className="qr-toolbar-right">
        <IconButton
          onClick={onCopy}
          title="Copy results (TSV)"
          icon={Copy}
          disabled={dataCount === 0 || loading}
        />
        
        {enableExport && (
          <IconButton
            onClick={onExportCSV}
            title="Export as CSV"
            icon={Download}
            disabled={dataCount === 0 || loading}
          />
        )}

        <div className="qr-col-menu-wrap">
          <IconButton
            onClick={toggleMenu}
            title="Toggle columns"
            active={menuOpen}
            icon={Columns3}
          />
          <AnimatePresence>
            {menuOpen && (
              <ColumnMenu
                columns={Object.values(columnVisibility).length > 0 ? [] : []}
                onToggle={onColumnVisibilityChange}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="qr-toolbar-divider" />

        <IconButton
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          icon={isFullscreen ? Minimize2 : Maximize2}
        />
      </div>
    </div>
  );
});

export default QueryResultsToolbar;