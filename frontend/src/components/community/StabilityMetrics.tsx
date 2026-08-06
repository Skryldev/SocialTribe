import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  GitMerge,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  LucideIcon,
} from 'lucide-react';
import './StabilityMetrics.css';

const METRIC_DEFINITIONS = [
  {
    key: 'overallStability',
    label: 'Overall Stability',
    icon: ShieldCheck,
    description: 'Average consensus across all node pairs in the ensemble.',
    invertThreshold: false,
    thresholds: { high: 0.7, medium: 0.45 },
  },
  {
    key: 'avgWithinConsensus',
    label: 'Within-Community Consensus',
    icon: Users,
    description: 'How consistently nodes co-occur inside the same community.',
    invertThreshold: false,
    thresholds: { high: 0.7, medium: 0.45 },
  },
  {
    key: 'avgBetweenConsensus',
    label: 'Between-Community Consensus',
    icon: GitMerge,
    description: 'How consistently nodes are separated into different communities. Lower is better.',
    invertThreshold: true,
    thresholds: { high: 0.25, medium: 0.45 },
  },
];

const getMetricLevel = (value: number, thresholds: { high: number; medium: number }, invert: boolean): string | null => {
  if (value == null || typeof value !== 'number' || isNaN(value)) return null;

  if (invert) {
    if (value <= thresholds.high) return 'high';
    if (value <= thresholds.medium) return 'medium';
    return 'low';
  }

  if (value >= thresholds.high) return 'high';
  if (value >= thresholds.medium) return 'medium';
  return 'low';
};

const getAssessment = (level: string | null, invert: boolean): string => {
  if (!level) return 'No data';
  if (level === 'high') return invert ? 'Well separated' : 'Highly stable';
  if (level === 'medium') return 'Moderate';
  return invert ? 'Overlapping' : 'Unstable';
};

interface TrendIconProps {
  level: string | null;
}

const TrendIcon = ({ level }: TrendIconProps) => {
  if (level === 'high') return <TrendingUp size={14} />;
  if (level === 'low') return <TrendingDown size={14} />;
  return <Minus size={14} />;
};

interface MetricCardProps {
  definition: {
    key: string;
    label: string;
    icon: LucideIcon;
    description: string;
    invertThreshold: boolean;
    thresholds: { high: number; medium: number };
  };
  value: number;
  index: number;
}

const MetricCard = ({ definition, value, index }: MetricCardProps) => {
  const level = getMetricLevel(value, definition.thresholds, definition.invertThreshold);
  const assessment = getAssessment(level, definition.invertThreshold);
  const Icon = definition.icon;
  const percentage = value != null && !isNaN(value) ? Math.round(value * 100) : 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <motion.div
      className={`csm-card ${level ? `csm-card--${level}` : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.1,
        duration: 0.45,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -3 }}
    >
      <div className="csm-card-header">
        <div className="csm-card-icon-wrapper">
          <Icon size={17} className="csm-card-icon" />
        </div>
        <div className="csm-card-badge">
          <TrendIcon level={level} />
          <span>{assessment}</span>
        </div>
      </div>

      <div className="csm-card-body">
        <div className="csm-gauge">
          <svg
            viewBox="0 0 88 88"
            className="csm-gauge-svg"
            aria-label={`${percentage}% stability`}
            role="img"
          >
            <circle
              cx="44"
              cy="44"
              r="36"
              fill="none"
              stroke="var(--csm-track)"
              strokeWidth="6"
            />
            <motion.circle
              cx="44"
              cy="44"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 + index * 0.1 }}
              transform="rotate(-90 44 44)"
              className="csm-gauge-arc"
            />
          </svg>
          <div className="csm-gauge-center">
            <span className="csm-gauge-value">
              {value != null && !isNaN(value) ? (value * 100).toFixed(0) : '—'}
            </span>
            <span className="csm-gauge-unit">%</span>
          </div>
        </div>

        <div className="csm-card-info">
          <h3 className="csm-card-title">{definition.label}</h3>
          <p className="csm-card-desc">{definition.description}</p>
        </div>
      </div>

      <div className="csm-card-footer">
        <span className="csm-card-footer-label">Raw score</span>
        <span className="csm-card-footer-value">
          {value != null && !isNaN(value) ? value.toFixed(4) : 'N/A'}
        </span>
      </div>
    </motion.div>
  );
};

const EmptyState = () => (
  <motion.div
    className="csm-empty"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.35 }}
  >
    <Info size={24} className="csm-empty-icon" />
    <p className="csm-empty-text">No stability metrics available</p>
    <p className="csm-empty-hint">
      Run ensemble community detection to compute stability scores from multiple iterations.
    </p>
  </motion.div>
);

interface StabilityMetricsProps {
  metrics: {
    overallStability?: number;
    avgWithinConsensus?: number;
    avgBetweenConsensus?: number;
  } | null;
}

const StabilityMetrics = ({ metrics }: StabilityMetricsProps): React.ReactElement => {
  const hasAnyMetric = useMemo(
    () =>
      metrics &&
      METRIC_DEFINITIONS.some(
        (def) => metrics[def.key as keyof typeof metrics] != null && !isNaN(metrics[def.key as keyof typeof metrics] as number)
      ),
    [metrics]
  );

  if (!hasAnyMetric) {
    return <EmptyState />;
  }

  return (
    <div className="csm-root">
      <div className="csm-grid">
        {METRIC_DEFINITIONS.map((def, index) => (
          <MetricCard
            key={def.key}
            definition={def}
            value={(metrics as any)?.[def.key]}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default StabilityMetrics;