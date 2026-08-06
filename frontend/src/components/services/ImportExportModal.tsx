import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileJson, 
  X, 
  Download, 
  Upload, 
  ArrowUpFromLine, 
  ArrowDownToLine, 
  Loader2, 
  AlertCircle, 
  HardDrive, 
  RotateCcw,
  Database,
  Command,
} from 'lucide-react';
import { useGraphData } from './useGraphData';
import { ExportPanel } from './ExportPanel';
import { ImportPanel } from './ImportPanel';
import { BackupPanel } from './BackupPanel';
import { SavedGraphsPanel } from './SavedGraphsPanel';
import './ImportExportModal.css';

const RAIL_ITEMS = [
  { 
    id: 'import', 
    icon: Upload, 
    label: 'Import', 
    desc: 'Load from file, URL, or paste',
    shortcut: '1',
    accent: 'blue' 
  },
  { 
    id: 'saved-graphs', 
    icon: Database, 
    label: 'Saved Graphs', 
    desc: 'Browse and switch graphs',
    shortcut: '2',
    accent: 'violet' 
  },
  { 
    id: 'export', 
    icon: Download, 
    label: 'Export', 
    desc: 'Download or copy data',
    shortcut: '3',
    accent: 'amber' 
  },
  { 
    id: 'backup', 
    icon: HardDrive, 
    label: 'Backups', 
    desc: 'Snapshot and restore state',
    shortcut: '4',
    accent: 'violet' 
  },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' as const},
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' as const},
  },
};

const dialogVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.96,
    y: 10,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 30,
      mass: 1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 5,
    transition: {
      duration: 0.15,
      ease: 'easeIn' as const,
    },
  },
};

const railItemVariants = {
  initial: { opacity: 0, x: -8 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.05 + i * 0.03,
      type: 'spring' as const,
      stiffness: 400,
      damping: 28,
    },
  }),
  hover: {
    x: 2,
    transition: {
      type: 'spring'as const,
      stiffness: 500,
      damping: 30,
    },
  },
  tap: {
    scale: 0.97,
    transition: {
      type: 'spring'as const,
      stiffness: 600,
      damping: 25,
    },
  },
};

const panelVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 28,
      delay: 0.05,
    },
  },
  exit: { 
    opacity: 0, 
    x: -10,
    transition: {
      duration: 0.15,
      ease: 'easeIn' as const,
    },
  },
};

const loadingVariants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any): void {
    console.error('❌ [ErrorBoundary] Panel crashed:', error);
    console.error('Stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: 20 }}
        >
          <div style={{ 
            background: 'var(--iem-red-dim)',
            border: '1px solid var(--iem-red-border)',
            borderRadius: 'var(--iem-r-md)',
            padding: 16,
          }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--iem-red)',
            }}>
              <AlertCircle size={16} /> Panel Error
            </h4>
            <p style={{ 
              margin: 0, 
              fontSize: 11.5, 
              color: '#f0a3a3',
              lineHeight: 1.5,
            }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <details style={{ marginTop: 10 }}>
              <summary style={{ 
                cursor: 'pointer', 
                fontSize: 10.5, 
                color: 'var(--iem-red)',
                fontWeight: 500,
              }}>
                Technical details
              </summary>
              <pre style={{ 
                background: 'var(--iem-bg-0)',
                color: 'var(--iem-text-2)',
                padding: 10,
                borderRadius: 'var(--iem-r-sm)',
                fontSize: 10,
                overflow: 'auto',
                maxHeight: 150,
                marginTop: 6,
                fontFamily: 'var(--iem-font-mono)',
                lineHeight: 1.5,
              }}>
                {this.state.errorInfo?.componentStack || 'No stack trace'}
              </pre>
            </details>
          </div>
        </motion.div>
      );
    }
    return this.props.children;
  }
}

interface TriggerButtonProps {
  onClick: () => void;
  hasChanges: boolean;
}

function TriggerButton({ onClick, hasChanges }: TriggerButtonProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return (
    <motion.button
      className="iem-trigger"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ y: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      aria-label="Open import and export"
      type="button"
    >
      <motion.span
        animate={{ y: isHovered ? -2 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <ArrowUpFromLine 
          size={14} 
          className="iem-trigger-icon iem-trigger-icon--up"
        />
      </motion.span>
      
      <motion.span
        animate={{ y: isHovered ? 2 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <ArrowDownToLine 
          size={14} 
          className="iem-trigger-icon iem-trigger-icon--down"
        />
      </motion.span>
      
      <span>I/O</span>
      
      {hasChanges && (
        <motion.span
          className="iem-trigger-badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        />
      )}
      
      <AnimatePresence>
        {isHovered && (
          <motion.span
            className="iem-trigger-tooltip"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
          >
            Import / Export
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function LoadingState(): React.ReactElement {
  return (
    <motion.div
      className="iem-loading-container"
      variants={loadingVariants}
      animate="animate"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 size={22} />
      </motion.div>
      <p>Loading graph data…</p>
    </motion.div>
  );
}

interface ImportExportModalProps {
  onImportComplete?: (result: any) => void;
  hasUnsavedChanges?: boolean;
  nodes?: any[];
  edges?: any[];
  selectedNodes?: any[];
  onImport?: (result: any) => void;
  onGraphInvalidate?: () => void;
  onOpenChange?: (open: boolean) => void;
  onGraphSwitch?: (graphId: string, result: any) => void;
}

export function ImportExportModal({ 
  onImportComplete, 
  hasUnsavedChanges = false,
  nodes: externalNodes,
  edges: externalEdges,
  selectedNodes: externalSelectedNodes,
  onImport: externalOnImport,
  onGraphInvalidate,
  onOpenChange,
  onGraphSwitch,
}: ImportExportModalProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('import');
  
  const shouldFetchData = !externalNodes && !externalEdges;
  const { graphData, loading, error, refetch } = useGraphData();

  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      
      const tagName = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
      const isInputFocused = 
        tagName === 'input' || 
        tagName === 'textarea' || 
        tagName === 'select' ||
        isEditable;
      
      if (isInputFocused) return;
      
      const key = e.key;
      if (key >= '1' && key <= '4') {
        e.preventDefault();
        const item = RAIL_ITEMS[parseInt(key) - 1];
        if (item) setActiveSection(item.id);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    const id = 'iem-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const handleImportComplete = useCallback((result: any) => {
    onGraphInvalidate?.();
    externalOnImport?.(result);
    onImportComplete?.(result);
    refetch?.();
    setOpen(false);
  }, [onGraphInvalidate, externalOnImport, onImportComplete, refetch]);

  const handleGraphSwitch = useCallback((graphId: string, result: any) => {
    onGraphSwitch?.(graphId, result);
    onGraphInvalidate?.();
    refetch?.();
    setOpen(false);
  }, [onGraphSwitch, onGraphInvalidate, refetch]);

  const handleRefresh = useCallback(() => {
    refetch?.();
  }, [refetch]);

  const handleBackupRestore = useCallback((result: any) => {
    onGraphInvalidate?.();
    handleImportComplete(result);
    setOpen(false);
  }, [onGraphInvalidate, handleImportComplete]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setActiveSection('import');
    }
  }, []);

  const dataForExport = useMemo(() => 
    shouldFetchData ? graphData : { nodes: externalNodes, edges: externalEdges },
    [shouldFetchData, graphData, externalNodes, externalEdges]
  );
  
  const selectedForExport = externalSelectedNodes || [];

  if (shouldFetchData && error && activeSection === 'export') {
    return (
      <div className="iem-error-state">
        <AlertCircle size={24} />
        <p>Failed to load graph data: {(error as any)?.message || error}</p>
        <button onClick={handleRefresh} type="button">Retry</button>
      </div>
    );
  }

  if (shouldFetchData && error && activeSection === 'import') {
    console.warn('[ImportExportModal] Error loading data but continuing in import mode:', error);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <TriggerButton 
          onClick={() => setOpen(true)} 
          hasChanges={hasUnsavedChanges} 
        />
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(6, 8, 13, 0.72)',
                backdropFilter: 'blur(3px)',
                zIndex: 100,
              }}
              onClick={() => setOpen(false)}
            />
            
            <Dialog.Content asChild onOpenAutoFocus={(e: Event) => e.preventDefault()}>
              <motion.div
                className="iem-dialog"
                variants={dialogVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Dialog.Description style={{ display: 'none' }}>
                  Import, export, and manage graph data
                </Dialog.Description>

                <div className="iem-header">
                  <div className="iem-header-left">
                    <motion.div
                      className="iem-header-icon"
                      whileHover={{ rotate: 15 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <FileJson size={15} />
                    </motion.div>
                    <Dialog.Title className="iem-title">Graph I/O</Dialog.Title>
                    
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      style={{
                        fontSize: 9,
                        color: 'var(--iem-text-3)',
                        background: 'var(--iem-bg-3)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontFamily: 'var(--iem-font-mono)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Command size={9} />
                      <span>1-4</span>
                    </motion.span>
                  </div>
                  
                  <Dialog.Close asChild>
                    <motion.button
                      className="iem-close"
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      aria-label="Close"
                    >
                      <X size={15} />
                    </motion.button>
                  </Dialog.Close>
                </div>

                <AnimatePresence mode="wait">
                  {shouldFetchData && loading ? (
                    <LoadingState key="loading" />
                  ) : (
                    <motion.div
                      key="content"
                      className="iem-body"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 }}
                    >
                      <nav className="iem-rail" aria-label="Graph I/O sections">
                        {RAIL_ITEMS.map(({ id, icon: Icon, label, desc, shortcut, accent }, i: number) => {
                          const isActive = activeSection === id;
                          
                          return (
                            <motion.button
                              key={id}
                              className={`iem-rail-item${isActive ? ' iem-rail-item--active' : ''}`}
                              data-accent={accent}
                              onClick={() => setActiveSection(id)}
                              variants={railItemVariants}
                              custom={i}
                              initial="initial"
                              animate="animate"
                              whileHover="hover"
                              whileTap="tap"
                              aria-current={isActive ? 'page' : undefined}
                              type="button"
                            >
                              <motion.span
                                className="iem-rail-item-icon"
                                animate={isActive ? {
                                  scale: [1, 1.1, 1],
                                  transition: { duration: 0.3 },
                                } : {}}
                              >
                                <Icon size={13} />
                              </motion.span>
                              
                              <span className="iem-rail-item-text">
                                <span className="iem-rail-item-label">{label}</span>
                                <span className="iem-rail-item-desc">{desc}</span>
                              </span>
                              
                              {shortcut && (
                                <motion.span
                                  className="iem-rail-shortcut"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: isActive ? 1 : 0.4 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  {shortcut}
                                </motion.span>
                              )}
                            </motion.button>
                          );
                        })}
                        
                        <div className="iem-rail-divider" />
                        
                        <div className="iem-rail-footer">
                          <motion.button
                            className="iem-rail-refresh"
                            onClick={handleRefresh}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                          >
                            <RotateCcw size={11} />
                            Refresh data
                          </motion.button>
                        </div>
                      </nav>

                      <div className="iem-panel">
                        <div className="iem-panel-scroll">
                          <AnimatePresence mode="wait">
                            {activeSection === 'import' && (
                              <motion.div
                                key="import"
                                variants={panelVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                              >
                                <ErrorBoundary key="import-boundary">
                                  <ImportPanel 
                                    onImport={handleImportComplete}
                                    onRefresh={handleRefresh}
                                    onGraphInvalidate={onGraphInvalidate}
                                  />
                                </ErrorBoundary>
                              </motion.div>
                            )}
                            
                            {activeSection === 'saved-graphs' && (
                              <motion.div
                                key="saved-graphs"
                                variants={panelVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                              >
                                <ErrorBoundary key="saved-graphs-boundary">
                                  <SavedGraphsPanel
                                    onGraphSwitch={handleGraphSwitch}
                                    onRefresh={handleRefresh}
                                  />
                                </ErrorBoundary>
                              </motion.div>
                            )}
                            
                            {activeSection === 'export' && (
                              <motion.div
                                key="export"
                                variants={panelVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                              >
                              <ExportPanel 
                                {...dataForExport}
                                selectedNodes={selectedForExport}
                                onRefresh={handleRefresh} 
                              />
                              </motion.div>
                            )}
                            
                            {activeSection === 'backup' && (
                              <motion.div
                                key="backup"
                                variants={panelVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                              >
                                <BackupPanel onRestore={handleBackupRestore} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export default ImportExportModal;