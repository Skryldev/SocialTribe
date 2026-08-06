import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts';
import {
  BarChart2,
  AlertCircle,
  Radar as RadarIcon,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Hash,
  Clock,
  Activity,
  BarChart3,
  Gauge,
  Target,
  Layers,
  Flame,
  Trophy,
  Crown,
  PlusCircle,
  AlertTriangle,
  Database,
  GitBranch,
  LucideIcon,
} from 'lucide-react';
import './VisualizationSection.css';

const TOKEN = {
  accentPrimary: 'var(--accent-primary, #6366f1)',
  accentPrimaryLight: 'var(--accent-primary-light, #818cf8)',
  accentSecondary: 'var(--accent-secondary, #06b6d4)',
  textMuted: 'var(--text-muted, #6b7280)',
  textSecondary: 'var(--text-secondary, #9ca3af)',
  bgCard: 'var(--bg-card, #1e1e2e)',
  bgTertiary: 'var(--bg-tertiary, #16162a)',
  borderMuted: 'var(--border-muted, #2d2d44)',
  barMuted: 'var(--bar-muted, #3b3b5c)',
  success: 'var(--success, #10b981)',
  warning: 'var(--warning, #f59e0b)',
  danger: 'var(--danger, #ef4444)',
};

const CHART_CONFIG = {
  barHeight: 220,
  radarHeight: 220,
  maxBarSize: 40,
  barGap: '24%',
  animationDuration: 600,
};

class ComplexityClassifier {
  patterns: any[];
  cache: Map<string, any>;

  constructor() {
    this.patterns = this._buildPatterns();
    this.cache = new Map();
  }

  _buildPatterns(): any[] {
    return [
      {
        regex: /O\s*\(\s*n\s*!\s*\)/i,
        score: 100,
        category: 'exponential',
        label: 'O(n!)',
        description: 'Factorial time'
      },
      {
        regex: /O\s*\(\s*2\s*\^?\s*[nv]\s*\)/i,
        score: 98,
        category: 'exponential',
        label: 'O(2ⁿ)',
        description: 'Exponential time'
      },
      {
        regex: /O\s*\(\s*c\s*\^?\s*[nv]\s*\)/i,
        score: 96,
        category: 'exponential',
        label: 'O(cⁿ)',
        description: 'Exponential time'
      },
      {
        regex: /O\s*\(\s*[nv]\s*\^\s*3\s*\)/i,
        score: 92,
        category: 'polynomial',
        label: 'O(n³)',
        description: 'Cubic time'
      },
      {
        regex: /O\s*\(\s*V\s*×?\s*\(?\s*V\s*\+\s*E\s*\)?\s*\)/i,
        score: 85,
        category: 'polynomial',
        label: 'O(V(V+E))',
        description: 'Quadratic in V with E'
      },
      {
        regex: /O\s*\(\s*V\s*[×*]\s*E\s*\)/i,
        score: 85,
        category: 'polynomial',
        label: 'O(V·E)',
        description: 'Product of V and E'
      },
      {
        regex: /O\s*\(\s*[nv]\s*\^\s*2\s*\)/i,
        score: 80,
        category: 'polynomial',
        label: 'O(n²)',
        description: 'Quadratic time'
      },
      {
        regex: /O\s*\(\s*deg\s*\(\s*[uv]\s*\)\s*\^\s*2\s*\)/i,
        score: 78,
        category: 'polynomial',
        label: 'O(deg²)',
        description: 'Quadratic in degree'
      },
      {
        regex: /O\s*\(\s*[nv]\s*log\s*[nv]\s*\)/i,
        score: 55,
        category: 'linearithmic',
        label: 'O(n log n)',
        description: 'Linearithmic time'
      },
      {
        regex: /O\s*\(\s*E\s*log\s*V\s*\)/i,
        score: 55,
        category: 'linearithmic',
        label: 'O(E log V)',
        description: 'Edge log vertex'
      },
      {
        regex: /O\s*\(\s*\(?\s*V\s*\+\s*E\s*\)?\s*log\s*V\s*\)/i,
        score: 52,
        category: 'linearithmic',
        label: 'O((V+E) log V)',
        description: 'Graph linearithmic'
      },
      {
        regex: /O\s*\(\s*V\s*\+\s*E\s*\)/i,
        score: 42,
        category: 'linear',
        label: 'O(V+E)',
        description: 'Linear in graph size'
      },
      {
        regex: /O\s*\(\s*deg\s*\(\s*[uv]\s*\)\s*\+\s*deg\s*\(\s*[uv]\s*\)\s*\)/i,
        score: 40,
        category: 'linear',
        label: 'O(deg(u)+deg(v))',
        description: 'Sum of degrees'
      },
      {
        regex: /O\s*\(\s*[nVE]\s*\)/i,
        score: 35,
        category: 'linear',
        label: 'O(n)',
        description: 'Linear time'
      },
      {
        regex: /O\s*\(\s*min\s*\(/i,
        score: 32,
        category: 'linear',
        label: 'O(min(...))',
        description: 'Minimum of parameters'
      },
      {
        regex: /O\s*\(\s*max\s*\(/i,
        score: 38,
        category: 'linear',
        label: 'O(max(...))',
        description: 'Maximum of parameters'
      },
      {
        regex: /O\s*\(\s*log\s*[nv]\s*\)/i,
        score: 18,
        category: 'logarithmic',
        label: 'O(log n)',
        description: 'Logarithmic time'
      },
      {
        regex: /O\s*\(\s*sqrt\s*\(\s*[nv]\s*\)\s*\)/i,
        score: 22,
        category: 'sublinear',
        label: 'O(√n)',
        description: 'Square root time'
      },
      {
        regex: /O\s*\(\s*1\s*\)/i,
        score: 5,
        category: 'constant',
        label: 'O(1)',
        description: 'Constant time'
      },
    ];
  }

  classify(complexity: string): any {
    if (!complexity) return null;

    const cacheKey = complexity.trim();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const clean = this._normalizeComplexity(complexity);

    let result: any = null;
    for (const pattern of this.patterns) {
      if (pattern.regex.test(clean)) {
        result = {
          ...pattern,
          raw: complexity,
          normalized: clean,
        };
        break;
      }
    }

    if (!result) {
      result = this._fallbackClassification(complexity, clean);
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  _normalizeComplexity(complexity: string): string {
    return complexity
      .replace(/\s+/g, ' ')
      .replace(/×/g, '*')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .trim();
  }

  _fallbackClassification(complexity: string, clean: string): any {
    let score = 40;
    let category = 'unknown';
    let label = complexity;
    let description = 'Unclassified complexity';

    if (clean.includes('!')) {
      score = 100;
      category = 'exponential';
      label = 'O(n!)';
      description = 'Factorial complexity';
    } else if (clean.includes('2^') || clean.includes('2ⁿ')) {
      score = 98;
      category = 'exponential';
      label = 'O(2ⁿ)';
      description = 'Exponential complexity';
    } else if (clean.includes('^3') || clean.includes('³')) {
      score = 92;
      category = 'polynomial';
      label = 'O(n³)';
      description = 'Cubic complexity';
    } else if (clean.includes('^2') || clean.includes('²')) {
      score = 80;
      category = 'polynomial';
      label = 'O(n²)';
      description = 'Quadratic complexity';
    } else if (clean.includes('V*E') || clean.includes('V×E')) {
      score = 85;
      category = 'polynomial';
      label = 'O(V·E)';
      description = 'Product complexity';
    } else if (clean.includes('log')) {
      if (clean.includes('V+E') || clean.includes('V + E')) {
        score = 52;
        category = 'linearithmic';
        label = 'O((V+E) log V)';
        description = 'Graph linearithmic';
      } else {
        score = 55;
        category = 'linearithmic';
        label = 'O(n log n)';
        description = 'Linearithmic complexity';
      }
    } else if (clean.includes('V+E') || clean.includes('V + E')) {
      score = 42;
      category = 'linear';
      label = 'O(V+E)';
      description = 'Linear graph complexity';
    } else if (clean.includes('V') || clean.includes('E')) {
      score = 35;
      category = 'linear';
      label = 'O(n)';
      description = 'Linear complexity';
    } else if (clean.includes('n')) {
      score = 35;
      category = 'linear';
      label = 'O(n)';
      description = 'Linear complexity';
    } else if (clean.includes('sqrt')) {
      score = 22;
      category = 'sublinear';
      label = 'O(√n)';
      description = 'Sub-linear complexity';
    }

    return {
      score,
      category,
      label,
      description,
      raw: complexity,
      normalized: clean,
    };
  }

  getCategoryColor(category: string): string {
    const colors: any = {
      constant: TOKEN.success,
      logarithmic: '#8b5cf6',
      sublinear: '#06b6d4',
      linear: TOKEN.accentPrimary,
      linearithmic: '#f59e0b',
      polynomial: '#f97316',
      exponential: TOKEN.danger,
      unknown: TOKEN.textMuted,
    };
    return colors[category] || colors.unknown;
  }

  getCategoryIcon(category: string): LucideIcon {
    const iconMap: any = {
      constant: Zap,
      logarithmic: TrendingDown,
      sublinear: Minus,
      linear: TrendingUp,
      linearithmic: Activity,
      polynomial: BarChart3,
      exponential: Flame,
      unknown: AlertCircle,
    };
    return iconMap[category] || AlertCircle;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

const classifier = new ComplexityClassifier();

export const toScore = (complexity: string): number => {
  const result = classifier.classify(complexity);
  return result ? result.score : 40;
};

export const getComplexityInfo = (complexity: string): any => {
  return classifier.classify(complexity);
};

const buildReferenceScale = (algorithm: any): any[] => {
  const baseReferences = [
    { label: 'O(1)', score: 5, category: 'constant', latex: 'O(1)' },
    { label: 'O(log n)', score: 18, category: 'logarithmic', latex: 'O(\\log n)' },
    { label: 'O(√n)', score: 22, category: 'sublinear', latex: 'O(\\sqrt{n})' },
    { label: 'O(n)', score: 35, category: 'linear', latex: 'O(n)' },
    { label: 'O(V+E)', score: 42, category: 'linear', latex: 'O(V+E)' },
    { label: 'O(n log n)', score: 55, category: 'linearithmic', latex: 'O(n \\log n)' },
    { label: 'O(n²)', score: 80, category: 'polynomial', latex: 'O(n^2)' },
    { label: 'O(V·E)', score: 85, category: 'polynomial', latex: 'O(V \\cdot E)' },
    { label: 'O(n³)', score: 92, category: 'polynomial', latex: 'O(n^3)' },
    { label: 'O(2ⁿ)', score: 98, category: 'exponential', latex: 'O(2^n)' },
    { label: 'O(n!)', score: 100, category: 'exponential', latex: 'O(n!)' },
  ];

  const algorithmComplexities = [
    algorithm?.timeComplexity,
    algorithm?.spaceComplexity,
    algorithm?.bestCase,
    algorithm?.worstCase,
    algorithm?.averageCase,
  ].filter(Boolean);

  const uniqueAlgorithmLabels = new Set<string>();
  const algorithmRefs: any[] = [];

  algorithmComplexities.forEach((complexity: string) => {
    const info = classifier.classify(complexity);
    if (info && !uniqueAlgorithmLabels.has(info.label)) {
      uniqueAlgorithmLabels.add(info.label);
      algorithmRefs.push({
        label: info.label,
        score: info.score,
        category: info.category,
        latex: complexity,
        isAlgorithm: true,
      });
    }
  });

  const combined = [...algorithmRefs, ...baseReferences];
  const seen = new Set<string>();
  const unique = combined.filter((item: any) => {
    const key = `${item.label}-${item.score}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a: any, b: any) => a.score - b.score);
};

const useComplexityClassification = (complexity: string): any => {
  return useMemo(() => {
    if (!complexity) return null;
    return classifier.classify(complexity);
  }, [complexity]);
};

const useReferenceScale = (algorithm: any, customReferences?: any[]): any[] => {
  return useMemo(() => {
    if (customReferences) return customReferences;
    return buildReferenceScale(algorithm);
  }, [algorithm, customReferences]);
};

const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const { label, score, category, description, isAlgorithm, latex } = data;
  const Icon = category ? classifier.getCategoryIcon(category) : Hash;
  const color = category ? classifier.getCategoryColor(category) : TOKEN.textMuted;

  return (
    <div className="vs-tooltip" style={{
      background: TOKEN.bgCard,
      border: `1px solid ${TOKEN.borderMuted}`,
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      maxWidth: 260,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {isAlgorithm ? (
          <Crown size={14} style={{ color: TOKEN.accentPrimaryLight }} />
        ) : (
          <Icon size={14} style={{ color }} />
        )}
        <span style={{
          fontWeight: 600,
          fontSize: 13,
          color: isAlgorithm ? TOKEN.accentPrimaryLight : TOKEN.textSecondary,
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          {label}
        </span>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
      }}>
        <span style={{ fontSize: 12, color: TOKEN.textMuted }}>
          Score: <strong style={{ color: TOKEN.textSecondary }}>{score}</strong>
        </span>
        {category && (
          <span style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 12,
            background: `${color}22`,
            color: color,
            textTransform: 'capitalize',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <Icon size={10} />
            {category}
          </span>
        )}
      </div>

      {description && (
        <div style={{
          fontSize: 11,
          color: TOKEN.textMuted,
          marginTop: 4,
          borderTop: `1px solid ${TOKEN.borderMuted}`,
          paddingTop: 4,
        }}>
          {description}
        </div>
      )}

      {latex && latex !== label && (
        <div style={{
          fontSize: 10,
          color: TOKEN.textMuted,
          marginTop: 2,
          opacity: 0.7,
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          {latex}
        </div>
      )}
    </div>
  );
};

const RadarTooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const info = classifier.classify(data.complexity);
  const Icon = info ? classifier.getCategoryIcon(info.category) : Hash;
  const color = info ? classifier.getCategoryColor(info.category) : TOKEN.textMuted;

  return (
    <div className="vs-tooltip" style={{
      background: TOKEN.bgCard,
      border: `1px solid ${TOKEN.borderMuted}`,
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target size={14} style={{ color: TOKEN.accentPrimaryLight }} />
        <span style={{ fontWeight: 600, fontSize: 14, color: TOKEN.textSecondary }}>
          {data.metric}
        </span>
        <span style={{
          fontSize: 12,
          color: TOKEN.accentPrimaryLight,
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          {data.complexity}
        </span>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 4,
        gap: 16,
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: TOKEN.textMuted }}>
          Score: <strong style={{ color: TOKEN.textSecondary }}>{data.score}</strong>
        </span>
        {info && (
          <span style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 12,
            background: `${color}22`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <Icon size={10} />
            {info.category}
          </span>
        )}
      </div>
    </div>
  );
};

interface ComplexityBarChartProps {
  algorithm: any;
  referenceComplexities: any[];
}

const ComplexityBarChart = memo(({ algorithm, referenceComplexities }: ComplexityBarChartProps) => {
  const algoInfo = useComplexityClassification(algorithm?.timeComplexity);
  const algoScore = algoInfo?.score || 40;

  const chartData = useMemo(() => {
    return referenceComplexities.map((item: any) => ({
      ...item,
      isAlgorithm: item.score === algoScore && item.isAlgorithm !== false,
    }));
  }, [referenceComplexities, algoScore]);

  const hasAlgorithmInChart = chartData.some((item: any) => item.isAlgorithm);

  return (
    <div className="vs-panel" style={{ height: '100%' }}>
      <div className="vs-panel__header">
        <BarChart2 size={16} strokeWidth={2} aria-hidden="true" />
        <span style={{ fontWeight: 600 }}>Complexity Scale</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: TOKEN.textMuted,
          background: TOKEN.bgTertiary,
          padding: '2px 10px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <Layers size={12} />
          {chartData.length} references
        </span>
      </div>

      <p className="vs-panel__sub" style={{ fontSize: 12, color: TOKEN.textMuted }}>
        {algorithm?.name ? (
          <>Comparing <strong style={{ color: TOKEN.textSecondary }}>{algorithm.name}</strong> against complexity classes</>
        ) : (
          'Complexity reference scale'
        )}
      </p>

      <ResponsiveContainer width="100%" height={CHART_CONFIG.barHeight}>
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 8, left: -20, bottom: 8 }}
          barCategoryGap={CHART_CONFIG.barGap}
        >
          <CartesianGrid
            vertical={false}
            stroke={TOKEN.borderMuted}
            strokeDasharray="3 3"
            opacity={0.5}
          />
          <XAxis
            dataKey="label"
            tick={{
              fontSize: 9,
              fontFamily: 'var(--font-mono, monospace)',
              fill: TOKEN.textMuted,
              angle: -20,
              textAnchor: 'end',
              height: 50,
            }}
            axisLine={false}
            tickLine={false}
            interval={0}
            height={50}
          />
          <YAxis
            domain={[0, 105]}
            tick={{ fontSize: 9, fill: TOKEN.textMuted }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          <Bar
            dataKey="score"
            radius={[3, 3, 0, 0]}
            maxBarSize={CHART_CONFIG.maxBarSize}
            animationDuration={CHART_CONFIG.animationDuration}
          >
            {chartData.map((entry: any) => {
              const isAlgo = entry.isAlgorithm;
              const categoryColor = classifier.getCategoryColor(entry.category);
              return (
                <Cell
                  key={`${entry.label}-${entry.score}`}
                  fill={isAlgo ? TOKEN.accentPrimary : (entry.category ? categoryColor : TOKEN.barMuted)}
                  fillOpacity={isAlgo ? 1 : 0.5}
                  style={{
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="vs-bar-legend" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 4,
        padding: '6px 12px',
        borderRadius: 6,
        background: TOKEN.bgTertiary,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Crown size={12} style={{ color: TOKEN.accentPrimaryLight }} />
          <span style={{ fontSize: 11, color: TOKEN.textSecondary }}>
            {algorithm?.name || 'Algorithm'} — {algorithm?.timeComplexity || '—'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: 3,
            background: TOKEN.barMuted,
            opacity: 0.5,
          }} />
          <span style={{ fontSize: 11, color: TOKEN.textMuted }}>Reference</span>
        </div>

        {!hasAlgorithmInChart && algorithm?.timeComplexity && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            color: TOKEN.warning,
          }}>
            <AlertTriangle size={12} />
            <span>Custom complexity not in reference</span>
          </div>
        )}
      </div>
    </div>
  );
});

ComplexityBarChart.displayName = 'ComplexityBarChart';

const RADAR_METRICS = [
  { key: 'timeComplexity', label: 'Time', icon: Clock },
  { key: 'spaceComplexity', label: 'Space', icon: Database },
  { key: 'bestCase', label: 'Best Case', icon: Trophy },
  { key: 'worstCase', label: 'Worst Case', icon: Flame },
  { key: 'averageCase', label: 'Average Case', icon: Gauge },
];

interface ComplexityRadarChartProps {
  algorithm: any;
}

const ComplexityRadarChart = memo(({ algorithm }: ComplexityRadarChartProps) => {
  const radarData = useMemo(() => {
    const data = RADAR_METRICS
      .filter(({ key }) => Boolean(algorithm?.[key]))
      .map(({ key, label, icon: Icon }) => {
        const complexity = algorithm[key];
        const info = classifier.classify(complexity);
        return {
          metric: label,
          score: info?.score || 40,
          complexity,
          category: info?.category || 'unknown',
          rawLabel: label,
          icon: Icon,
        };
      });

    const order = ['Time', 'Space', 'Best Case', 'Worst Case', 'Average Case'];
    return data.sort((a: any, b: any) => order.indexOf(a.rawLabel) - order.indexOf(b.rawLabel));
  }, [algorithm]);

  if (radarData.length < 3) {
    return (
      <div className="vs-panel vs-panel--empty" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 200,
        gap: 12,
        color: TOKEN.textMuted,
      }}>
        <RadarIcon size={32} strokeWidth={1.25} aria-hidden="true" />
        <p style={{ fontSize: 13, textAlign: 'center' }}>
          Need at least 3 complexity metrics<br />
          <span style={{ fontSize: 12, opacity: 0.7 }}>for radar visualization</span>
        </p>
      </div>
    );
  }

  const avgScore = radarData.reduce((sum: number, d: any) => sum + d.score, 0) / radarData.length;

  return (
    <div className="vs-panel" style={{ height: '100%' }}>
      <div className="vs-panel__header">
        <RadarIcon size={16} strokeWidth={2} aria-hidden="true" />
        <span style={{ fontWeight: 600 }}>Complexity Profile</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: TOKEN.textMuted,
          background: TOKEN.bgTertiary,
          padding: '2px 10px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <GitBranch size={12} />
          {radarData.length} dimensions
        </span>
      </div>

      <p className="vs-panel__sub" style={{ fontSize: 12, color: TOKEN.textMuted }}>
        Multi-dimensional complexity analysis
      </p>

      <ResponsiveContainer width="100%" height={CHART_CONFIG.radarHeight}>
        <RadarChart data={radarData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
          <PolarGrid
            stroke={TOKEN.borderMuted}
            strokeDasharray="2 2"
          />
          <PolarAngleAxis
            dataKey="metric"
            tick={{
              fontSize: 10,
              fill: TOKEN.textSecondary,
              fontWeight: 500,
            }}
          />
          <Radar
            name={algorithm?.name || 'Algorithm'}
            dataKey="score"
            stroke={TOKEN.accentPrimary}
            fill={TOKEN.accentPrimary}
            fillOpacity={0.15 + (avgScore / 100) * 0.2}
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: TOKEN.accentPrimary,
              strokeWidth: 0,
            }}
            activeDot={{
              r: 6,
              fill: TOKEN.accentPrimaryLight,
              strokeWidth: 2,
              stroke: TOKEN.accentPrimary,
            }}
            animationDuration={CHART_CONFIG.animationDuration}
          />
          <Tooltip content={<RadarTooltipContent />} />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              color: TOKEN.textMuted,
              paddingTop: 4,
            }}
            formatter={(value: string) => (
              <span style={{ color: TOKEN.textSecondary, fontWeight: 500 }}>
                {value}
              </span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        justifyContent: 'center',
        marginTop: 4,
      }}>
        {radarData.slice(0, 3).map((item: any) => {
          const color = classifier.getCategoryColor(item.category);
          const Icon = item.icon;
          return (
            <span
              key={item.rawLabel}
              style={{
                fontSize: 9,
                padding: '2px 8px',
                borderRadius: 10,
                background: `${color}22`,
                color: color,
                border: `1px solid ${color}33`,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon size={10} />
              {item.rawLabel}: {item.complexity}
            </span>
          );
        })}
        {radarData.length > 3 && (
          <span style={{
            fontSize: 9,
            padding: '2px 8px',
            borderRadius: 10,
            background: TOKEN.bgTertiary,
            color: TOKEN.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <PlusCircle size={10} />
            {radarData.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
});

ComplexityRadarChart.displayName = 'ComplexityRadarChart';

const EmptyState = memo(() => (
  <div className="vs-empty" role="status" aria-live="polite" style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
    color: TOKEN.textMuted,
  }}>
    <AlertCircle size={28} strokeWidth={1.5} aria-hidden="true" />
    <p style={{ fontSize: 14, fontWeight: 500 }}>No complexity data available</p>
    <p style={{ fontSize: 12, textAlign: 'center', maxWidth: 320, opacity: 0.7 }}>
      Add time or space complexity information to enable visualization
    </p>
  </div>
));

EmptyState.displayName = 'EmptyState';

interface VisualizationSectionProps {
  algorithm?: any;
  referenceComplexities?: any[];
  className?: string;
}

const VisualizationSection = ({
  algorithm,
  referenceComplexities: customReferences,
  className = '',
}: VisualizationSectionProps): React.ReactElement => {
  const hasAny = Boolean(algorithm?.timeComplexity || algorithm?.spaceComplexity);

  const referenceComplexities = useReferenceScale(algorithm, customReferences);

  const algorithmInfo = useComplexityClassification(algorithm?.timeComplexity);

  return (
    <motion.section
      className={`vs-root section ${className}`}
      aria-labelledby="vs-heading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <header className="section-header" style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 20,
      }}>
        <div className="section-icon" aria-hidden="true" style={{
          padding: 8,
          borderRadius: 8,
          background: `${TOKEN.accentPrimary}22`,
          color: TOKEN.accentPrimary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <BarChart2 size={20} strokeWidth={1.75} />
        </div>

        <div style={{ flex: 1 }}>
          <h2
            className="section-title"
            id="vs-heading"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: TOKEN.textSecondary,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Complexity Visualization
            {algorithmInfo && (
              <span style={{
                fontSize: 11,
                padding: '2px 10px',
                borderRadius: 12,
                background: `${classifier.getCategoryColor(algorithmInfo.category)}22`,
                color: classifier.getCategoryColor(algorithmInfo.category),
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                {React.createElement(classifier.getCategoryIcon(algorithmInfo.category), { size: 12 })}
                {algorithmInfo.category}
              </span>
            )}
          </h2>
          <p className="section-description" style={{
            fontSize: 13,
            color: TOKEN.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            {algorithm?.name ? (
              <>
                <strong style={{ color: TOKEN.textSecondary }}>{algorithm.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Layers size={12} />
                  {referenceComplexities.length} reference points
                </span>
              </>
            ) : (
              'Select an algorithm to visualize complexity'
            )}
          </p>
        </div>
      </header>

      {hasAny ? (
        <div className="vs-charts-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>
          <ComplexityBarChart
            algorithm={algorithm}
            referenceComplexities={referenceComplexities}
          />
          <ComplexityRadarChart algorithm={algorithm} />
        </div>
      ) : (
        <EmptyState />
      )}
    </motion.section>
  );
};

VisualizationSection.displayName = 'VisualizationSection';

export default memo(VisualizationSection);