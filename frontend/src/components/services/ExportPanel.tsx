import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Globe,
  Share2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ActionButton, Toggle } from './Primitives';
import { getGraphNetwork } from './importApi';
import { convertToFormat, FORMAT_META } from './graphConverters';
import './ExportPanel.css';

const TOAST_CONFIG: any = { duration: 2500, position: 'top-right' };
const PREVIEW_LINES = 10;

const ICON_MAP: any = {
  FileJson,
  FileSpreadsheet,
  Globe,
  Share2,
};

const triggerDownload = (content: string, filename: string, mimeType: string = 'application/json'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const highlightCode = (text: string, format: string): string => {
  const category = FORMAT_META[format]?.category || 'json';

  if (category === 'xml') {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("[^"]*")/g, '<span class="ep-code-str">$1</span>')
      .replace(/(&lt;\/?)([\w.]+)/g, '$1<span class="ep-code-key">$2</span>')
      .replace(/(\s+)([\w-]+)=/g, '$1<span class="ep-code-key">$2</span>=');
  }

  if (category === 'csv') {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^#.*$/gm, '<span class="ep-code-comment">$&</span>');
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="ep-code-key">"$1"</span><span class="ep-code-punc">:</span>')
    .replace(/: "([^"]*)"/g, ': <span class="ep-code-str">"$1"</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="ep-code-num">$1</span>')
    .replace(/: (true|false)/g, ': <span class="ep-code-bool">$1</span>')
    .replace(/: (null)/g, ': <span class="ep-code-null">$1</span>');
};

const generateFilename = (nodeCount: number, edgeCount: number): string => {
  const date = new Date();
  const timestamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '_',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('');
  return `graph_${nodeCount}n_${edgeCount}e_${timestamp}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const calculateDensity = (nodes: number, edges: number): string => {
  if (nodes < 2) return '0';
  return ((edges / (nodes * (nodes - 1))) * 100).toFixed(1);
};

const showSuccessToast = (msg: string) => toast.success(msg, TOAST_CONFIG);
const showErrorToast = (msg: string) => toast.error(msg, TOAST_CONFIG);

const animations: any = {
  fadeSlide: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
  },
  statCard: {
    initial: { opacity: 0, y: 8 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.05 + i * 0.05, type: 'spring', stiffness: 400, damping: 28 },
    }),
  },
};

interface EmptyStateProps {
  onRefresh: () => void;
  loading: boolean;
}

const EmptyState = ({ onRefresh, loading }: EmptyStateProps): React.ReactElement => (
  <motion.div className="ep-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="ep-empty-icon">
      <FileJson size={24} />
    </div>
    <h4 className="ep-empty-title">No graph data available</h4>
    <p className="ep-empty-desc">Add nodes and edges, then refresh to export</p>
    <ActionButton
      icon={loading ? Loader2 : RefreshCw}
      label="Refresh"
      onClick={onRefresh}
      variant="secondary"
      size="sm"
      loading={loading}
    />
  </motion.div>
);

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState = ({ message, onRetry }: ErrorStateProps): React.ReactElement => (
  <motion.div className="ep-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="ep-empty-icon ep-empty-icon--error">
      <AlertCircle size={24} />
    </div>
    <h4 className="ep-empty-title">Failed to load graph</h4>
    <p className="ep-empty-desc">{message}</p>
    <ActionButton icon={RefreshCw} label="Retry" onClick={onRetry} variant="secondary" size="sm" />
  </motion.div>
);

const SkeletonLoader = () => (
  <div className="ep-skeleton">
    <div className="ep-skeleton-stats">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ep-skeleton-stat" />
      ))}
    </div>
    <div className="ep-skeleton-formats">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="ep-skeleton-format" />
      ))}
    </div>
    <div className="ep-skeleton-preview" />
  </div>
);

interface StatCardProps {
  value: string | number;
  label: string;
  accent: string;
  index: number;
}

const StatCard = ({ value, label, accent, index }: StatCardProps): React.ReactElement => (
  <motion.div
    className={`ep-stat-card ep-stat-card--${accent}`}
    variants={animations.statCard}
    custom={index}
    initial="initial"
    animate="animate"
    whileHover={{ y: -2 }}
  >
    <span className="ep-stat-value">{value}</span>
    <span className="ep-stat-label">{label}</span>
  </motion.div>
);

export function ExportPanel(): React.ReactElement {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [format, setFormat] = useState<string>('json-pretty');
  const [includeFullMetadata, setIncludeFullMetadata] = useState<boolean>(true);
  const [filename, setFilename] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];
  const hasData = nodes.length > 0 || edges.length > 0;
  const density = calculateDensity(nodes.length, edges.length);

  const serialized = useMemo(() => {
    if (!graphData) return '';
    return convertToFormat(nodes, edges, format, includeFullMetadata);
  }, [graphData, format, includeFullMetadata]);

  const preview = useMemo(() => {
    if (!serialized) return { html: '', truncated: false, size: 0, totalLines: 0 };

    const lines = serialized.split('\n');
    const snippet = lines.slice(0, PREVIEW_LINES).join('\n');

    return {
      html: highlightCode(snippet, format),
      truncated: lines.length > PREVIEW_LINES,
      size: new Blob([serialized]).size,
      totalLines: lines.length,
    };
  }, [serialized, format]);

  const fetchGraph = useCallback(async (showLoader: boolean = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const data = await getGraphNetwork();
      setGraphData(data);
    } catch (err: any) {
      const message = err.message || 'Failed to fetch graph data';
      setError(message);
      showErrorToast(message);
      console.error('[ExportPanel] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (hasData) {
      setFilename((prev: string) => prev || generateFilename(nodes.length, edges.length));
    }
  }, [hasData, nodes.length, edges.length]);

  const handleCopy = useCallback(async () => {
    setActionLoading('copy');
    try {
      await navigator.clipboard.writeText(serialized);
      setCopied(true);
      showSuccessToast('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showErrorToast('Clipboard write failed');
    } finally {
      setActionLoading(null);
    }
  }, [serialized]);

  const handleDownload = useCallback(() => {
    setActionLoading('download');
    try {
      const baseName = filename.trim() || generateFilename(nodes.length, edges.length);
      const meta = FORMAT_META[format];
      const finalFilename = `${baseName}.${meta.ext}`;
      triggerDownload(serialized, finalFilename, meta.mime);
      showSuccessToast(`Downloaded as ${finalFilename}`);
    } catch {
      showErrorToast('Download failed');
    } finally {
      setActionLoading(null);
    }
  }, [serialized, filename, format, nodes.length, edges.length]);

  if (loading && !graphData) {
    return (
      <div className="ep-container">
        <Header subtitle="Loading graph data..." />
        <SkeletonLoader />
      </div>
    );
  }

  if (error && !graphData) {
    return (
      <div className="ep-container">
        <Header subtitle="Error loading data" />
        <ErrorState message={error} onRetry={() => fetchGraph(true)} />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="ep-container">
        <Header subtitle="No data to export" />
        <EmptyState onRefresh={() => fetchGraph(true)} loading={loading} />
      </div>
    );
  }

  return (
    <div className="ep-container">
      <Header subtitle="Choose format and download your data" />

      <motion.div className="ep-stats">
        <StatCard value={nodes.length} label="Nodes" accent="blue" index={0} />
        <StatCard value={edges.length} label="Edges" accent="violet" index={1} />
        <StatCard value={`${density}%`} label="Density" accent="amber" index={2} />
      </motion.div>

      <motion.div
        className="ep-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
      >
        <label className="ep-section-label">Format</label>
        <div className="ep-format-grid">
          {Object.entries(FORMAT_META).map(([key, meta]: [string, any]) => {
            const Icon = ICON_MAP[meta.icon] || FileJson;
            const isActive = format === key;

            return (
              <motion.button
                key={key}
                className={`ep-format-option${isActive ? ' ep-format-option--active' : ''}`}
                onClick={() => setFormat(key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
              >
                <Icon size={14} className="ep-format-icon" />
                <div className="ep-format-info">
                  <span className="ep-format-name">{meta.label}</span>
                  <span className="ep-format-ext">.{meta.ext}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="ep-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <label className="ep-section-label">Preview</label>
        <div className="ep-preview">
          <div className="ep-preview-header">
            <span className="ep-preview-format">
              {React.createElement(ICON_MAP[FORMAT_META[format].icon] || FileJson, { size: 12 })}
              {FORMAT_META[format].label}
            </span>
            <span className="ep-preview-size">{formatBytes(preview.size)}</span>
          </div>
          <pre
            className="ep-preview-code"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
          {preview.truncated && (
            <div className="ep-preview-truncated">
              ... {preview.totalLines - PREVIEW_LINES} more lines
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        className="ep-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12 }}
      >
        <label className="ep-section-label">Filename (optional)</label>
        <div className="ep-filename-row">
          <input
            className="ep-filename-input"
            placeholder={generateFilename(nodes.length, edges.length)}
            value={filename}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilename(e.target.value)}
          />
          <span className="ep-filename-ext">.{FORMAT_META[format].ext}</span>
        </div>
      </motion.div>

      <motion.div
        className="ep-toggle-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.14 }}
      >
        <Toggle
          checked={includeFullMetadata}
          onCheckedChange={setIncludeFullMetadata}
          label="Include full metadata"
          description={
            includeFullMetadata
              ? 'All node/edge properties and timestamps will be exported'
              : 'Only essential fields (id, type, position, data) will be preserved'
          }
        />

        <AnimatePresence>
          {!includeFullMetadata && (
            <motion.div
              className="ep-warning"
              variants={animations.fadeSlide}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <AlertCircle size={13} />
              <span>
                Minimal export preserves only essential fields. Some metadata may be
                lost during re-import.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="ep-actions"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, type: 'spring', stiffness: 400, damping: 28 }}
      >
        <ActionButton
          icon={RefreshCw}
          label="Refresh"
          onClick={() => fetchGraph(false)}
          variant="ghost"
          loading={loading}
        />
        <ActionButton
          icon={copied ? Check : Copy}
          label={copied ? 'Copied!' : 'Copy'}
          loading={actionLoading === 'copy'}
          onClick={handleCopy}
          variant="secondary"
        />
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <ActionButton
            icon={Download}
            label="Download"
            loading={actionLoading === 'download'}
            onClick={handleDownload}
            variant="primary"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

interface HeaderProps {
  subtitle: string;
}

function Header({ subtitle }: HeaderProps): React.ReactElement {
  return (
    <motion.div
      className="ep-header"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      <div className="ep-header-top">
        <motion.div
          className="ep-header-icon"
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <Download size={15} />
        </motion.div>
        <div>
          <h3 className="ep-title">Export Graph</h3>
          <p className="ep-subtitle">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}