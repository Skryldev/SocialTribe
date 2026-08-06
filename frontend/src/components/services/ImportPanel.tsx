import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  Link as LinkIcon,
  Eye,
  RefreshCw,
  ArrowDownToLine,
  AlertCircle,
  Check,
  X,
  FileJson,
  Loader2,
  CloudUpload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SelectInput, ActionButton } from './Primitives';
import { importDataset } from './importApi';
import './ImportPanel.css';

const METHODS = [
  { id: 'file', icon: CloudUpload, label: 'File' },
  { id: 'text', icon: FileText, label: 'Paste JSON' },
  { id: 'url', icon: LinkIcon, label: 'URL' },
];

const MERGE_STRATEGIES = [
  { value: 'switch', label: 'Switch (Replace entire graph)' },
  { value: 'merge', label: 'Merge (Skip duplicates)' },
];

const SUPPORTED_FORMATS = ['.json', '.csv', '.pdf', '.graphml', '.txt', '.xml'];
const VALIDATABLE_FORMATS = ['json', 'csv'];
const DIRECT_FORMATS = ['txt', 'pdf', 'graphml', 'xml'];

const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 28 },
  },
  exit: { 
    opacity: 0, 
    y: -6,
    transition: { duration: 0.15 },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 28 },
  },
  exit: { 
    opacity: 0, 
    scale: 0.96,
    transition: { duration: 0.12 },
  },
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  parsed: any;
}

function validateGraphPayload(raw: any): ValidationResult {
  const errors: string[] = [];
  let parsed: any;

  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error: any) {
    return { valid: false, errors: [`JSON parse error: ${error.message}`], parsed: null };
  }

  if (!parsed || typeof parsed !== 'object') {
    errors.push('Root must be a JSON object');
  } else {
    if (!Array.isArray(parsed.nodes)) errors.push('"nodes" must be an array');
    if (!Array.isArray(parsed.edges)) errors.push('"edges" must be an array');
  }

  return { valid: errors.length === 0, errors, parsed: errors.length === 0 ? parsed : null };
}

interface ImportPanelProps {
  onImport?: (result: any) => void;
  onRefresh?: () => void;
  onGraphInvalidate?: () => void;
}

export function ImportPanel({ onImport, onRefresh, onGraphInvalidate }: ImportPanelProps): React.ReactElement {
  const [method, setMethod] = useState<string>('file');
  const [rawText, setRawText] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [mergeStrategy, setMergeStrategy] = useState<string>('switch');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [fileForDataset, setFileForDataset] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [lastImportResult, setLastImportResult] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const toastOptions: any = { duration: 2500, position: 'top-right' };

  const invalidateGraph = useCallback(() => onGraphInvalidate?.(), [onGraphInvalidate]);

  const resetForm = useCallback(() => {
    setRawText('');
    setValidation(null);
    setPreview(null);
    setUrl('');
    setFileForDataset(null);
    setUploadProgress(0);
  }, []);

  const handleImportError = useCallback((error: any) => {
    let errorMessage = 'Import failed';
    
    if (error.response?.detail) {
      if (Array.isArray(error.response.detail)) {
        errorMessage = error.response.detail
          .map((d: any) => `${d.loc?.join('.') || 'field'}: ${d.msg}`)
          .join('; ');
      } else if (typeof error.response.detail === 'string') {
        errorMessage = error.response.detail;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    toast.error(errorMessage, { ...toastOptions, duration: 4000 });
  }, []);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (VALIDATABLE_FORMATS.includes(ext)) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const content = event.target?.result as string;
        setRawText(content);
        setFileForDataset(null);
        const result = validateGraphPayload(content);
        setValidation(result);
        toast[result.valid ? 'success' : 'warning'](
          result.valid ? `Loaded: ${file.name}` : 'Invalid graph structure',
          toastOptions
        );
      };
      reader.onerror = () => toast.error('Failed to read file', toastOptions);
      reader.readAsText(file);
      return;
    }

    if (DIRECT_FORMATS.includes(ext)) {
      setFileForDataset(file);
      setRawText('');
      setValidation(null);
      setPreview(null);
      return;
    }

    toast.error(`Unsupported format: .${ext}`, toastOptions);
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setRawText(value);
    setFileForDataset(null);
    setValidation(value.trim() ? validateGraphPayload(value) : null);
    setPreview(null);
  }, []);

  const handleFetchUrl = useCallback(async () => {
    if (!url.trim()) {
      toast.warning('Please enter a URL', toastOptions);
      return;
    }
    setLoading('url');
    try {
      const response = await fetch(url.trim());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      setRawText(text);
      setFileForDataset(null);
      const result = validateGraphPayload(text);
      setValidation(result);
      toast[result.valid ? 'success' : 'warning'](
        result.valid ? 'URL loaded successfully' : 'Invalid graph content',
        toastOptions
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch URL', toastOptions);
    } finally {
      setLoading(null);
    }
  }, [url]);

  const handlePreview = useCallback(() => {
    if (fileForDataset) {
      toast.info('Preview not available for this format', toastOptions);
      return;
    }
    const result = validateGraphPayload(rawText);
    setValidation(result);
    if (!result.valid) {
      toast.warning('Cannot preview invalid data', toastOptions);
      return;
    }
    setPreview({
      nodes: result.parsed.nodes.slice(0, 5),
      total: { nodes: result.parsed.nodes.length, edges: result.parsed.edges.length },
    });
  }, [rawText, fileForDataset]);

  const performImport = useCallback(async (file: File) => {
    setLoading('import');
    setUploadProgress(0);
    try {
      const result = await importDataset(
        file,
        { mode: mergeStrategy },
        (progress: number) => setUploadProgress(progress)
      );
      setLastImportResult(result);
      toast.success(
        `Imported ${result.total_nodes || 0} nodes, ${result.total_edges || 0} edges`,
        { ...toastOptions, duration: 3000 }
      );
      invalidateGraph();
      onRefresh?.();
      onImport?.(result);
      resetForm();
    } catch (error: any) {
      handleImportError(error);
    } finally {
      setLoading(null);
      setUploadProgress(0);
    }
  }, [mergeStrategy, invalidateGraph, onImport, onRefresh, resetForm, handleImportError]);

  const handleImport = useCallback(async () => {
    if (fileForDataset) {
      await performImport(fileForDataset);
      return;
    }

    if (!rawText.trim()) {
      toast.warning('No data to import', toastOptions);
      return;
    }

    const result = validateGraphPayload(rawText);
    setValidation(result);
    if (!result.valid) {
      toast.error('Invalid graph structure', toastOptions);
      return;
    }

    const blob = new Blob(
      [JSON.stringify({ nodes: result.parsed.nodes, edges: result.parsed.edges })],
      { type: 'application/json' }
    );
    const file = new File([blob], `graph_${Date.now()}.json`, { type: 'application/json' });
    await performImport(file);
  }, [rawText, fileForDataset, performImport]);

  const handleClear = useCallback(() => {
    resetForm();
    setLastImportResult(null);
    toast.info('Form cleared', toastOptions);
  }, [resetForm]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canImport = (!!rawText.trim() || !!fileForDataset) && !loading;

  return (
    <div className="ip-container">
      <motion.div
        className="ip-header"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <div className="ip-header-top">
          <motion.div
            className="ip-header-icon"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Upload size={15} />
          </motion.div>
          <div>
            <h3 className="ip-title">Import Graph</h3>
            <p className="ip-subtitle">Load data from file, JSON, or URL</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {lastImportResult && (
          <motion.div
            className="ip-last-import"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="ip-last-import-inner">
              <Check size={13} />
              <span>
                Last import: <strong>{lastImportResult.file_name}</strong>
              </span>
              <span className="ip-last-import-meta">
                {lastImportResult.total_nodes} nodes · {lastImportResult.total_edges} edges
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="ip-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <label className="ip-section-label">Source</label>
        <div className="ip-method-tabs" role="tablist">
          {METHODS.map(({ id, icon: Icon, label }) => (
            <motion.button
              key={id}
              role="tab"
              aria-selected={method === id}
              className={`ip-method-tab${method === id ? ' ip-method-tab--active' : ''}`}
              onClick={() => setMethod(id)}
              disabled={!!loading}
              whileTap={{ scale: 0.97 }}
            >
              <Icon size={13} />
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {method === 'file' && (
          <motion.div
            key="file"
            className="ip-section"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div
              className={`ip-upload-area${isDragOver ? ' ip-upload-area--active' : ''}`}
              onDragOver={(e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onClick={() => document.getElementById('ip-file-input')?.click()}
              whileHover={{ borderColor: 'var(--iem-blue-border)' }}
            >
              <Upload size={22} className="ip-upload-icon" />
              <p className="ip-upload-text">
                Drop file here or <strong>browse</strong>
              </p>
              <p className="ip-upload-hint">
                {SUPPORTED_FORMATS.join(', ')}
              </p>
              <input
                id="ip-file-input"
                type="file"
                accept={SUPPORTED_FORMATS.join(',')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </motion.div>

            <AnimatePresence>
              {fileForDataset && (
                <motion.div
                  className="ip-file-card"
                  variants={fadeSlide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <div className="ip-file-card-icon">
                    <FileJson size={15} />
                  </div>
                  <div className="ip-file-card-info">
                    <div className="ip-file-card-name">{fileForDataset.name}</div>
                    <div className="ip-file-card-meta">
                      <span>{formatFileSize(fileForDataset.size)}</span>
                      <span className="ip-file-card-badge">
                        {fileForDataset.name.split('.').pop()}
                      </span>
                    </div>
                  </div>
                  <button
                    className="ip-file-card-remove"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setFileForDataset(null);
                    }}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {rawText && !fileForDataset && (
                <motion.div
                  className={`ip-status ${validation?.valid ? 'ip-status--success' : validation ? 'ip-status--error' : ''}`}
                  variants={fadeSlide}
                  initial="initial"
                  animate="animate"
                >
                  <span className="ip-status-dot" />
                  {rawText.length.toLocaleString()} characters loaded
                  {validation?.valid && ' • Valid graph'}
                  {validation && !validation.valid && ' • Invalid structure'}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {method === 'text' && (
          <motion.div
            key="text"
            className="ip-section"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <textarea
              className={`ip-textarea${validation && !validation.valid ? ' ip-textarea--error' : ''}`}
              value={rawText}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleTextChange(event.target.value)}
              placeholder={'{\n  "nodes": [\n    { "id": "1", "label": "Node 1" }\n  ],\n  "edges": [\n    { "source": "1", "target": "2" }\n  ]\n}'}
              rows={10}
              disabled={!!loading}
              spellCheck={false}
            />
            <AnimatePresence>
              {rawText && (
                <motion.div
                  className={`ip-status ${validation?.valid ? 'ip-status--success' : 'ip-status--error'}`}
                  variants={fadeSlide}
                  initial="initial"
                  animate="animate"
                >
                  <span className="ip-status-dot" />
                  {rawText.length.toLocaleString()} characters
                  {validation?.valid && ' • Valid JSON'}
                  {validation && !validation.valid && ' • Invalid'}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {method === 'url' && (
          <motion.div
            key="url"
            className="ip-section"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="ip-url-row">
              <input
                className="ip-url-input"
                placeholder="https://example.com/graph-data.json"
                value={url}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)}
                onKeyDown={(event: React.KeyboardEvent) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleFetchUrl();
                  }
                }}
                disabled={!!loading}
              />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <ActionButton
                  icon={loading === 'url' ? Loader2 : RefreshCw}
                  label="Fetch"
                  loading={loading === 'url'}
                  onClick={handleFetchUrl}
                  variant="secondary"
                />
              </motion.div>
            </div>
            <AnimatePresence>
              {rawText && (
                <motion.div
                  className="ip-status ip-status--success"
                  variants={fadeSlide}
                  initial="initial"
                  animate="animate"
                >
                  <Check size={11} />
                  Loaded {rawText.length.toLocaleString()} bytes
                  {validation?.valid && ' • Valid graph'}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <motion.div
            className="ip-progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="ip-progress-track">
              <motion.div
                className="ip-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              />
            </div>
            <span className="ip-progress-text">{uploadProgress}%</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {validation && !validation.valid && (
          <motion.div
            className="ip-validation"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="ip-validation-header">
              <AlertCircle size={12} />
              Validation Errors
            </div>
            <div className="ip-validation-list">
              {validation.errors.map((error: string, index: number) => (
                <motion.div
                  key={index}
                  className="ip-validation-item"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <span className="ip-validation-item-code">ERR</span>
                  {error}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="ip-merge-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <label className="ip-section-label">Merge Strategy</label>
        <SelectInput
          value={mergeStrategy}
          onValueChange={setMergeStrategy}
          options={MERGE_STRATEGIES}
          disabled={!!loading}
        />
      </motion.div>

      <AnimatePresence>
        {preview && (
          <motion.div
            className="ip-preview"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="ip-preview-header">
              <Eye size={12} />
              Data Preview
            </div>
            <div className="ip-preview-stats">
              <div className="ip-preview-stat">
                <span className="ip-preview-stat-val">{preview.total.nodes}</span>
                <span className="ip-preview-stat-label">Nodes</span>
              </div>
              <div className="ip-preview-stat">
                <span className="ip-preview-stat-val">{preview.total.edges}</span>
                <span className="ip-preview-stat-label">Edges</span>
              </div>
            </div>
            <span className="ip-preview-label">First {preview.nodes.length} nodes</span>
            {preview.nodes.map((node: any, index: number) => (
              <motion.div
                key={index}
                className="ip-preview-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
              >
                <span className="ip-preview-id">{node.id ?? index}</span>
                <span className="ip-preview-name">
                  {node.data?.name ?? node.data?.label ?? node.label ?? '—'}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="ip-actions"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, type: 'spring', stiffness: 400, damping: 28 }}
      >
        <ActionButton
          icon={Eye}
          label="Preview"
          onClick={handlePreview}
          variant="ghost"
          disabled={!rawText.trim() && !fileForDataset}
        />
        <ActionButton
          icon={X}
          label="Clear"
          onClick={handleClear}
          variant="ghost"
          disabled={!rawText.trim() && !url && !fileForDataset}
        />
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <ActionButton
            icon={loading === 'import' ? Loader2 : ArrowDownToLine}
            label={loading === 'import' ? 'Importing...' : 'Import'}
            loading={loading === 'import'}
            onClick={handleImport}
            variant="primary"
            disabled={!canImport}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}