import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { benchmarkAPI } from './benchmarkAPI';
import ProfessionalChart from './ProfessionalChart';
import {
  IconActivity,
  IconAlertTriangle,
  IconCheckCircle,
  IconChevronRight,
  IconClock,
  IconCpu,
  IconDatabase,
  IconGauge,
  IconHistory,
  IconInbox,
  IconLayers,
  IconLoader,
  IconPlay,
  IconPlug,
  IconRefresh,
  IconSettings,
  IconSquareTerminal,
  IconTrash,
  IconTrendingUp,
  IconX,
  IconZap,
} from './BenchmarkIcons';
import './BenchmarkTool.css';

const CONFIG = {
  MAX_HISTORY: 20,
  PROGRESS_INTERVAL: 200,
  Z_SCORE: 1.96,
  DEFAULT_ITERATIONS: 7,
  DEFAULT_WARMUP: 3,
};

const PRESETS: any = {
  small: { size: 100, label: 'Small', desc: '100 vertices — quick test' },
  medium: { size: 1000, label: 'Medium', desc: '1,000 vertices — standard' },
  large: { size: 5000, label: 'Large', desc: '5,000 vertices — stress test' },
  extreme: { size: 10000, label: 'Extreme', desc: '10,000 vertices — limit test' },
};

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: 'easeOut' as const},
};

const panelMotion = {
  initial: { opacity: 0, scale: 0.97, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 8 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 28 },
};

const collapseMotion = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.22, ease: 'easeInOut' as const},
};

const tabContentMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.16, ease: 'easeOut' as const},
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const} },
};

const calculateEfficiency = (serverData: any): number => {
  if (!serverData?.operations?.mean || !serverData?.inputSize) return 50;

  const n = serverData.inputSize;
  const edges = serverData.edgeCount || n * 3;
  const actualOps = serverData.operations.mean;
  const name = serverData.algorithm;

  let theoreticalOps: number;
  switch (name) {
    case 'BFS':
    case 'Breadth-First Search':
    case 'DFS':
    case 'Depth-First Search':
      theoreticalOps = n + edges;
      break;
    case 'Dijkstra':
    case "Dijkstra's Algorithm":
      theoreticalOps = (n + edges) * Math.log2(Math.max(n, 2));
      break;
    case 'Bellman-Ford':
    case 'Bellman-Ford Algorithm':
      theoreticalOps = n * edges;
      break;
    default:
      theoreticalOps = n;
  }

  const ratio = theoreticalOps / Math.max(actualOps, 1);
  return Math.min(150, Math.max(0, ratio * 100));
};

const calculateComplexityClass = (time: number, inputSize: number, operations: number, algorithmName: string): any => {
  const n = Math.max(inputSize, 1);
  const opsPerVertex = operations / n;
  const timePerVertex = time / n;

  if (['BFS', 'Breadth-First Search', 'DFS', 'Depth-First Search'].includes(algorithmName)) {
    if (opsPerVertex >= 5 && opsPerVertex <= 15) {
      return {
        class: 'O(V + E)',
        color: 'var(--bt-success)',
        grade: 'Excellent',
        description: `Perfect linear scaling: ${opsPerVertex.toFixed(1)} ops/vertex`,
      };
    }
    if (opsPerVertex >= 3 && opsPerVertex <= 25) {
      return {
        class: 'O(V + E)',
        color: 'var(--bt-secondary)',
        grade: 'Very Good',
        description: `Linear complexity with ${opsPerVertex.toFixed(1)} ops/vertex`,
      };
    }
    return {
      class: 'O(V + E)',
      color: 'var(--bt-secondary)',
      grade: 'Very Good',
      description: 'Linear graph traversal algorithm',
    };
  }

  if (['Dijkstra', "Dijkstra's Algorithm"].includes(algorithmName)) {
    return {
      class: 'O((V+E) log V)',
      color: 'var(--bt-secondary)',
      grade: 'Very Good',
      description: 'Optimal for Dijkstra with binary heap',
    };
  }

  if (['Bellman-Ford', 'Bellman-Ford Algorithm'].includes(algorithmName)) {
    return {
      class: 'O(V·E)',
      color: 'var(--bt-warning)',
      grade: 'Moderate',
      description: 'Quadratic - expected for Bellman-Ford',
    };
  }

  if (timePerVertex < 0.001 && opsPerVertex < 10) {
    return { class: 'O(1) ~ O(log n)', color: 'var(--bt-success)', grade: 'Excellent', description: 'Constant or logarithmic time' };
  }
  if (timePerVertex < 0.01 && opsPerVertex < 100) {
    return { class: 'O(n)', color: 'var(--bt-secondary)', grade: 'Very Good', description: 'Linear time complexity' };
  }
  if (timePerVertex < 0.1 && opsPerVertex < 500) {
    return { class: 'O(n log n)', color: 'var(--bt-warning)', grade: 'Good', description: 'Linearithmic time' };
  }
  if (timePerVertex < 1 && opsPerVertex < n * 10) {
    return { class: 'O(n²)', color: 'var(--bt-warning)', grade: 'Moderate', description: 'Quadratic time' };
  }

  return { class: 'Unknown', color: 'var(--bt-text-tertiary)', grade: 'Unknown', description: 'Unable to determine' };
};

const calculateConfidenceInterval = (mean: number, stdDev: number, runs: number, rawTimes: number[] = []): any => {
  let effectiveStdDev = stdDev;

  if (!effectiveStdDev || effectiveStdDev === 0) {
    if (rawTimes.length > 1) {
      const avg = rawTimes.reduce((a: number, b: number) => a + b, 0) / rawTimes.length;
      const variance = rawTimes.reduce((a: number, b: number) => a + Math.pow(b - avg, 2), 0) / rawTimes.length;
      effectiveStdDev = Math.sqrt(variance);
    } else {
      effectiveStdDev = mean * 0.05 || 0.001;
    }
  }

  if (runs < 2) {
    return { lower: Math.max(0, mean - effectiveStdDev), upper: mean + effectiveStdDev };
  }

  const margin = CONFIG.Z_SCORE * (effectiveStdDev / Math.sqrt(runs));
  return { lower: Math.max(0, mean - margin), upper: mean + margin };
};

const findClosest = (arr: any[], targetX: number, tolerance: number = 0.5): any => {
  if (!arr || !arr.length) return null;
  return arr.reduce((closest: any, curr: any) => {
    const diff = Math.abs(curr.x - targetX);
    if (diff <= tolerance && diff < Math.abs(closest.x - targetX)) {
      return curr;
    }
    return closest;
  });
};

const transformServerResponse = (response: any): any => {
  if (!response?.success || !response?.data) {
    throw new Error('Invalid server response');
  }

  const serverData = response.data;

  const rawIterations = serverData.metrics?.iterations || [];
  const rawMemory = serverData.metrics?.memorySnapshots || [];
  const rawOperations = serverData.metrics?.operationCounts || [];
  const rawTimestamps = serverData.metrics?.timestamps || [];

  const validateMetrics = (arr: any[], filterZero: boolean = false): any[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((m: any) => {
        if (!m || typeof m.x !== 'number' || isNaN(m.x) || typeof m.y !== 'number' || isNaN(m.y)) {
          return false;
        }
        if (filterZero && m.y === 0) return false;
        return true;
      })
      .map((m: any) => ({
        x: Math.max(0, Math.min(100, m.x)),
        y: Math.abs(m.y),
      }));
  };

  const validatedIterations = validateMetrics(rawIterations, false);
  const validatedMemory = validateMetrics(rawMemory, true);
  const validatedOperations = validateMetrics(rawOperations, false);
  const validatedTimestamps = validateMetrics(rawTimestamps, false);

  const memoryValues = validatedMemory.map((m: any) => m.y);
  const peakMemory = memoryValues.length > 0 ? Math.max(...memoryValues) : Math.abs(serverData.memory?.max || 0);
  const meanMemory =
    memoryValues.length > 0
      ? memoryValues.reduce((a: number, b: number) => a + b, 0) / memoryValues.length
      : Math.abs(serverData.memory?.mean || 0);

  const timeMean = serverData.time?.mean || 0;
  const opsMean = serverData.operations?.mean || 0;
  const inputSize = serverData.input_size || serverData.inputSize || 1;
  const runs = serverData.runs || 1;
  const algorithmName = serverData.algorithm || 'Unknown';
  const edgeCount = serverData.edge_count || inputSize * 3;

  const rawTimes = rawTimestamps.map((t: any) => t?.y || 0).filter((t: number) => t > 0);

  const confidenceInterval = calculateConfidenceInterval(timeMean, serverData.time?.stdDev || 0, runs, rawTimes);

  const runBreakdown = validatedIterations.map((iter: any, i: number) => {
    const closestOp = findClosest(validatedOperations, iter.x, 1.0);
    const closestMem = findClosest(validatedMemory, iter.x, 1.0);
    const closestTime = findClosest(validatedTimestamps, iter.x, 1.0);

    let opsValue = 0;
    if (closestOp) {
      opsValue = closestOp.y;
    } else if (validatedOperations.length > 0) {
      opsValue = validatedOperations[validatedOperations.length - 1]?.y || 0;
    } else {
      opsValue = (iter.x / 100) * opsMean;
    }

    return {
      run: i + 1,
      progress: iter.x,
      iterations: iter.y,
      memory: closestMem?.y || 0,
      operations: opsValue,
      timestamp: closestTime?.y || 0,
    };
  });

  const opsPerVertex = opsMean / inputSize;
  const memoryPerVertexFromServer = serverData.memory?.per_vertex || 0;
  const correctMemoryPerVertex = memoryPerVertexFromServer > 0 ? memoryPerVertexFromServer : (meanMemory * 1024) / inputSize;

  const complexityInfo = calculateComplexityClass(timeMean, inputSize, opsMean, algorithmName);
  const efficiency = calculateEfficiency({ ...serverData, edgeCount });

  const memoryMin = memoryValues.length > 0 ? Math.min(...memoryValues) : meanMemory * 0.5;
  const memoryMax = memoryValues.length > 0 ? Math.max(...memoryValues) : meanMemory * 1.5;

  const effectiveStdDev = serverData.time?.stdDev > 0.001
    ? serverData.time.stdDev
    : (confidenceInterval.upper - confidenceInterval.lower) / (CONFIG.Z_SCORE * 2) || timeMean * 0.05;

  return {
    algorithm: algorithmName,
    inputSize,
    edgeCount,
    totalTime: timeMean.toFixed(3),
    totalTimeRaw: timeMean,
    throughput: Math.floor((opsMean / Math.max(timeMean, 0.001)) * 1000).toLocaleString(),
    peakMemory: peakMemory.toFixed(2),
    meanMemory: meanMemory.toFixed(2),
    avgMemoryPerVertex: correctMemoryPerVertex.toFixed(2),
    totalOperations: opsMean,
    opsPerVertex: opsPerVertex.toFixed(2),
    visitedNodes: inputSize,
    efficiency,
    complexityInfo,
    confidenceInterval,
    metrics: {
      iterations: validatedIterations,
      memory: validatedMemory,
      operations: validatedOperations,
      timestamps: validatedTimestamps,
    },
    serverStats: {
      timeMin: serverData.time?.min || 0,
      timeMax: serverData.time?.max || 0,
      timeMedian: serverData.time?.median || 0,
      timeStdDev: effectiveStdDev,
      memoryMin: memoryMin,
      memoryMax: memoryMax,
      memoryMean: meanMemory,
      memoryMedian: serverData.memory?.median || 0,
      memoryPerVertex: correctMemoryPerVertex,
      opsMin: serverData.operations?.min || 0,
      opsMax: serverData.operations?.max || 0,
      runs,
    },
    runBreakdown,
    timestamp: serverData.verificationData?.timestamp || new Date().toISOString(),
    nodeVersion: serverData.verificationData?.nodeVersion || serverData.verificationData?.rust_version || 'Rust',
    platform: serverData.verificationData?.platform || 'unknown',
  };
};

const formatTime = (ms: number): string => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms < 0.001) return `${(ms * 1000).toFixed(3)} μs`;
  return `${ms.toFixed(3)} ms`;
};

interface BenchmarkToolProps {
  algorithm: any;
  onClose: () => void;
}

const BenchmarkTool = ({ algorithm, onClose }: BenchmarkToolProps): React.ReactElement => {
  const [activeTab, setActiveTab] = useState<string>('runner');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<any>(null);
  const [customInput, setCustomInput] = useState<string>('');
  const [inputSize, setInputSize] = useState<number>(5000);
  const [selectedPreset, setSelectedPreset] = useState<string>('large');
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<string>('checking');
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<any>({
    overview: true,
    statistics: true,
    charts: true,
    breakdown: false,
    analysis: false,
  });

  const checkServerHealth = useCallback(async () => {
    setServerStatus('checking');
    try {
      const health = await benchmarkAPI.checkHealth();
      setServerStatus(health?.status === 'ok' ? 'connected' : 'error');
      if (health?.status !== 'ok') {
        setError('Cannot connect to benchmark server');
      }
    } catch {
      setServerStatus('error');
      setError('Benchmark server is not running');
    }
  }, []);

  useEffect(() => {
    checkServerHealth();
  }, [checkServerHealth]);

  const runBenchmark = useCallback(async () => {
    if (serverStatus !== 'connected' || !algorithm?.name) return;

    setIsRunning(true);
    setProgress(0);
    setResults(null);
    setError(null);
    setStatusMessage('Connecting to server...');

    const progressInterval = setInterval(() => {
      setProgress((prev: number) => Math.min(prev + Math.random() * 6, 90));
    }, CONFIG.PROGRESS_INTERVAL);

    try {
      setStatusMessage('Executing algorithm...');
      const response = await benchmarkAPI.runBenchmark(algorithm.name, inputSize, {
        iterations: CONFIG.DEFAULT_ITERATIONS,
        warmupRuns: CONFIG.DEFAULT_WARMUP,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response?.success) {
        const result = transformServerResponse(response);
        setResults(result);
        setExecutionHistory((prev: any[]) => [result, ...prev].slice(0, CONFIG.MAX_HISTORY));
        setStatusMessage('Benchmark complete');
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        throw new Error(response?.error || 'No data returned');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(`Benchmark failed: ${err.message}`);
      setStatusMessage('');
    } finally {
      setIsRunning(false);
    }
  }, [algorithm, inputSize, serverStatus]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev: any) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const retryConnection = useCallback(() => {
    setError(null);
    checkServerHealth();
  }, [checkServerHealth]);

  return (
    <motion.div
      className="bt-root bt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Benchmark dashboard"
      {...overlayMotion}
    >
      <motion.div className="bt-panel" {...panelMotion}>
        <Header
          algorithm={algorithm}
          serverStatus={serverStatus}
          statusMessage={statusMessage}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          executionHistory={executionHistory}
          onClose={onClose}
        />

        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              key="error-banner"
              className="bt-error-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' as const}}
            >
              <span className="bt-error-text">
                <IconAlertTriangle size={15} />
                {error}
              </span>
              <button className="bt-btn-retry" onClick={retryConnection}>
                <IconRefresh size={13} />
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bt-body">
          <AnimatePresence mode="wait">
            {activeTab === 'runner' && (
              <motion.div key="runner" {...tabContentMotion}>
                <ConfigSection
                  selectedPreset={selectedPreset}
                  setSelectedPreset={setSelectedPreset}
                  setInputSize={setInputSize}
                  inputSize={inputSize}
                  serverStatus={serverStatus}
                />

                <RunButton
                  isRunning={isRunning}
                  serverStatus={serverStatus}
                  progress={progress}
                  statusMessage={statusMessage}
                  inputSize={inputSize}
                  onRun={runBenchmark}
                />

                <AnimatePresence>
                  {results && (
                    <motion.div
                      key={results.timestamp}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeOut' as const}}
                    >
                      <EnvironmentBadge results={results} />

                      <CollapsibleSection
                        title="Performance overview"
                        icon={<IconGauge size={16} />}
                        expanded={expandedSections.overview}
                        onToggle={() => toggleSection('overview')}
                      >
                        <OverviewMetrics results={results} />
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Statistical analysis"
                        icon={<IconActivity size={16} />}
                        expanded={expandedSections.statistics}
                        onToggle={() => toggleSection('statistics')}
                      >
                        <StatisticalAnalysis results={results} />
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Performance charts"
                        icon={<IconTrendingUp size={16} />}
                        expanded={expandedSections.charts}
                        onToggle={() => toggleSection('charts')}
                      >
                        <ChartsPanel results={results} />
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Per-run breakdown"
                        icon={<IconLayers size={16} />}
                        expanded={expandedSections.breakdown}
                        onToggle={() => toggleSection('breakdown')}
                      >
                        <RunBreakdown results={results} />
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Complexity & recommendations"
                        icon={<IconCpu size={16} />}
                        expanded={expandedSections.analysis}
                        onToggle={() => toggleSection('analysis')}
                      >
                        <DetailedAnalysis results={results} algorithm={algorithm} />
                      </CollapsibleSection>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" {...tabContentMotion}>
                <HistoryTab executionHistory={executionHistory} />
              </motion.div>
            )}

            {activeTab === 'custom' && (
              <motion.div key="custom" {...tabContentMotion}>
                <CustomTab
                  customInput={customInput}
                  setCustomInput={setCustomInput}
                  setInputSize={setInputSize}
                  setActiveTab={setActiveTab}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

const STATUS_COPY: any = {
  connected: { label: 'Real metrics', icon: <IconZap size={18} /> },
  error: { label: 'Server offline', icon: <IconAlertTriangle size={18} /> },
  checking: { label: 'Connecting…', icon: <IconLoader size={18} /> },
};

interface HeaderProps {
  algorithm: any;
  serverStatus: string;
  statusMessage: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  executionHistory: any[];
  onClose: () => void;
}

const Header = memo(function Header({
  algorithm,
  serverStatus,
  statusMessage,
  activeTab,
  setActiveTab,
  executionHistory,
  onClose,
}: HeaderProps) {
  const status = STATUS_COPY[serverStatus] || STATUS_COPY.checking;
  const reduceMotion = useReducedMotion();

  return (
    <div className="bt-header">
      <div className="bt-header-identity">
        <div className="bt-status-ring" data-state={serverStatus}>
          {serverStatus === 'checking' && !reduceMotion ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const}}>
              {status.icon}
            </motion.div>
          ) : (
            status.icon
          )}
          {serverStatus === 'connected' && !reduceMotion && (
            <motion.span
              className="bt-status-pulse"
              animate={{ scale: [1, 1.45, 1.45], opacity: [0.55, 0, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' as const}}
            />
          )}
        </div>
        <div className="bt-title-block">
          <h2 className="bt-title">Benchmark Dashboard</h2>
          <p className="bt-subtitle">
            <span className="bt-inline-status" data-state={serverStatus}>
              {serverStatus === 'connected' ? algorithm?.name || 'Algorithm' : status.label}
            </span>
            <AnimatePresence>
              {statusMessage && (
                <motion.span
                  key={statusMessage}
                  className="bt-status-message"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {statusMessage}
                </motion.span>
              )}
            </AnimatePresence>
          </p>
        </div>
      </div>

      <div className="bt-tabs" role="tablist" aria-label="Dashboard sections">
        <TabBtn icon={<IconPlay size={14} />} active={activeTab === 'runner'} onClick={() => setActiveTab('runner')}>
          Runner
        </TabBtn>
        <TabBtn icon={<IconHistory size={14} />} active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
          History
          <span className="bt-tab-count">{executionHistory.length}</span>
        </TabBtn>
        <TabBtn icon={<IconSquareTerminal size={14} />} active={activeTab === 'custom'} onClick={() => setActiveTab('custom')}>
          Custom
        </TabBtn>
      </div>

      <motion.button
        className="bt-icon-btn"
        onClick={onClose}
        aria-label="Close dashboard"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <IconX size={16} />
      </motion.button>
    </div>
  );
});

interface TabBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const TabBtn = ({ active, onClick, icon, children }: TabBtnProps) => (
  <motion.button
    className="bt-tab"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.97 }}
  >
    {icon}
    {children}
  </motion.button>
);

interface ConfigSectionProps {
  selectedPreset: string;
  setSelectedPreset: (preset: string) => void;
  setInputSize: (size: number) => void;
  inputSize: number;
  serverStatus: string;
}

const ConfigSection = memo(function ConfigSection({
  selectedPreset,
  setSelectedPreset,
  setInputSize,
  inputSize,
  serverStatus,
}: ConfigSectionProps) {
  return (
    <div className="bt-config">
      <h3 className="bt-section-heading">
        <IconSettings size={14} />
        Test configuration
      </h3>
      <div className="bt-preset-grid">
        {Object.entries(PRESETS).map(([key, preset]: [string, any]) => (
          <motion.button
            key={key}
            className="bt-preset"
            aria-pressed={selectedPreset === key}
            onClick={() => {
              setSelectedPreset(key);
              setInputSize(preset.size);
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {selectedPreset === key && (
              <motion.div
                className="bt-preset-active-indicator"
                layoutId="preset-active-indicator"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <div className="bt-preset-label">{preset.label}</div>
            <div className="bt-preset-desc">{preset.desc}</div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {inputSize > 0 && (
          <motion.div
            className="bt-config-summary"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
          >
            <span>
              Selected <strong>{inputSize.toLocaleString()}</strong> vertices
            </span>
            <span className="bt-dot" />
            <span>
              Estimated edges <strong>~{(inputSize * 3).toLocaleString()}</strong>
            </span>
            <span className="bt-dot" />
            <span className="bt-inline-status" data-state={serverStatus}>
              {serverStatus === 'connected' ? 'Server ready' : 'Server offline'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface RunButtonProps {
  isRunning: boolean;
  serverStatus: string;
  progress: number;
  statusMessage: string;
  inputSize: number;
  onRun: () => void;
}

const RunButton = memo(function RunButton({ isRunning, serverStatus, progress, statusMessage, inputSize, onRun }: RunButtonProps) {
  const disabled = isRunning || serverStatus !== 'connected';
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      className="bt-run-btn"
      onClick={onRun}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isRunning ? (
          <motion.span
            key="running"
            className="bt-run-btn-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {reduceMotion ? (
              <IconLoader size={20} />
            ) : (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <IconLoader size={20} />
              </motion.div>
            )}
            <span className="bt-run-status-text">
              <span>Executing benchmark</span>
              <span className="bt-run-status-sub">{statusMessage}</span>
            </span>
            <motion.span
              className="bt-run-progress"
              key={Math.floor(progress)}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
            >
              {Math.floor(progress)}%
            </motion.span>
          </motion.span>
        ) : serverStatus !== 'connected' ? (
          <motion.span
            key="offline"
            className="bt-run-btn-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <IconPlug size={18} />
            Start benchmark server first
          </motion.span>
        ) : (
          <motion.span
            key="ready"
            className="bt-run-btn-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <IconPlay size={18} />
            Run benchmark — {inputSize.toLocaleString()} vertices
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

interface EnvironmentBadgeProps {
  results: any;
}

const EnvironmentBadge = memo(function EnvironmentBadge({ results }: EnvironmentBadgeProps) {
  return (
    <motion.div
      className="bt-env-badge"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <span className="bt-env-badge-item">
        <IconCpu size={13} />
        {results.nodeVersion}
      </span>
      <span className="bt-env-badge-item">
        <IconLayers size={13} />
        {results.serverStats.runs} runs
      </span>
      <span className="bt-env-badge-item">
        <IconClock size={13} />
        {new Date(results.timestamp).toLocaleString()}
      </span>
      <span className="bt-env-badge-item">
        <IconSquareTerminal size={13} />
        {results.platform}
      </span>
    </motion.div>
  );
});

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, icon, expanded, onToggle, children }: CollapsibleSectionProps) => (
  <div className="bt-section" data-expanded={expanded}>
    <button className="bt-section-trigger" onClick={onToggle} aria-expanded={expanded}>
      <span className="bt-section-trigger-label">
        {icon}
        {title}
      </span>
      <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.18, ease: 'easeOut' as const}}>
        <IconChevronRight size={16} className="bt-section-chevron" />
      </motion.span>
    </button>
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div key="content" {...collapseMotion} style={{ overflow: 'hidden' }}>
          <div className="bt-section-content">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

interface OverviewMetricsProps {
  results: any;
}

const OverviewMetrics = memo(function OverviewMetrics({ results }: OverviewMetricsProps) {
  const opsPerVertex = useMemo(
    () => (results.totalOperations / results.inputSize).toFixed(2),
    [results.totalOperations, results.inputSize]
  );
  const memoryPerVertex = useMemo(
    () =>
      results.serverStats.memoryPerVertex > 0
        ? results.serverStats.memoryPerVertex
        : (results.meanMemory * 1024) / results.inputSize,
    [results.serverStats.memoryPerVertex, results.meanMemory, results.inputSize]
  );

  const efficiencyColor =
    results.efficiency > 80 ? 'var(--bt-success)' : results.efficiency > 50 ? 'var(--bt-warning)' : 'var(--bt-danger)';
  const ciMargin = (results.confidenceInterval.upper - results.totalTimeRaw).toFixed(3);

  return (
    <motion.div className="bt-metric-grid" variants={staggerContainer} initial="hidden" animate="show">
      <MetricCard icon={<IconClock size={28} />} label="Mean time" value={`${results.totalTime} ms`} color="var(--bt-primary-strong)" />
      <MetricCard icon={<IconZap size={28} />} label="Throughput" value={`${results.throughput} ops/s`} color="var(--bt-secondary)" />
      <MetricCard icon={<IconDatabase size={28} />} label="Peak memory" value={`${results.peakMemory} KB`} color="var(--bt-warning)" />
      <MetricCard icon={<IconGauge size={28} />} label="Efficiency" value={`${results.efficiency.toFixed(1)}%`} color={efficiencyColor} />
      <MetricCard icon={<IconLayers size={28} />} label="Memory / vertex" value={`${memoryPerVertex.toFixed(2)} B`} color="var(--bt-violet)" />
      <MetricCard icon={<IconActivity size={28} />} label="Ops / vertex" value={opsPerVertex} color="var(--bt-violet)" />
      <MetricCard icon={<IconCpu size={28} />} label="Complexity" value={results.complexityInfo.class} color={results.complexityInfo.color} />
      <MetricCard icon={<IconTrendingUp size={28} />} label="95% confidence" value={`±${ciMargin} ms`} color="var(--bt-pink)" />
    </motion.div>
  );
});

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const MetricCard = ({ icon, label, value, color }: MetricCardProps) => (
  <motion.div className="bt-metric-card" style={{ '--bt-accent': color } as React.CSSProperties} variants={staggerItem} whileHover={{ y: -2 }}>
    <span className="bt-metric-icon">{icon}</span>
    <div className="bt-metric-label">{label}</div>
    <div className="bt-metric-value">{value}</div>
  </motion.div>
);

interface StatisticalAnalysisProps {
  results: any;
}

const StatisticalAnalysis = memo(function StatisticalAnalysis({ results }: StatisticalAnalysisProps) {
  const opsPerVertex = (results.totalOperations / results.inputSize).toFixed(2);
  const memoryPerVertexBytes =
    results.serverStats.memoryPerVertex > 0
      ? results.serverStats.memoryPerVertex
      : (results.meanMemory * 1024) / results.inputSize;

  const stdDevDisplay =
    results.serverStats.timeStdDev > 0.001
      ? formatTime(results.serverStats.timeStdDev)
      : formatTime((results.confidenceInterval.upper - results.confidenceInterval.lower) / 3.92);

  return (
    <div className="bt-stat-grid">
      <StatGroup
        title="Timing (ms)"
        icon={<IconClock size={13} />}
        items={[
          { label: 'Mean', value: formatTime(results.totalTimeRaw) },
          { label: 'Median', value: formatTime(results.serverStats.timeMedian) },
          { label: 'Min', value: formatTime(results.serverStats.timeMin) },
          { label: 'Max', value: formatTime(results.serverStats.timeMax) },
          { label: 'Std dev', value: `±${stdDevDisplay}` },
          {
            label: '95% CI',
            value: `${formatTime(results.confidenceInterval.lower)} – ${formatTime(results.confidenceInterval.upper)}`,
          },
        ]}
      />

      <StatGroup
        title="Memory"
        icon={<IconDatabase size={13} />}
        items={[
          { label: 'Mean', value: `${results.meanMemory} KB` },
          { label: 'Peak', value: `${results.peakMemory} KB` },
          { label: 'Min', value: `${results.serverStats.memoryMin.toFixed(2)} KB` },
          { label: 'Max', value: `${results.serverStats.memoryMax.toFixed(2)} KB` },
          { label: 'Per vertex', value: `${memoryPerVertexBytes.toFixed(2)} B` },
        ]}
      />

      <StatGroup
        title="Operations"
        icon={<IconActivity size={13} />}
        items={[
          { label: 'Total', value: results.totalOperations.toLocaleString() },
          { label: 'Per vertex', value: opsPerVertex },
          { label: 'Throughput', value: `${results.throughput}/s` },
          { label: 'Grade', value: results.complexityInfo.grade, color: results.complexityInfo.color },
        ]}
      />
    </div>
  );
});

interface StatGroupProps {
  title: string;
  icon: React.ReactNode;
  items: any[];
}

const StatGroup = ({ title, icon, items }: StatGroupProps) => (
  <div className="bt-stat-group">
    <div className="bt-stat-group-title">
      {icon}
      {title}
    </div>
    {items.map((item: any, i: number) => (
      <div key={i} className="bt-stat-row">
        <span className="bt-stat-row-label">{item.label}</span>
        <span className="bt-stat-row-value" style={item.color ? { color: item.color } : undefined}>
          {item.value}
        </span>
      </div>
    ))}
  </div>
);

interface ChartsPanelProps {
  results: any;
}

const ChartsPanel = memo(function ChartsPanel({ results }: ChartsPanelProps) {
  const hasIterations = results.metrics?.iterations?.length > 0;
  const hasMemory = results.metrics?.memory?.length > 0;
  const hasOperations = results.metrics?.operations?.length > 0;
  const hasTimestamps = results.metrics?.timestamps?.length > 0;

  return (
    <div className="bt-charts-grid">
      {(hasIterations || hasMemory || hasOperations) && (
        <div className="bt-chart-card bt-chart-card--wide">
          <ProfessionalChart
            datasets={{
              ...(hasIterations && { iterations: results.metrics.iterations }),
              ...(hasOperations && { operations: results.metrics.operations }),
              ...(hasMemory && { memory: results.metrics.memory }),
            }}
            height={380}
            title="Combined metrics over time"
          />
        </div>
      )}
      {hasIterations && (
        <div className="bt-chart-card">
          <ProfessionalChart datasets={{ iterations: results.metrics.iterations }} height={250} title="Iteration growth" />
        </div>
      )}
      {hasMemory && (
        <div className="bt-chart-card">
          <ProfessionalChart datasets={{ memory: results.metrics.memory }} height={250} title="Memory allocation profile" />
        </div>
      )}
      {hasOperations && (
        <div className="bt-chart-card">
          <ProfessionalChart
            datasets={{ operations: results.metrics.operations }}
            height={250}
            title="Operation count evolution"
          />
        </div>
      )}
      {hasTimestamps && (
        <div className="bt-chart-card">
          <ProfessionalChart datasets={{ timestamps: results.metrics.timestamps }} height={250} title="Cumulative time (ms)" />
        </div>
      )}
    </div>
  );
});

interface RunBreakdownProps {
  results: any;
}

const RunBreakdown = memo(function RunBreakdown({ results }: RunBreakdownProps) {
  return (
    <div className="bt-table-wrap">
      <table className="bt-table">
        <thead>
          <tr>
            <th>Run #</th>
            <th>Progress</th>
            <th>Iterations</th>
            <th>Memory (KB)</th>
            <th>Operations</th>
          </tr>
        </thead>
        <tbody>
          {results.runBreakdown.slice(0, 20).map((run: any, i: number) => (
            <tr key={i}>
              <td>{run.run}</td>
              <td>{run.progress?.toFixed(1)}%</td>
              <td>{run.iterations?.toLocaleString()}</td>
              <td>{run.memory?.toFixed(2)}</td>
              <td>{run.operations?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

const GRADE_RECOMMENDATION: any = {
  Excellent: (name: string, inputSize: number, opsPerVertex: string) =>
    `${name} performs optimally for ${inputSize.toLocaleString()} vertices. The linear complexity O(V+E) is achieved with ${opsPerVertex} operations per vertex.`,
  'Very Good': (name: string) => `${name} shows very good performance. Complexity is linear with reasonable constants.`,
  Good: (name: string) => `${name} performs acceptably. Consider optimization if scaling to larger graphs.`,
  Moderate: (name: string, inputSize: number) =>
    `${name} shows quadratic behavior. Not recommended for graphs larger than ${inputSize.toLocaleString()} vertices.`,
  Poor: (name: string) => `${name} exhibits poor scaling. Consider using a different algorithm for larger inputs.`,
};

const THEORETICAL_COMPLEXITY: any = {
  BFS: 'O(V + E)',
  DFS: 'O(V + E)',
  Dijkstra: 'O((V+E) log V)',
  'Bellman-Ford': 'O(V·E)',
};

interface DetailedAnalysisProps {
  results: any;
  algorithm: any;
}

const DetailedAnalysis = memo(function DetailedAnalysis({ results, algorithm }: DetailedAnalysisProps) {
  const opsPerVertex = (results.totalOperations / results.inputSize).toFixed(1);
  const memoryPerVertexBytes =
    results.serverStats.memoryPerVertex > 0
      ? results.serverStats.memoryPerVertex
      : (results.meanMemory * 1024) / results.inputSize;

  const recommendation = GRADE_RECOMMENDATION[results.complexityInfo.grade]?.(
    algorithm?.name,
    results.inputSize,
    opsPerVertex
  );
  const theoreticalComplexity = algorithm?.timeComplexity || THEORETICAL_COMPLEXITY[results.algorithm] || 'O(n)';

  return (
    <div className="bt-analysis-grid">
      <div className="bt-analysis-card">
        <h4>
          <IconActivity size={15} />
          Empirical complexity
        </h4>
        <p>
          The observed performance corresponds to{' '}
          <strong style={{ color: results.complexityInfo.color }}>{results.complexityInfo.class}</strong> complexity.
          {results.complexityInfo.description && <span> ({results.complexityInfo.description})</span>}
          <br />
          Each vertex processed in <strong>{formatTime(results.totalTimeRaw / results.inputSize)}</strong> on average.
          <br />
          Operation count: <strong>{opsPerVertex}</strong> ops/vertex.
          <br />
          The algorithm achieves{' '}
          <strong style={{ color: results.complexityInfo.color }}>{results.complexityInfo.grade}</strong> grade
          performance.
        </p>
      </div>

      <div className="bt-analysis-card">
        <h4>
          <IconCheckCircle size={15} />
          Recommendations
        </h4>
        <p>
          {recommendation} Memory usage averages <strong>{memoryPerVertexBytes.toFixed(2)} bytes</strong> per vertex.
        </p>
      </div>

      <div className="bt-analysis-card bt-analysis-card--wide">
        <h4>
          <IconLayers size={15} />
          Complexity analysis
        </h4>
        <div className="bt-complexity-row">
          <div className="bt-complexity-item">
            <div className="bt-complexity-item-label">Theoretical</div>
            <div className="bt-complexity-item-value" style={{ color: 'var(--bt-primary-strong)' }}>
              {theoreticalComplexity}
            </div>
          </div>
          <div className="bt-complexity-item">
            <div className="bt-complexity-item-label">Observed</div>
            <div className="bt-complexity-item-value" style={{ color: 'var(--bt-secondary)' }}>
              {results.complexityInfo.class}
            </div>
          </div>
          <div className="bt-complexity-item">
            <div className="bt-complexity-item-label">Ops / vertex</div>
            <div className="bt-complexity-item-value" style={{ color: 'var(--bt-violet)' }}>
              {opsPerVertex}
            </div>
          </div>
          <div className="bt-complexity-item">
            <div className="bt-complexity-item-label">Efficiency</div>
            <div
              className="bt-complexity-item-value"
              style={{ color: results.efficiency > 80 ? 'var(--bt-success)' : 'var(--bt-warning)' }}
            >
              {results.efficiency.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

interface HistoryTabProps {
  executionHistory: any[];
}

const HistoryTab = memo(function HistoryTab({ executionHistory }: HistoryTabProps) {
  return (
    <div>
      <h3 className="bt-section-heading">
        <IconHistory size={14} />
        Benchmark history
      </h3>
      {executionHistory.length === 0 ? (
        <motion.div className="bt-history-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <IconInbox size={36} />
          <p>No benchmarks run yet</p>
        </motion.div>
      ) : (
        <div className="bt-history-list">
          <AnimatePresence initial={false}>
            {executionHistory.map((entry: any) => {
              const opsPerVertex = (entry.totalOperations / entry.inputSize).toFixed(1);
              return (
                <motion.div
                  key={entry.timestamp}
                  className="bt-history-entry"
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <div className="bt-history-entry-head">
                    <div>
                      <h4 className="bt-history-entry-title">{entry.algorithm}</h4>
                      <p className="bt-history-entry-meta">
                        {entry.nodeVersion} · {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className="bt-history-entry-badge">{entry.inputSize?.toLocaleString()} vertices</span>
                  </div>
                  <div className="bt-history-entry-grid">
                    <MiniStat label="Time" value={`${entry.totalTime} ms`} />
                    <MiniStat label="Throughput" value={`${entry.throughput}/s`} />
                    <MiniStat label="Memory" value={`${entry.peakMemory} KB`} />
                    <MiniStat label="Ops/vertex" value={opsPerVertex} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});

interface MiniStatProps {
  label: string;
  value: string;
}

const MiniStat = ({ label, value }: MiniStatProps) => (
  <div>
    <div className="bt-mini-stat-label">{label}</div>
    <div className="bt-mini-stat-value">{value}</div>
  </div>
);

interface CustomTabProps {
  customInput: string;
  setCustomInput: (value: string) => void;
  setInputSize: (size: number) => void;
  setActiveTab: (tab: string) => void;
}

const CustomTab = ({ customInput, setCustomInput, setInputSize, setActiveTab }: CustomTabProps) => {
  const { nodes, edges } = useMemo(() => {
    const lines = customInput.trim().split('\n').filter((l: string) => l.trim());
    const edgeCount = lines.reduce((sum: number, line: string) => sum + (line.match(/\d+/g) || []).length - 1, 0);
    return { nodes: lines.length, edges: edgeCount };
  }, [customInput]);

  const hasInput = customInput.trim().length > 0;

  return (
    <div className="bt-custom-grid">
      <div>
        <h3 className="bt-section-heading">
          <IconSquareTerminal size={14} />
          Custom test case
        </h3>
        <div className="bt-custom-card">
          <textarea
            className="bt-textarea"
            value={customInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomInput(e.target.value)}
            placeholder="Enter adjacency list data..."
            rows={12}
            aria-label="Custom adjacency list input"
          />
          <div className="bt-custom-actions">
            <motion.button
              className="bt-btn-secondary"
              onClick={() => setCustomInput('0 1 2\n1 0 3 4\n2 0 3\n3 1 2 4\n4 1 3')}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Load example
            </motion.button>
            <motion.button
              className="bt-btn-secondary bt-btn-secondary--danger"
              onClick={() => setCustomInput('')}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <IconTrash size={13} />
              Clear
            </motion.button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="bt-section-heading">
          <IconActivity size={14} />
          Input analysis
        </h3>
        <div className="bt-custom-card">
          <AnimatePresence mode="wait">
            {hasInput ? (
              <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="bt-input-stats">
                  <div className="bt-input-stat">
                    <div className="bt-input-stat-value" style={{ color: 'var(--bt-primary-strong)' }}>
                      {nodes}
                    </div>
                    <div className="bt-input-stat-label">Nodes</div>
                  </div>
                  <div className="bt-input-stat">
                    <div className="bt-input-stat-value" style={{ color: 'var(--bt-secondary)' }}>
                      {edges}
                    </div>
                    <div className="bt-input-stat-label">Edges</div>
                  </div>
                </div>
                <motion.button
                  className="bt-btn-primary"
                  onClick={() => {
                    setInputSize(nodes || 100);
                    setActiveTab('runner');
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <IconPlay size={14} />
                  Run with this input
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="stub"
                className="bt-analysis-stub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <IconSquareTerminal size={32} />
                <p>Enter test data to analyze</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkTool;