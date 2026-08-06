import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetwork } from '../dashboard/NetworkContext';
import ControlPanel from './ControlPanel';
import CommunityOverview from './CommunityOverview';
import CommunityDetailsTable from './CommunityDetailsTable';
import StabilityMetrics from './StabilityMetrics';
import ModularityProgress from './ModularityProgress';
import InterCommunityRelations from './InterCommunityRelations';
import { useCommunityDetection } from './useCommunityDetection';
import './CommunityDetection.css';

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const SECTIONS = [
  { key: 'stability', title: 'Stability Metrics', Component: StabilityMetrics, propKey: 'metrics' },
  { key: 'modularity', title: 'Modularity Progress', Component: ModularityProgress, propKey: 'data' },
  { key: 'overview', title: 'Community Overview', Component: CommunityOverview, fullWidth: true },
  { key: 'relations', title: 'Inter-Community Relationships', Component: InterCommunityRelations, fullWidth: true },
  { key: 'details', title: 'Community Details', Component: CommunityDetailsTable, fullWidth: true },
];

interface Params {
  resolution: number;
  ensembleRuns: number;
  consensusThreshold: number;
}

const CommunityDetection = (): React.ReactElement => {
  const {
    users,
    adjacencyList,
    loading: networkLoading,
    error: networkError,
  } = useNetwork() as any;

  const [params, setParams] = useState<Params>({
    resolution: 1.0,
    ensembleRuns: 15,
    consensusThreshold: 0.5,
  });

  const {
    isRunning,
    progress,
    error: detectionError,
    results,
    runDetection,
  } = useCommunityDetection() as any;

  const hasAttemptedRef = useRef<boolean>(false);

  const networkStats = useMemo(() => {
    if (!users || !adjacencyList) return null;

    const totalDegree = Object.values(adjacencyList).reduce(
      (sum: number, neighbors: any) => sum + (neighbors?.length || 0),
      0
    );

    return {
      nodeCount: users.length,
      edgeCount: Math.round(totalDegree / 2),
    };
  }, [users, adjacencyList]);

  const handleParamChange = useCallback((paramName: string, value: number) => {
    setParams((prev: Params) => ({ ...prev, [paramName]: value }));
  }, []);

  const handleRunAnalysis = useCallback(() => {
    hasAttemptedRef.current = true;
    runDetection(params);
  }, [params, runDetection]);

  const getSectionProps = useCallback((key: string, results: any, users: any[], adjacencyList: any) => {
    switch (key) {
      case 'stability':
        return { metrics: results.stabilityMetrics };
      
      case 'modularity':
        return { 
          data: results.modularityHistory,
          bestModularity: results.bestModularity,
          avgModularity: results.avgModularity
        };
      
      case 'overview':
        return { 
          communities: results.finalCommunities, 
          users,
          stats: {
            numCommunities: results.numFinalCommunities,
            largestSize: results.largestCommunitySize,
            smallestSize: results.smallestCommunitySize,
            avgSize: results.avgCommunitySize,
            sizeDistribution: results.communitySizeDistribution
          }
        };
      
      case 'relations':
        return { 
          communities: results.finalCommunities, 
          adjacencyList 
        };
      
      case 'details':
        return { 
          communities: results.finalCommunities, 
          adjacencyList, 
          users,
          metadata: {
            executionTimeMs: results.executionTimeMs,
            numRuns: results.numRuns,
            resolution: results.resolution,
            ensembleRuns: results.ensembleRuns,
            consensusThreshold: results.consensusThreshold
          }
        };
      
      default:
        return { communities: results.finalCommunities, adjacencyList, users };
    }
  }, []);

  if (networkLoading) {
    return (
      <div className="cd-root">
        <div className="cd-loading-view">
          <motion.div
            className="cd-loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.p
            className="cd-loading-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Loading network data…
          </motion.p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="cd-root">
        <motion.div
          className="cd-error-view"
          role="alert"
          variants={pageTransition}
          initial="initial"
          animate="animate"
        >
          <div className="cd-error-icon-wrapper">
            <span className="cd-error-icon" aria-hidden="true">!</span>
          </div>
          <h2 className="cd-error-title">Failed to Load Network</h2>
          <p className="cd-error-message">{networkError}</p>
          <p className="cd-error-hint">Verify your data source and try reloading.</p>
        </motion.div>
      </div>
    );
  }

  if (!users?.length || !networkStats) {
    return (
      <div className="cd-root">
        <motion.div
          className="cd-empty-view"
          variants={pageTransition}
          initial="initial"
          animate="animate"
        >
          <div className="cd-empty-icon-wrapper">
            <span className="cd-empty-icon" aria-hidden="true">&#9671;</span>
          </div>
          <h2 className="cd-empty-title">No Network Data</h2>
          <p className="cd-empty-message">
            Upload or connect a network dataset to begin community detection analysis.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="cd-root">
      <motion.header
        className="cd-header"
        variants={pageTransition}
        initial="initial"
        animate="animate"
      >
        <div className="cd-header-content">
          <div className="cd-header-text">
            <h1 className="cd-title">Community Detection</h1>
            <p className="cd-subtitle">
              Leiden algorithm &middot; Ensemble clustering &middot; Stability analysis
            </p>
          </div>
          <div className="cd-header-stats">
            <span className="cd-stat">
              <span className="cd-stat-value">{networkStats.nodeCount}</span>
              <span className="cd-stat-label">nodes</span>
            </span>
            <span className="cd-stat-divider" />
            <span className="cd-stat">
              <span className="cd-stat-value">{networkStats.edgeCount}</span>
              <span className="cd-stat-label">edges</span>
            </span>
            {results && (
              <>
                <span className="cd-stat-divider" />
                <span className="cd-stat">
                  <span className="cd-stat-value">{results.numFinalCommunities}</span>
                  <span className="cd-stat-label">communities</span>
                </span>
                <span className="cd-stat-divider" />
                <span className="cd-stat">
                  <span className="cd-stat-value">{results.executionTimeMs.toFixed(0)}ms</span>
                  <span className="cd-stat-label">runtime</span>
                </span>
              </>
            )}
          </div>
        </div>
      </motion.header>

      <ControlPanel
        params={params}
        onParamChange={handleParamChange}
        onRunAnalysis={handleRunAnalysis}
        isRunning={isRunning}
        progress={progress}
      />

      <AnimatePresence mode="wait">
        {detectionError && (
          <motion.div
            className="cd-detection-error"
            role="alert"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="cd-detection-error-content">
              <span className="cd-detection-error-icon" aria-hidden="true">⚠</span>
              <span className="cd-detection-error-text">{detectionError}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!results && !isRunning && hasAttemptedRef.current && !detectionError && (
        <motion.div
          className="cd-no-results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="cd-no-results-text">
            Configure parameters above and run the analysis to visualize community structures.
          </p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {results && (
          <motion.div
            className="cd-results"
            key="results"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {SECTIONS.map(({ key, title, Component, fullWidth }: any, index: number) => {
              const sectionProps = getSectionProps(key, results, users, adjacencyList);

              return (
                <motion.section
                  key={key}
                  className={`cd-section ${fullWidth ? 'cd-section--full' : ''}`}
                  variants={sectionVariants}
                  custom={index}
                >
                  <h2 className="cd-section-title">{title}</h2>
                  <div className="cd-section-body">
                    <Component {...sectionProps} />
                  </div>
                </motion.section>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRunning && (
          <motion.div
            className="cd-running-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="cd-running-content">
              <motion.div
                className="cd-running-indicator"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <p className="cd-running-label">{progress || 'Processing…'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityDetection;