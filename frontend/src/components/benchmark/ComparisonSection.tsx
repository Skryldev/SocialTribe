import React, {
  memo,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  Clock,
  HardDrive,
  TrendingDown,
  TrendingUp,
  BarChart2,
  Layers,
  Cpu,
  GitBranch,
  Download,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import katex from 'katex';
import { toast } from 'sonner';
import './ComparisonSection.css';

const COMPLEXITY_ORDER = [
  'O(1)', 'O(log n)', 'O(n)', 'O(V + E)', 'O(V+E)',
  'O(n log n)', 'O((V + E) log V)', 'O((V+E)logV)', 'O(VE)', 'O(n²)', 'O(2ⁿ)',
];

const complexityRank = (str: string = ''): number => {
  if (!str) return 5;
  for (let i = 0; i < COMPLEXITY_ORDER.length; i++) {
    if (str.includes(COMPLEXITY_ORDER[i])) return i;
  }
  return 5;
};

const rankToScore = (rank: number): number => Math.round((rank / (COMPLEXITY_ORDER.length - 1)) * 100);

const renderLatex = (latex: string): string | null => {
  if (!latex) return null;
  try {
    return katex.renderToString(latex, { throwOnError: false, output: 'html' });
  } catch {
    return latex;
  }
};

const METRICS = [
  {
    key: 'timeComplexity',
    label: 'Time Complexity',
    Icon: Clock,
    category: 'complexity',
    type: 'complexity',
    tooltip: 'How execution time grows with input size',
    higherIsBetter: false,
  },
  {
    key: 'spaceComplexity',
    label: 'Space Complexity',
    Icon: HardDrive,
    category: 'complexity',
    type: 'complexity',
    tooltip: 'Additional memory required relative to input size',
    higherIsBetter: false,
  },
  {
    key: 'bestCase',
    label: 'Best Case',
    Icon: TrendingDown,
    category: 'complexity',
    type: 'complexity',
    tooltip: 'Lower bound on time for optimal input',
    higherIsBetter: false,
  },
  {
    key: 'worstCase',
    label: 'Worst Case',
    Icon: TrendingUp,
    category: 'complexity',
    type: 'complexity',
    tooltip: 'Upper bound on time for adversarial input',
    higherIsBetter: false,
  },
  {
    key: 'averageCase',
    label: 'Average Case',
    Icon: BarChart2,
    category: 'complexity',
    type: 'complexity',
    tooltip: 'Expected time over uniformly random inputs',
    higherIsBetter: false,
  },
  {
    key: 'stable',
    label: 'Stable',
    Icon: Layers,
    category: 'characteristics',
    type: 'boolean',
    tooltip: 'Preserves relative order of equal elements',
  },
  {
    key: 'inPlace',
    label: 'In-place',
    Icon: HardDrive,
    category: 'characteristics',
    type: 'boolean',
    tooltip: 'Operates without significant extra memory',
  },
  {
    key: 'recursive',
    label: 'Recursive',
    Icon: GitBranch,
    category: 'characteristics',
    type: 'boolean',
    tooltip: 'Uses recursive calls in its core implementation',
  },
  {
    key: 'parallelizable',
    label: 'Parallelizable',
    Icon: Cpu,
    category: 'characteristics',
    type: 'boolean',
    tooltip: 'Can be efficiently run on multiple cores',
  },
];

const FILTER_TABS = [
  { id: 'all',             label: 'All'             },
  { id: 'complexity',      label: 'Complexity'      },
  { id: 'characteristics', label: 'Characteristics' },
];

const compareMetric = (metric: any, v1: any, v2: any): string => {
  if (v1 == null || v2 == null) return 'tie';

  if (metric.type === 'complexity') {
    const r1 = complexityRank(v1);
    const r2 = complexityRank(v2);
    if (r1 < r2) return 'left';
    if (r2 < r1) return 'right';
    return 'tie';
  }

  if (metric.type === 'boolean') {
    const b1 = v1 === true || v1 === 'true' || v1 === 'yes';
    const b2 = v2 === true || v2 === 'true' || v2 === 'yes';
    if (b1 && !b2) return 'left';
    if (b2 && !b1) return 'right';
    return 'tie';
  }

  if (metric.type === 'number') {
    const n1 = parseFloat(v1);
    const n2 = parseFloat(v2);
    if (isNaN(n1) || isNaN(n2)) return 'tie';
    const better = metric.higherIsBetter ? n1 > n2 : n1 < n2;
    return better ? 'left' : n1 === n2 ? 'tie' : 'right';
  }

  return 'tie';
};

interface TooltipProps {
  text: string;
}

const Tooltip = memo(({ text }: TooltipProps) => {
  const [visible, setVisible] = useState<boolean>(false);
  return (
    <span
      className="cmp-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-label={text}
      role="tooltip"
    >
      <Info size={11} strokeWidth={2} style={{ color: 'var(--text-muted, #6b7280)' }} />
      {visible && <span className="cmp-tooltip-bubble">{text}</span>}
    </span>
  );
});
Tooltip.displayName = 'Tooltip';

interface BoolTagProps {
  value: any;
}

const BoolTag = memo(({ value }: BoolTagProps) => {
  const isYes = value === true || value === 'true' || value === 'yes';
  const isNo  = value === false || value === 'false' || value === 'no';
  const cls   = isYes ? 'cmp-metric__tag--yes' : isNo ? 'cmp-metric__tag--no' : 'cmp-metric__tag--neutral';
  const label = isYes ? '✓ Yes' : isNo ? '✗ No' : '— N/A';
  return <span className={`cmp-metric__tag ${cls}`}>{label}</span>;
});
BoolTag.displayName = 'BoolTag';

interface MetricRowProps {
  metric: any;
  value: any;
  result: string;
  side: string;
}

const MetricRow = memo(({ metric, value, result, side }: MetricRowProps) => {
  const { Icon, label, type, tooltip } = metric;

  const valueMod = useMemo(() => {
    if (result === 'tie') return 'equal';
    return result === side ? 'better' : 'worse';
  }, [result, side]);

  const barWidth = useMemo(() => {
    if (type !== 'complexity' || !value) return 0;
    const rank = complexityRank(value);
    return rankToScore(rank);
  }, [type, value]);

  const latexHtml = useMemo(
    () => (type === 'complexity' ? renderLatex(value) : null),
    [type, value],
  );

  if (value == null) {
    return (
      <div className="cmp-metric-row" aria-hidden="true">
        <span className="cmp-metric__label">
          <Icon size={12} className="cmp-metric__icon" />
          {label}
        </span>
        <span className="cmp-metric__value cmp-metric__value--equal" style={{ opacity: 0.3 }}>—</span>
      </div>
    );
  }

  return (
    <div
      className="cmp-metric-row"
      role="row"
      aria-label={`${label}: ${value}`}
    >
      <span className="cmp-metric__label">
        <Icon size={12} className="cmp-metric__icon" aria-hidden="true" />
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>

      {type === 'complexity' && latexHtml ? (
        <>
          <span
            className={`cmp-metric__value cmp-metric__value--${valueMod}`}
            dangerouslySetInnerHTML={{ __html: latexHtml }}
          />
          <div className="cmp-score-bar" aria-hidden="true">
            <motion.div
              className={`cmp-score-bar__fill cmp-score-bar__fill--${valueMod}`}
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </>
      ) : type === 'boolean' ? (
        <BoolTag value={value} />
      ) : (
        <span className={`cmp-metric__value cmp-metric__value--${valueMod}`}>
          {String(value)}
        </span>
      )}
    </div>
  );
});
MetricRow.displayName = 'MetricRow';

interface BridgeIndicatorProps {
  result: string;
}

const BridgeIndicator = memo(({ result }: BridgeIndicatorProps) => {
  const dotCls =
    result === 'left'  ? 'cmp-bridge__dot--left'  :
    result === 'right' ? 'cmp-bridge__dot--right' :
    'cmp-bridge__dot--tie';

  return (
    <div className="cmp-bridge__indicator" aria-hidden="true">
      <span className={`cmp-bridge__dot ${dotCls}`} />
    </div>
  );
});
BridgeIndicator.displayName = 'BridgeIndicator';

interface AlgoPanelProps {
  algorithm: any;
  side: string;
  results: string[];
  visibleMetrics: any[];
  color: string;
}

const AlgoPanel = memo(({ algorithm, side, results, visibleMetrics, color }: AlgoPanelProps) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const isWinner = useMemo(
    () => results.filter((r: string) => r === side).length > results.filter((r: string) => r !== side && r !== 'tie').length,
    [results, side],
  );

  return (
    <motion.div
      className={`cmp-panel cmp-panel--${side === 'left' ? '1' : '2'}`}
      initial={{ opacity: 0, x: side === 'left' ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: side === 'left' ? 0.1 : 0.2 }}
      role="region"
      aria-label={`${algorithm.name} comparison panel`}
      style={{ '--panel-accent': color } as React.CSSProperties}
    >
      <div className="cmp-panel__head">
        <h3 className="cmp-panel__name">{algorithm.name}</h3>
        <div className="cmp-panel__badges">
          {isWinner && <span className="cmp-badge cmp-badge--winner">Recommended</span>}
          {algorithm.category && (
            <span className="cmp-badge cmp-badge--category">{algorithm.category}</span>
          )}
        </div>
      </div>

      <div className="cmp-panel__body" role="table" aria-label={`${algorithm.name} metrics`}>
        {visibleMetrics.map((metric: any, i: number) => (
          <MetricRow
            key={metric.key}
            metric={metric}
            value={algorithm[metric.key] ?? null}
            result={results[i]}
            side={side}
          />
        ))}
      </div>

      {algorithm.description && (
        <div className="cmp-panel__footer">
          <button
            className="cmp-expand-btn"
            onClick={() => setExpanded((e: boolean) => !e)}
            aria-expanded={expanded}
            aria-controls={`cmp-details-${side}`}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                id={`cmp-details-${side}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <p style={{
                  margin: '12px 0 0',
                  fontSize: '13px',
                  lineHeight: 1.65,
                  color: 'var(--text-secondary, #9ca3af)',
                }}>
                  {algorithm.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
});
AlgoPanel.displayName = 'AlgoPanel';

const exportToCSV = (algorithm1: any, algorithm2: any, metrics: any[]): void => {
  const rows = [
    ['Metric', algorithm1.name, algorithm2.name, 'Winner'],
    ...metrics.map((m: any) => {
      const v1 = algorithm1[m.key] ?? '—';
      const v2 = algorithm2[m.key] ?? '—';
      const res = compareMetric(m, algorithm1[m.key], algorithm2[m.key]);
      const winner = res === 'left' ? algorithm1.name : res === 'right' ? algorithm2.name : 'Tie';
      return [m.label, v1, v2, winner];
    }),
  ];

  const csv = rows.map((r: string[]) => r.map((c: string) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `comparison-${algorithm1.name}-vs-${algorithm2.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

interface ComparisonSectionProps {
  algorithm1?: any;
  algorithm2?: any;
  benchmark1?: any;
  benchmark2?: any;
}

const ComparisonSection = ({
  algorithm1,
  algorithm2,
  benchmark1,
  benchmark2,
}: ComparisonSectionProps): React.ReactElement => {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  if (!algorithm1 || !algorithm2) {
    return (
      <motion.div
        className="cmp-empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        role="status"
        aria-live="polite"
      >
        <div className="cmp-empty__icon">⇄</div>
        <h2 className="cmp-empty__title">Select Two Algorithms</h2>
        <p className="cmp-empty__sub">
          Choose two algorithms from the sidebar to compare their characteristics side by side.
        </p>
      </motion.div>
    );
  }

  const visibleMetrics = useMemo(
    () => activeFilter === 'all'
      ? METRICS
      : METRICS.filter((m: any) => m.category === activeFilter),
    [activeFilter],
  );

  const results = useMemo(
    () => visibleMetrics.map((m: any) => compareMetric(m, algorithm1[m.key], algorithm2[m.key])),
    [visibleMetrics, algorithm1, algorithm2],
  );

  const verdict = useMemo(() => {
    let left = 0, right = 0;

    results.forEach((r: string) => {
      if (r === 'left')  left++;
      if (r === 'right') right++;
    });

    if (benchmark1?.large?.throughput && benchmark2?.large?.throughput) {
      if (benchmark1.large.throughput > benchmark2.large.throughput) left  += 1.5;
      else                                                            right += 1.5;
    }

    if (left > right) return {
      side: 'left',
      icon: '🏆',
      title: `${algorithm1.name} recommended`,
      body: `${algorithm1.name} wins on ${Math.round(left)} of ${results.length} measured dimensions. Prefer it when performance and scalability are priorities.`,
    };
    if (right > left) return {
      side: 'right',
      icon: '🏆',
      title: `${algorithm2.name} recommended`,
      body: `${algorithm2.name} wins on ${Math.round(right)} of ${results.length} measured dimensions. It offers better overall characteristics for most use cases.`,
    };
    return {
      side: 'tie',
      icon: '⚖️',
      title: 'Balanced trade-off',
      body: 'Both algorithms are comparable across the measured dimensions. Choose based on your specific constraints — dataset shape, memory budget, or stability requirements.',
    };
  }, [results, algorithm1, algorithm2, benchmark1, benchmark2]);

  const handleExport = useCallback(() => {
    exportToCSV(algorithm1, algorithm2, visibleMetrics);
    toast.success('Comparison exported successfully', {
      description: `${algorithm1.name} vs ${algorithm2.name}.csv`,
      position: 'top-right',
    });
  }, [algorithm1, algorithm2, visibleMetrics]);

  const hasBenchmarks = Boolean(
    benchmark1?.small && benchmark2?.small &&
    benchmark1?.medium && benchmark2?.medium &&
    benchmark1?.large && benchmark2?.large,
  );

  return (
    <motion.section
      className="cmp-root"
      aria-labelledby="cmp-heading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <header className="cmp-header">
        <div className="cmp-header__icon" aria-hidden="true">
          <ArrowLeftRight size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="cmp-header__title" id="cmp-heading">
            {algorithm1.name} vs {algorithm2.name}
          </h2>
          <p className="cmp-header__subtitle">
            Side-by-side comparison across complexity, characteristics, and benchmarks
          </p>
        </div>
      </header>

      <div className="cmp-toolbar">
        <div className="cmp-toolbar__filters" role="group" aria-label="Filter comparison metrics">
          {FILTER_TABS.map((tab: any) => (
            <button
              key={tab.id}
              className={`cmp-filter-btn ${activeFilter === tab.id ? 'cmp-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter(tab.id)}
              aria-pressed={activeFilter === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="cmp-toolbar__actions">
          <button
            className="cmp-action-btn"
            onClick={handleExport}
            aria-label="Export comparison as CSV"
          >
            <Download size={13} strokeWidth={2} />
            Export CSV
          </button>
        </div>
      </div>

      <div
        className="cmp-grid"
        role="table"
        aria-label={`Comparison of ${algorithm1.name} and ${algorithm2.name}`}
      >
        <AlgoPanel
          algorithm={algorithm1}
          side="left"
          results={results}
          visibleMetrics={visibleMetrics}
          color="var(--accent-primary, #6366f1)"
        />

        <div className="cmp-bridge" aria-hidden="true">
          {results.map((result: string, i: number) => (
            <BridgeIndicator key={i} result={result} />
          ))}
        </div>

        <AlgoPanel
          algorithm={algorithm2}
          side="right"
          results={results}
          visibleMetrics={visibleMetrics}
          color="var(--accent-secondary, #06b6d4)"
        />
      </div>

      {hasBenchmarks && (
        <motion.div
          className="cmp-bench"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          role="region"
          aria-label="Benchmark comparison"
        >
          <div className="cmp-bench__head">
            <BarChart2 size={15} strokeWidth={2} color="var(--accent-primary, #6366f1)" aria-hidden="true" />
            <h3 className="cmp-bench__title">Empirical Benchmarks</h3>
          </div>
          <table aria-label="Benchmark results by input size">
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col">n</th>
                <th scope="col">{algorithm1.name} (ms)</th>
                <th scope="col">{algorithm2.name} (ms)</th>
                <th scope="col">Faster</th>
              </tr>
            </thead>
            <tbody>
              {['small', 'medium', 'large'].map((size: string, i: number) => {
                const b1 = benchmark1[size];
                const b2 = benchmark2[size];
                if (!b1 || !b2) return null;
                const winner = b1.time < b2.time ? algorithm1.name : algorithm2.name;
                return (
                  <motion.tr
                    key={size}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                  >
                    <td>{size.charAt(0).toUpperCase() + size.slice(1)}</td>
                    <td>{b1.n.toLocaleString()}</td>
                    <td>{b1.time.toFixed(2)}</td>
                    <td>{b2.time.toFixed(2)}</td>
                    <td className="cmp-bench__winner-cell">{winner}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      <motion.div
        className="cmp-verdict"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        role="status"
        aria-live="polite"
        aria-label={`Verdict: ${verdict.title}`}
      >
        <span className="cmp-verdict__icon">{verdict.icon}</span>
        <div>
          <p className="cmp-verdict__title">{verdict.title}</p>
          <p className="cmp-verdict__body">{verdict.body}</p>
        </div>
      </motion.div>
    </motion.section>
  );
};

ComparisonSection.defaultProps = {
  algorithm1:  null,
  algorithm2:  null,
  benchmark1:  null,
  benchmark2:  null,
};

ComparisonSection.displayName = 'ComparisonSection';

export default memo(ComparisonSection);