import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  HardDrive,
  RotateCcw,
  Loader2,
  Calendar,
  Database,
  Plus,
  Save,
  History,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ActionButton, IconButton } from './Primitives';
import {
  getBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  downloadBackup,
} from './importApi';
import './BackupPanel.css';

// ============================================================
// Constants
// ============================================================
const TOAST_CONFIG = {
  duration: 2500,
  position: 'top-right' as const,
};

const SKELETON_COUNT = 3;

const TIME_UNITS = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

const ACTIONS = {
  CREATE: 'create',
  RESTORE: (id: string) => `restore-${id}`,
  DELETE: (id: string) => `delete-${id}`,
  DOWNLOAD: (id: string) => `download-${id}`,
} as const;

// ============================================================
// Utility Functions
// ============================================================
const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return 'Unknown';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < TIME_UNITS.hour) {
      return `${Math.floor(diffSeconds / 60)}m ago`;
    }
    if (diffSeconds < TIME_UNITS.day) {
      return `${Math.floor(diffSeconds / TIME_UNITS.hour)}h ago`;
    }
    if (diffSeconds < TIME_UNITS.week) {
      return `${Math.floor(diffSeconds / TIME_UNITS.day)}d ago`;
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const formatBackupSize = (bytes: number | null): string | null => {
  if (bytes == null || bytes === 0) return null;

  const KB = 1024;
  const MB = KB * 1024;

  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
};

const generateBackupName = (): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `Backup_${timestamp}`;
};

// ✅ اصلاح شده: دانلود فایل با پسوند .json.gz
const downloadBlob = (blob: Blob, filename: string): void => {
  // اطمینان از پسوند صحیح
  const finalFilename = filename.endsWith('.json.gz')
    ? filename
    : `${filename}.json.gz`;

  console.log('📥 Downloading backup file:', {
    originalName: filename,
    finalName: finalFilename,
    size: `${(blob.size / 1024).toFixed(1)} KB`,
    type: blob.type,
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 100);
};

// ============================================================
// Toast Helpers
// ============================================================
const showSuccessToast = (
  message: string,
  icon: React.ReactElement = <CheckCircle size={15} style={{ color: 'var(--iem-violet)' }} />
): void => {
  toast.success(message, { ...TOAST_CONFIG, icon });
};

const showErrorToast = (message: string): void => {
  toast.error(message, TOAST_CONFIG);
};

// ============================================================
// Animations
// ============================================================
const animations = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.06 } as const,
    },
  },
  card: {
    hidden: { opacity: 0, y: 12, scale: 0.97 } as const,
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 380, damping: 28 } as const,
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -8,
      transition: { duration: 0.18 } as const,
    },
    hover: {
      x: 2,
      transition: { type: 'spring', stiffness: 400, damping: 25 } as const,
    },
  },
  emptyIcon: {
    animate: {
      y: [0, -6, 0],
      borderColor: [
        'var(--iem-border)',
        'var(--iem-violet-border)',
        'var(--iem-border)',
      ],
    },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } as const,
  },
};

// ============================================================
// Sub-components
// ============================================================
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="bp-dialog-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="bp-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bp-dialog-icon">
            <AlertTriangle size={24} />
          </div>
          <h4 className="bp-dialog-title">{title}</h4>
          <p className="bp-dialog-message">{message}</p>
          <div className="bp-dialog-actions">
            <button
              className="bp-dialog-btn bp-dialog-btn--cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="bp-dialog-btn bp-dialog-btn--confirm"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 size={14} className="bp-spinner" /> : 'Delete'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const SkeletonLoader: React.FC = () => (
  <div className="bp-list-scroll">
    {Array.from({ length: SKELETON_COUNT }, (_, i) => (
      <div key={i} className="bp-skeleton">
        <div className="bp-skeleton-inner">
          <div className="bp-skeleton-icon" />
          <div className="bp-skeleton-content">
            <div className="bp-skeleton-line bp-skeleton-line--long" />
            <div className="bp-skeleton-line bp-skeleton-line--short" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState: React.FC = () => (
  <motion.div
    className="bp-empty"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
  >
    <motion.div
      className="bp-empty-icon"
      animate={animations.emptyIcon.animate}
      transition={animations.emptyIcon.transition}
    >
      <History size={24} />
    </motion.div>
    <h4 className="bp-empty-title">No backups yet</h4>
    <p className="bp-empty-desc">
      Create your first backup above
      <br />
      to save the current graph state
    </p>
  </motion.div>
);

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <motion.div
    className="bp-empty"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
  >
    <div className="bp-empty-icon bp-empty-icon--error">
      <AlertTriangle size={24} />
    </div>
    <h4 className="bp-empty-title">Failed to load backups</h4>
    <p className="bp-empty-desc">{message}</p>
    <button className="bp-retry-btn" onClick={onRetry}>
      <RotateCcw size={14} />
      Retry
    </button>
  </motion.div>
);

// ============================================================
// Types
// ============================================================
interface Backup {
  backup_id: string;
  name?: string;
  created_at?: string;
  size?: number;
  nodes_count?: number;
}

interface BackupCardProps {
  backup: Backup;
  actionLoading: string | null;
  isAnyActionLoading: boolean;
  onRestore: (backup: Backup) => void;
  onDownload: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
}

// ============================================================
// BackupCard Component
// ============================================================
const BackupCard: React.FC<BackupCardProps> = ({
  backup,
  actionLoading,
  isAnyActionLoading,
  onRestore,
  onDownload,
  onDelete,
}) => {
  const backupId = backup.backup_id;
  const backupName = backup.name || 'Unnamed Backup';
  const isRestoring = actionLoading === ACTIONS.RESTORE(backupId);
  const isDeleting = actionLoading === ACTIONS.DELETE(backupId);
  const isDownloading = actionLoading === ACTIONS.DOWNLOAD(backupId);

  return (
    <motion.div
      className="bp-card"
      variants={animations.card}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover="hover"
      layout
    >
      <div className="bp-card-icon">
        <HardDrive size={15} />
      </div>

      <div className="bp-card-info">
        <div className="bp-card-name" title={backupName}>
          {backupName}
        </div>
        <div className="bp-card-meta">
          {backup.created_at && (
            <span className="bp-card-meta-item">
              <Calendar size={10} />
              {formatRelativeTime(backup.created_at)}
            </span>
          )}
          {backup.size != null && (
            <>
              <span className="bp-card-meta-dot" />
              <span className="bp-card-meta-item">
                <Database size={10} />
                {formatBackupSize(backup.size)}
              </span>
            </>
          )}
          {backup.nodes_count !== undefined && (
            <>
              <span className="bp-card-meta-dot" />
              <span className="bp-card-meta-item">
                {backup.nodes_count} nodes
              </span>
            </>
          )}
        </div>
      </div>

      <div className="bp-card-actions">
        <IconButton
          icon={RotateCcw}
          onClick={() => onRestore(backup)}
          variant="restore"
          loading={isRestoring}
          disabled={isAnyActionLoading && !isRestoring}
          title={`Restore "${backupName}"`}
          size={14}
        />
        <IconButton
          icon={Download}
          onClick={() => onDownload(backup)}
          variant="default"
          loading={isDownloading}
          disabled={isAnyActionLoading && !isDownloading}
          title={`Download "${backupName}"`}
          size={14}
        />
        <IconButton
          icon={Trash2}
          onClick={() => onDelete(backup)}
          variant="danger"
          loading={isDeleting}
          disabled={isAnyActionLoading && !isDeleting}
          title={`Delete "${backupName}"`}
          size={14}
        />
      </div>
    </motion.div>
  );
};

// ============================================================
// Main Component
// ============================================================
interface BackupPanelProps {
  onRestore?: (graphData: unknown) => void;
}

export const BackupPanel: React.FC<BackupPanelProps> = ({ onRestore }) => {
  // State
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newBackupName, setNewBackupName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  // Derived state
  const isAnyActionLoading = actionLoading !== null;
  const isCreateLoading = actionLoading === ACTIONS.CREATE;
  const isCreateDisabled = !newBackupName.trim() || isAnyActionLoading;
  const hasBackups = backups.length > 0;
  const showSkeleton = loading && !hasBackups;
  const showError = error && !hasBackups;
  const showEmpty = !loading && !error && !hasBackups;

  // ============================================================
  // Effects
  // ============================================================
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setNewBackupName(generateBackupName());
    fetchBackups();
    inputRef.current?.focus();
  }, []);

  // ============================================================
  // Handlers
  // ============================================================
  const fetchBackups = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const data = await getBackups();
      if (mountedRef.current) {
        setBackups(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to fetch backups';
        setError(message);
        showErrorToast(message);
        console.error('[BackupPanel] Fetch error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  const handleCreateBackup = useCallback(async () => {
    const name = newBackupName.trim();
    if (!name || isAnyActionLoading) return;

    setActionLoading(ACTIONS.CREATE);
    try {
      await createBackup({ name });
      showSuccessToast(
        'Backup created successfully',
        <Save size={15} style={{ color: 'var(--iem-violet)' }} />
      );
      setNewBackupName(generateBackupName());
      await fetchBackups();
      inputRef.current?.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create backup';
      showErrorToast(message);
    } finally {
      if (mountedRef.current) {
        setActionLoading(null);
      }
    }
  }, [newBackupName, isAnyActionLoading, fetchBackups]);

  const handleRestore = useCallback(
    async (backup: Backup) => {
      const backupId = backup.backup_id;
      const backupName = backup.name || 'Unnamed Backup';

      setActionLoading(ACTIONS.RESTORE(backupId));
      try {
        const result = await restoreBackup(backupId);
        const graphData = result?.graph;

        if (!graphData) {
          throw new Error('Invalid server response: missing graph data');
        }

        showSuccessToast(
          `Backup "${backupName}" restored successfully`,
          <RotateCcw size={15} style={{ color: 'var(--iem-violet)' }} />
        );

        onRestore?.(graphData);
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to restore backup "${backupName}"`;
        showErrorToast(message);
        console.error('[BackupPanel] Restore error:', err);
      } finally {
        if (mountedRef.current) {
          setActionLoading(null);
        }
      }
    },
    [onRestore]
  );

  const handleDelete = useCallback(
    async (backup: Backup) => {
      const backupId = backup.backup_id;
      const backupName = backup.name || 'Unnamed Backup';

      setActionLoading(ACTIONS.DELETE(backupId));
      try {
        await deleteBackup(backupId);
        showSuccessToast(
          `Backup "${backupName}" deleted`,
          <Trash2 size={15} style={{ color: 'var(--iem-red, #ef4444)' }} />
        );
        setDeleteTarget(null);
        await fetchBackups();
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to delete backup "${backupName}"`;
        showErrorToast(message);
      } finally {
        if (mountedRef.current) {
          setActionLoading(null);
        }
      }
    },
    [fetchBackups]
  );

  const handleDownload = useCallback(
    async (backup: Backup) => {
      const backupId = backup.backup_id;
      const backupName = backup.name || 'Unnamed Backup';

      setActionLoading(ACTIONS.DOWNLOAD(backupId));
      try {
        const blob = await downloadBackup(backupId);

        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }

        // ✅ دانلود با پسوند .json.gz
        downloadBlob(blob, backupName);

        showSuccessToast(
          `Backup "${backupName}" downloaded successfully (${(blob.size / 1024).toFixed(1)} KB)`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to download backup "${backupName}"`;
        showErrorToast(message);
        console.error('[BackupPanel] Download error:', err);
      } finally {
        if (mountedRef.current) {
          setActionLoading(null);
        }
      }
    },
    []
  );

  const requestDelete = useCallback((backup: Backup) => {
    setDeleteTarget(backup);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      handleDelete(deleteTarget);
    }
  }, [deleteTarget, handleDelete]);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isCreateDisabled) {
        handleCreateBackup();
      }
    },
    [handleCreateBackup, isCreateDisabled]
  );

  // ============================================================
  // Render Helpers
  // ============================================================
  const renderContent = (): React.ReactElement => {
    if (showSkeleton) return <SkeletonLoader key="skeleton" />;
    if (showError) {
      return <ErrorState key="error" message={error} onRetry={() => fetchBackups(true)} />;
    }
    if (showEmpty) return <EmptyState key="empty" />;

    return (
      <motion.div
        key="list"
        className="bp-list-scroll"
        variants={animations.container}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {backups.map((backup) => (
            <BackupCard
              key={backup.backup_id}
              backup={backup}
              actionLoading={actionLoading}
              isAnyActionLoading={isAnyActionLoading}
              onRestore={handleRestore}
              onDownload={handleDownload}
              onDelete={requestDelete}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="bp-container">
      {/* Header */}
      <motion.div
        className="bp-header"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <div className="bp-header-top">
          <motion.div
            className="bp-header-icon"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <HardDrive size={15} />
          </motion.div>
          <div>
            <h3 className="bp-title">Backup &amp; Restore</h3>
            <p className="bp-subtitle">Save and restore graph snapshots</p>
          </div>
        </div>
      </motion.div>

      {/* Create Section */}
      <motion.div
        className="bp-create-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <label className="bp-create-label" htmlFor="bp-backup-name">
          Create New Backup
        </label>
        <div className="bp-create-row">
          <input
            ref={inputRef}
            id="bp-backup-name"
            type="text"
            className="bp-create-input"
            value={newBackupName}
            onChange={(e) => setNewBackupName(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Enter backup name..."
            disabled={isCreateLoading}
          />
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <ActionButton
              icon={Plus}
              label="Create"
              loading={isCreateLoading}
              onClick={handleCreateBackup}
              variant="primary"
              disabled={isCreateDisabled}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* List Header */}
      <motion.div
        className="bp-list-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
      >
        <div className="bp-list-title">
          <History size={11} />
          <span>Saved Backups</span>
          {hasBackups && (
            <motion.span
              className="bp-list-count"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {backups.length}
            </motion.span>
          )}
        </div>
        <motion.button
          className="bp-refresh-btn"
          onClick={() => fetchBackups()}
          disabled={loading || isRefreshing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Refresh backups"
          type="button"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              isRefreshing
                ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            {loading ? <Loader2 size={12} /> : <RotateCcw size={12} />}
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Backup"
        message={`Are you sure you want to delete "${deleteTarget?.name || 'Unnamed Backup'}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        loading={deleteTarget ? actionLoading === ACTIONS.DELETE(deleteTarget.backup_id) : false}
      />
    </div>
  );
};

export default BackupPanel;