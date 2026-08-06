import React, { useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetwork } from './NetworkContext.js';

import StatsCards from './StatsCards.js';
import DegreeDistributionChart from './DegreeDistributionChart';
import DistanceHistogram from './DistanceHistogram.js';
import TopUsersTable from './TopUsersTable.js';
import UserDistanceTable from './UserDistanceTable.js';
import ConnectionChecker from './ConnectionChecker';
import FriendList from './FriendList.js';
import CommonFriends from './CommonFriends';
import PdfExporter from './PdfExporter.js';
import CentralityLeaderboard from './CentralityLeaderboard';
import MetricCardWithProgress from './MetricCardWithProgress.js';

import {
  useClustering,
  useCentrality,
  useAssortativity,
  useModularity,
  useRobustness,
  usePowerLawExponent,
} from './useGraphMetrics';

import {
  Hexagon,
  RefreshCw,
  Upload,
  Activity,
  AlertTriangle,
  Database,
  Triangle,
  Puzzle,
  Crown,
  Link2,
  TrendingUp,
  Globe,
  Ruler,
  Grid3X3,
  Shield,
  BarChart3,
  Anchor,
  ClipboardList,
} from 'lucide-react';

import './DashboardPage.css';

const METRIC_ICON_MAP: any = {
  clustering: Triangle,
  modularity: Puzzle,
  'centrality-dom': Crown,
  assortativity: Link2,
  'power-law': TrendingUp,
  component: Globe,
  diameter: Ruler,
  density: Grid3X3,
  robustness: Shield,
  'degree-spread': BarChart3,
  bridge: Anchor,
  summary: ClipboardList,
};

const SCROLL_DEBOUNCE_MS = 100;

const ANIMATION_SPRING = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 28,
};

const toNumber = (value: any): number => {
  if (value === undefined || value === null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const buildEdgeList = (adjacencyList: any): any[] => {
  if (!adjacencyList || !Object.keys(adjacencyList).length) return [];
  
  const edgeSet = new Set<string>();
  const edges: any[] = [];
  
  Object.entries(adjacencyList).forEach(([source, targets]: [string, any]) => {
    if (!Array.isArray(targets)) return;
    targets.forEach((target: string) => {
      const key = source < target ? `${source}|${target}` : `${target}|${source}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source, target });
      }
    });
  });
  
  return edges;
};

const countUniqueEdges = (edges: any[]): number => {
  const seen = new Set<string>();
  let count = 0;
  
  edges.forEach(({ source, target }) => {
    const key = source < target ? `${source}|${target}` : `${target}|${source}`;
    if (!seen.has(key)) {
      seen.add(key);
      count++;
    }
  });
  
  return count;
};

const calculateDensity = (nodeCount: number, edgeCount: number): number => {
  if (nodeCount < 2) return 0;
  return (2 * edgeCount) / (nodeCount * (nodeCount - 1));
};

const calculateAvgPathLength = (histogram: any[]): number => {
  if (!histogram?.length) return 0;
  
  let totalPairs = 0;
  let totalDistance = 0;
  
  histogram.forEach(({ length, count }) => {
    totalPairs += count;
    totalDistance += length * count;
  });
  
  return totalPairs > 0 ? totalDistance / totalPairs : 0;
};

const getTopNodesByDegree = (nodes: any[], adjacencyList: any, limit: number = 6): any[] => {
  if (!nodes.length || !adjacencyList) return [];
  
  return nodes
    .map((node: any) => ({
      name: node.name || node.id,
      degree: (adjacencyList[node.id] || []).length,
    }))
    .sort((a: any, b: any) => b.degree - a.degree)
    .slice(0, limit);
};

const LoadingState = React.memo(() => (
  <motion.div
    className="dashboard-state loading-state"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="state-content">
      <motion.div
        className="state-spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <Activity size={32} strokeWidth={1.5} />
      </motion.div>
      <h2>Loading Network Data</h2>
      <p>Fetching graph data from the server...</p>
    </div>
  </motion.div>
));

LoadingState.displayName = 'LoadingState';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState = React.memo(({ error, onRetry }: ErrorStateProps) => (
  <motion.div
    className="dashboard-state error-state"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={ANIMATION_SPRING}
  >
    <div className="state-content">
      <div className="state-icon error-icon">
        <AlertTriangle size={40} strokeWidth={1.5} />
      </div>
      <h2>Error Loading Data</h2>
      <p className="error-message-text">{error || 'An unknown error occurred'}</p>
      <motion.button
        className="btn btn-primary"
        onClick={onRetry}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <RefreshCw size={16} />
        Try Again
      </motion.button>
    </div>
  </motion.div>
));

ErrorState.displayName = 'ErrorState';

interface EmptyDashboardProps {
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileLoad: (file: File) => void;
  onReload: () => void;
}

const EmptyDashboard = React.memo(({ dragOver, onDragOver, onDragLeave, onDrop, onFileLoad, onReload }: EmptyDashboardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileLoad(file);
    },
    [onFileLoad]
  );

  return (
    <motion.div
      className={`empty-dashboard ${dragOver ? 'drag-active' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION_SPRING}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="empty-content">
        <motion.div
          className="empty-icon-wrapper"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Database size={48} strokeWidth={1} />
        </motion.div>

        <h2>No Network Data Available</h2>
        <p>The server returned no data. Ensure your API has data loaded.</p>
        <p className="api-hint">
          API Endpoint: <code>http://localhost:8080/graph/network</code>
        </p>

        <div className="empty-actions">
          <motion.button
            className="btn btn-primary"
            onClick={onReload}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RefreshCw size={16} />
            Reload from API
          </motion.button>

          <motion.label
            className="btn btn-secondary btn-file"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Upload size={16} />
            Load JSON File
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              hidden
              onChange={handleFileChange}
            />
          </motion.label>
        </div>
      </div>
    </motion.div>
  );
});

EmptyDashboard.displayName = 'EmptyDashboard';

interface DashboardHeaderProps {
  nodeCount: number;
  edgeCount: number;
  componentCount: number;
  isEmpty: boolean;
  onReload: () => void;
  dashRef: React.RefObject<any>;
}

const DashboardHeader = React.memo(({ nodeCount, edgeCount, componentCount, isEmpty, onReload, dashRef }: DashboardHeaderProps) => (
  <motion.header
    className="dash-header"
    initial={{ y: -10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="dash-header-left">
      <motion.div
        className="dash-logo"
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Hexagon size={24} strokeWidth={1.5} />
      </motion.div>
      <div>
        <h1 className="dash-title">Network Analysis</h1>
        {!isEmpty && (
          <p className="dash-subtitle">
            <span>{nodeCount.toLocaleString()} nodes</span>
            <span className="dash-separator">·</span>
            <span>{edgeCount.toLocaleString()} edges</span>
            <span className="dash-separator">·</span>
            <span>
              {componentCount} component{componentCount !== 1 ? 's' : ''}
            </span>
          </p>
        )}
      </div>
    </div>

    <div className="dash-header-right">
      <motion.button
        className="btn btn-secondary"
        onClick={onReload}
        title="Reload data from server"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <RefreshCw size={16} />
        Reload
      </motion.button>

      {!isEmpty && <PdfExporter targetRef={dashRef} />}
    </div>
  </motion.header>
));

DashboardHeader.displayName = 'DashboardHeader';

interface UseMetricRowsProps {
  clustering: any;
  centrality: any;
  assortativity: any;
  modularity: any;
  robustness: any;
  powerLawAlpha: any;
  connectedComponents: any[];
  nodes: any[];
  uniqueEdgeCount: number;
  computedDensity: number;
  avgDegreeNum: number;
  diameterNum: number;
  eigenRestValue: number;
  robustnessChartData: any[];
  degreeBreakdown: any[];
  avgPathLength: number;
  distanceDataForChart: any[];
}

const useMetricRows = ({
  clustering,
  centrality,
  assortativity,
  modularity,
  powerLawAlpha,
  connectedComponents,
  nodes,
  uniqueEdgeCount,
  computedDensity,
  avgDegreeNum,
  diameterNum,
  eigenRestValue,
  robustnessChartData,
  degreeBreakdown,
  avgPathLength,
  distanceDataForChart,
}: UseMetricRowsProps): any => {
  const renderCard = useCallback(
    (variant: string, overrides: any = {}) => {
      const IconComponent = METRIC_ICON_MAP[variant] || Activity;
      return (
        <MetricCardWithProgress
          key={variant}
          variant={variant}
          icon={IconComponent}
          {...overrides}
        />
      );
    },
    []
  );

  const rowA = useMemo(
    () => [
      renderCard('clustering', {
        title: 'Clustering Analysis',
        globalCC: clustering.globalClusteringCoefficient,
        avgLocalCC: clustering.averageLocalClusteringCoefficient,
        interpretation:
          clustering.globalClusteringCoefficient > 0.3
            ? 'Non-trivial clustering'
            : 'Low clustering',
        strength: clustering.globalClusteringCoefficient > 0.3 ? 'strong' : 'weak',
      }),
      renderCard('modularity', {
        title: 'Modularity Score',
        value: modularity.modularity,
        maxValue: 1,
        communityCount: connectedComponents.length,
        interpretation: modularity.interpretation,
        strength: modularity.strength,
      }),
      renderCard('centrality-dom', {
        title: 'Eigenvector Dominance',
        topNode: centrality.eigenvector[0]?.name,
        topValue: centrality.eigenvector[0]?.value,
        restValue: eigenRestValue,
        interpretation: 'Top node influence share',
      }),
      renderCard('assortativity', {
        title: 'Degree Assortativity',
        value: assortativity.coefficient,
        avgDegree: avgDegreeNum,
        interpretation: assortativity.interpretation,
        strength: assortativity.type,
      }),
    ],
    [clustering, modularity, centrality, assortativity, connectedComponents, eigenRestValue, avgDegreeNum, renderCard]
  );

  const rowB = useMemo(
    () => [
      renderCard('power-law', {
        title: 'Power-law Diagnostic',
        value: powerLawAlpha,
        isScaleFree: powerLawAlpha !== null && powerLawAlpha > 2 && powerLawAlpha < 3,
        rSquared: powerLawAlpha !== null ? 0.85 : undefined,
      }),
      renderCard('component', {
        title: 'Component Health',
        largestSize: connectedComponents[0]?.length || 0,
        totalNodes: nodes.length,
        componentCount: connectedComponents.length,
      }),
      renderCard('diameter', {
        title: 'Path Length Analysis',
        diameter: diameterNum,
        avgPathLength,
        distanceData: distanceDataForChart,
      }),
      renderCard('density', {
        title: 'Density Analysis',
        value: computedDensity,
        interpretation:
          computedDensity > 0.5
            ? 'Very dense'
            : computedDensity > 0.3
              ? 'Dense'
              : computedDensity > 0.1
                ? 'Moderate'
                : 'Sparse',
        strength:
          computedDensity > 0.3
            ? 'excellent'
            : computedDensity > 0.1
              ? 'moderate'
              : 'weak',
      }),
    ],
    [powerLawAlpha, connectedComponents, nodes, diameterNum, avgPathLength, distanceDataForChart, computedDensity, renderCard]
  );

  const rowC = useMemo(
    () => [
      renderCard('robustness', {
        title: 'Network Robustness',
        data: robustnessChartData,
        interpretation: 'Targeted attack resilience',
      }),
      renderCard('degree-spread', {
        title: 'Degree Distribution',
        data: degreeBreakdown,
        avgDegree: avgDegreeNum,
      }),
      renderCard('bridge', {
        title: 'Bridge Detection',
        data: centrality.betweenness,
        interpretation: 'Critical intermediaries',
      }),
      renderCard('summary', {
        title: 'Network Summary',
        nodes: nodes.length,
        edges: uniqueEdgeCount,
        density: computedDensity,
        avgDegree: avgDegreeNum,
        diameter: diameterNum,
        components: connectedComponents.length,
        interpretation: 'Complete overview',
      }),
    ],
    [robustnessChartData, degreeBreakdown, avgDegreeNum, centrality.betweenness, nodes.length, uniqueEdgeCount, computedDensity, diameterNum, connectedComponents.length, renderCard]
  );

  return { rowA, rowB, rowC };
};

export default function DashboardPage(): React.ReactElement {
  const {
    users,
    loadFromJSON,
    stats,
    connectedComponents,
    loading,
    error,
    reloadData,
    adjacencyList,
    distanceHistogram,
  } = useNetwork() as any;

  const dashRef = useRef<any>(null);

  const [checkerA, setCheckerA] = useState<string | undefined>(undefined);
  const [checkerB, setCheckerB] = useState<string | undefined>(undefined);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const isEmpty = !users || users.length === 0;
  const nodes = useMemo(() => users || [], [users]);

  const edges = useMemo(() => buildEdgeList(adjacencyList), [adjacencyList]);
  const uniqueEdgeCount = useMemo(() => countUniqueEdges(edges), [edges]);
  const computedDensity = useMemo(
    () => calculateDensity(nodes.length, uniqueEdgeCount),
    [nodes.length, uniqueEdgeCount]
  );

  const clustering = useClustering(nodes, edges);
  const centrality = useCentrality(nodes, edges);
  const assortativity = useAssortativity(nodes, edges);
  const modularity = useModularity(nodes, edges);
  const robustness = useRobustness(nodes, edges);
  const powerLawAlpha = usePowerLawExponent(nodes, edges);

  const avgDegreeNum = useMemo(() => toNumber(stats?.avgDegree), [stats]);
  const diameterNum = useMemo(() => toNumber(stats?.diameter), [stats]);
  const avgPathLength = useMemo(() => calculateAvgPathLength(distanceHistogram), [distanceHistogram]);

  const degreeBreakdown = useMemo(
    () => getTopNodesByDegree(nodes, adjacencyList),
    [nodes, adjacencyList]
  );

  const robustnessChartData = useMemo(() => {
    if (!robustness?.removalPercentages) return [];
    return robustness.removalPercentages.map((p: any, i: number) => ({
      removal: `${p}%`,
      component: robustness.largestComponentPercents?.[i] || 0,
    }));
  }, [robustness]);

  const distanceDataForChart = useMemo(() => {
    if (!distanceHistogram?.length) return [];
    return distanceHistogram.map(({ length, count }: any) => ({ length, count }));
  }, [distanceHistogram]);

  const eigenRestValue = useMemo(() => {
    if (!centrality?.eigenvector?.length) return 0;
    return centrality.eigenvector.slice(1).reduce((s: number, c: any) => s + (c.value || 0), 0);
  }, [centrality]);

  const { rowA, rowB, rowC } = useMetricRows({
    clustering,
    centrality,
    assortativity,
    modularity,
    robustness,
    powerLawAlpha,
    connectedComponents,
    nodes,
    uniqueEdgeCount,
    computedDensity,
    avgDegreeNum,
    diameterNum,
    eigenRestValue,
    robustnessChartData,
    degreeBreakdown,
    avgPathLength,
    distanceDataForChart,
  });

  const handleFileLoad = useCallback(
    (file: File) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          loadFromJSON(JSON.parse(e.target?.result as string));
        } catch {
          alert('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    },
    [loadFromJSON]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileLoad(file);
    },
    [handleFileLoad]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleSelectPair = useCallback((a: string, b: string) => {
    setCheckerA(a);
    setCheckerB(b);
    setTimeout(() => {
      document
        .getElementById('connection-checker')
        ?.scrollIntoView({ behavior: 'smooth' });
    }, SCROLL_DEBOUNCE_MS);
  }, []);

  if (loading) return <LoadingState />;

  if (error) return <ErrorState error={error} onRetry={reloadData} />;

  return (
    <div className="dashboard-page" ref={dashRef} id="dashboard-root">
      <DashboardHeader
        nodeCount={nodes.length}
        edgeCount={uniqueEdgeCount}
        componentCount={connectedComponents.length}
        isEmpty={isEmpty}
        onReload={reloadData}
        dashRef={dashRef}
      />

      <AnimatePresence>
        {isEmpty && (
          <EmptyDashboard
            dragOver={dragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileLoad={handleFileLoad}
            onReload={reloadData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isEmpty && (
          <motion.main
            className="dash-main"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <section className="dash-section full-width">
              <StatsCards />
            </section>

            <section className="dash-section two-col">
              <DegreeDistributionChart />
              <DistanceHistogram />
            </section>

            <section className="dash-section two-col">
              <TopUsersTable
                onSelectUser={(id: string) => handleSelectPair(id, checkerB || '')}
              />
              <UserDistanceTable />
            </section>

            <section className="dash-section three-col">
              <FriendList onSelectPair={handleSelectPair} />
              <CommonFriends />
              <div id="connection-checker">
                <ConnectionChecker
                  presetUserA={checkerA}
                  presetUserB={checkerB}
                />
              </div>
            </section>

            {uniqueEdgeCount > 0 && (
              <section className="dash-section full-width advanced-metrics">
                <div className="metrics-grid-4">{rowA}</div>
                <div className="metrics-grid-4">{rowB}</div>
                <div className="metrics-grid-4">{rowC}</div>

                <div className="metrics-grid-3" style={{ marginTop: 16 }}>
                  <CentralityLeaderboard
                    data={centrality.betweenness}
                    title="Betweenness Centrality"
                    colorScheme="blue"
                  />
                  <CentralityLeaderboard
                    data={centrality.closeness}
                    title="Closeness Centrality"
                    colorScheme="green"
                  />
                  <CentralityLeaderboard
                    data={centrality.eigenvector}
                    title="Eigenvector Centrality"
                    colorScheme="purple"
                  />
                </div>
              </section>
            )}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}