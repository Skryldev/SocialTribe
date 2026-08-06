import React, { useEffect, useState, useMemo, lazy, Suspense, ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HeroSection = lazy(() => import('./HeroSection'));
const IntuitionSection = lazy(() => import('./IntuitionSection'));
const ComplexitySection = lazy(() => import('./ComplexitySection'));
const TradeoffSection = lazy(() => import('./TradeoffSection'));
const BenchmarkSection = lazy(() => import('./BenchmarkSection'));
const VisualizationSection = lazy(() => import('./VisualizationSection'));
const CodeSection = lazy(() => import('./CodeSection'));
const ComparisonSection = lazy(() => import('./ComparisonSection'));

interface ErrorBoundaryProps {
  children: React.ReactNode;
  friendlyMessage?: string;
  errorMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any): void {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown error';
      
      return (
        <div className="error-boundary-fallback" style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid var(--border-muted)`,
          margin: '16px 0',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 700, 
            marginBottom: '8px', 
            color: 'var(--text-primary)' 
          }}>
            {this.props.friendlyMessage || 'Component Error'}
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-tertiary)', 
            marginBottom: '16px',
            maxWidth: '400px' 
          }}>
            {this.props.errorMessage || 'There was an error rendering this section.'}
          </p>
          
          {(
            <details style={{ 
              marginBottom: '16px', 
              fontSize: '12px', 
              textAlign: 'left',
              width: '100%',
              maxWidth: '500px',
              background: 'var(--bg-primary)',
              padding: '12px',
              borderRadius: '8px',
              overflow: 'auto'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Error Details (Dev Only)
              </summary>
              <pre style={{ 
                marginTop: '8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                color: 'var(--text-danger)'
              }}>
                {errorMessage}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const SectionLoader = () => (
  <div style={{
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
  }}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      style={{
        display: 'inline-block',
        fontSize: '24px',
        marginBottom: '12px'
      }}
    >
      ⚙️
    </motion.div>
    <p>Loading section...</p>
  </div>
);

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
}

const EmptyState = ({ icon, title, subtitle }: EmptyStateProps): React.ReactElement => (
  <motion.div
    className="empty-state"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <motion.div 
      className="empty-state-icon"
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {icon}
    </motion.div>
    <h1 className="empty-state-title">{title}</h1>
    <p className="empty-state-subtitle">{subtitle}</p>
  </motion.div>
);

interface SectionRendererProps {
  component: ComponentType<any>;
  props?: any;
  fallback?: React.ReactNode;
}

const SectionRenderer = ({ component: Component, props, fallback }: SectionRendererProps): React.ReactElement => (
  <ErrorBoundary
    friendlyMessage={`Error in ${Component.displayName || Component.name || 'Component'}`}
    errorMessage="There was an error rendering this section. Please try refreshing the page."
  >
    <Suspense fallback={fallback || <SectionLoader />}>
      <Component {...props} />
    </Suspense>
  </ErrorBoundary>
);

interface MainContentProps {
  algorithm?: any;
  compareAlgorithm?: any;
  benchmark?: any;
  compareBenchmark?: any;
  compareMode?: boolean;
  onToggleCompare?: () => void;
  sidebarOpen?: boolean;
}

const MainContent = ({ 
  algorithm, 
  compareAlgorithm, 
  benchmark, 
  compareBenchmark,
  compareMode, 
  onToggleCompare,
}: MainContentProps): React.ReactElement => {
  const [showContent, setShowContent] = useState<boolean>(false);
  const [contentKey, setContentKey] = useState<number>(0);

  const validAlgorithm = useMemo(() => {
    return algorithm && typeof algorithm === 'object' && algorithm.name;
  }, [algorithm]);

  const validCompareAlgorithm = useMemo(() => {
    return compareAlgorithm && typeof compareAlgorithm === 'object' && compareAlgorithm.name;
  }, [compareAlgorithm]);

  const shouldShowComparison = useMemo(() => {
    return compareMode && validAlgorithm && validCompareAlgorithm;
  }, [compareMode, validAlgorithm, validCompareAlgorithm]);

  useEffect(() => {
    if (validAlgorithm) {
      setShowContent(false);
      const timer = setTimeout(() => {
        setShowContent(true);
        setContentKey((prev: number) => prev + 1);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [validAlgorithm, algorithm?.name]);

  useEffect(() => {
    const handleToggle = () => {
      if (typeof onToggleCompare === 'function') {
        onToggleCompare();
      }
    };
    
    window.addEventListener('toggle-compare', handleToggle);
    return () => window.removeEventListener('toggle-compare', handleToggle);
  }, [onToggleCompare]);

  if (!validAlgorithm && !compareMode) {
    return (
      <main className="main-content" key="empty-state">
        <div className="content-wrapper">
          <EmptyState
            icon="◆"
            title="Algorithm Documentation Hub"
            subtitle="Select an algorithm from the sidebar to explore interactive visualizations, complexity analysis, benchmarks, and implementation details."
          />
        </div>
      </main>
    );
  }

  if (compareMode && (!validAlgorithm || !validCompareAlgorithm)) {
    return (
      <main className="main-content" key="compare-waiting">
        <div className="content-wrapper">
          <EmptyState
            icon="⇄"
            title="Compare Mode Active"
            subtitle={
              !validAlgorithm 
                ? 'Select the first algorithm from the sidebar to begin comparison.'
                : `Now select a second algorithm to compare with ${algorithm.name}`
            }
          />
        </div>
      </main>
    );
  }

  const shouldRenderContent = showContent && validAlgorithm;

  return (
    <main className="main-content">
      <div className="content-wrapper">
        <AnimatePresence mode="wait">
          {shouldShowComparison ? (
            <motion.div
              key={`compare-${algorithm?.name}-${compareAlgorithm?.name}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SectionRenderer
                component={ComparisonSection}
                props={{
                  algorithm1: algorithm,
                  algorithm2: compareAlgorithm,
                  benchmark1: benchmark,
                  benchmark2: compareBenchmark,
                }}
              />
            </motion.div>
          ) : shouldRenderContent ? (
            <motion.div
              key={`${algorithm.name}-${contentKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SectionRenderer 
                component={HeroSection} 
                props={{ algorithm }} 
              />
              <SectionRenderer 
                component={IntuitionSection} 
                props={{ algorithm }} 
              />
              <SectionRenderer 
                component={ComplexitySection} 
                props={{ algorithm }} 
              />
              <SectionRenderer 
                component={VisualizationSection} 
                props={{ algorithm }} 
              />
              <SectionRenderer 
                component={TradeoffSection} 
                props={{ algorithm }} 
              />
              <SectionRenderer 
                component={BenchmarkSection} 
                props={{ algorithm, benchmark }} 
              />
              <SectionRenderer 
                component={CodeSection} 
                props={{ algorithm }} 
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
};

MainContent.defaultProps = {
  algorithm: null,
  compareAlgorithm: null,
  benchmark: null,
  compareBenchmark: null,
  compareMode: false,
  onToggleCompare: () => {},
  sidebarOpen: true,
};

export default React.memo(MainContent, (prevProps: MainContentProps, nextProps: MainContentProps) => {
  const isSame = (
    prevProps.algorithm?.name === nextProps.algorithm?.name &&
    prevProps.compareAlgorithm?.name === nextProps.compareAlgorithm?.name &&
    prevProps.compareMode === nextProps.compareMode &&
    prevProps.sidebarOpen === nextProps.sidebarOpen &&
    prevProps.benchmark === nextProps.benchmark &&
    prevProps.compareBenchmark === nextProps.compareBenchmark
  );
  
  return isSame;
});