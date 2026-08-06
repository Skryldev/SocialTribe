import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { TrendingUp, Activity, BarChart3, LucideIcon } from 'lucide-react';
import './ModularityProgress.css';

const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 12, right: 16, bottom: 32, left: 12 };

interface Stats {
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  trend: number;
  trendDirection: string;
  firstValue: number;
  lastValue: number;
  count: number;
}

const computeStats = (data: number[]): Stats | null => {
  if (!data?.length) return null;

  const values = data;
  const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  const sorted = [...values].sort((a: number, b: number) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const trend = lastValue - firstValue;
  const trendDirection = trend > 0.005 ? 'up' : trend < -0.005 ? 'down' : 'stable';

  return {
    mean,
    median,
    min,
    max,
    range,
    trend,
    trendDirection,
    firstValue,
    lastValue,
    count: values.length,
  };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const value = payload[0].value;

  return (
    <div className="cmp-tooltip">
      <div className="cmp-tooltip-header">
        <Activity size={12} className="cmp-tooltip-header-icon" />
        <span>Run {label}</span>
      </div>
      <div className="cmp-tooltip-body">
        <span className="cmp-tooltip-label">Modularity</span>
        <span className="cmp-tooltip-value">{value.toFixed(4)}</span>
      </div>
      <div className="cmp-tooltip-bar">
        <div
          className="cmp-tooltip-bar-fill"
          style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
        />
      </div>
    </div>
  );
};

const TREND_ICON_MAP: any = {
  up: TrendingUp,
  down: TrendingUp,
  stable: Activity,
};

interface TrendIconProps {
  direction: string;
  size?: number;
}

const TrendIcon = ({ direction, size = 13 }: TrendIconProps) => {
  const IconComponent = TREND_ICON_MAP[direction] || Activity;
  const shouldAnimate = direction === 'up';

  return (
    <motion.span
      className="cmp-stat-trend-icon"
      animate={shouldAnimate ? { y: [0, -3, 0] } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <IconComponent size={size} />
    </motion.span>
  );
};

interface StatItemProps {
  icon?: LucideIcon;
  label: string;
  value: string;
  trendDirection?: string;
}

const StatItem = ({ icon: Icon, label, value, trendDirection }: StatItemProps) => {
  const className = `cmp-stat${trendDirection ? ` cmp-stat-trend cmp-stat-trend--${trendDirection}` : ''}`;

  return (
    <div className={className}>
      {Icon && <Icon size={13} className="cmp-stat-icon" />}
      <span className="cmp-stat-label">{label}</span>
      <span className="cmp-stat-value">{value}</span>
    </div>
  );
};

interface StatsRowProps {
  stats: Stats | null;
}

const StatsRow = ({ stats }: StatsRowProps) => {
  if (!stats) return null;

  const trendValue = stats.trend > 0 ? `+${stats.trend.toFixed(4)}` : stats.trend.toFixed(4);

  return (
    <div className="cmp-stats">
      <StatItem
        icon={BarChart3}
        label="Mean"
        value={stats.mean.toFixed(4)}
      />
      
      <StatItem
        label="Range"
        value={`${stats.min.toFixed(3)} – ${stats.max.toFixed(3)}`}
      />
      
      <StatItem
        label="Count"
        value={`${stats.count} runs`}
      />
      
      <div className={`cmp-stat cmp-stat-trend cmp-stat-trend--${stats.trendDirection}`}>
        <TrendIcon direction={stats.trendDirection} />
        <span className="cmp-stat-label">Trend</span>
        <span className="cmp-stat-value">{trendValue}</span>
      </div>
    </div>
  );
};

interface ModularityProgressProps {
  data: number[];
}

const ModularityProgress = ({ data }: ModularityProgressProps): React.ReactElement => {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data.map((modularity: number, index: number) => ({
      run: index + 1,
      modularity,
    }));
  }, [data]);

  const stats = useMemo(() => computeStats(data), [data]);

  if (!chartData.length) {
    return (
      <div className="cmp-empty">
        <Activity size={24} className="cmp-empty-icon" />
        <p className="cmp-empty-text">No modularity data</p>
        <p className="cmp-empty-hint">
          Run ensemble clustering to see modularity progression across runs.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="cmp-root"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="cmp-chart-wrapper">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e9ecf0"
              strokeWidth={1}
              vertical={false}
            />

            {stats && (
              <ReferenceArea
                y1={stats.min}
                y2={stats.max}
                fill="#4f6ef6"
                fillOpacity={0.04}
                stroke="none"
              />
            )}

            {stats && (
              <ReferenceLine
                y={stats.mean}
                stroke="#8b919d"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label={{
                  value: `μ ${stats.mean.toFixed(3)}`,
                  position: 'right',
                  fill: '#8b919d',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
            )}

            <XAxis
              dataKey="run"
              tick={{ fontSize: 11, fill: '#8b919d', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e9ecf0' }}
              tickMargin={8}
              label={{
                value: 'Run',
                position: 'bottom',
                offset: -2,
                fill: '#5f6672',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: '#8b919d', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(v: number) => v.toFixed(3)}
              width={55}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#4f6ef6',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            <Line
              type="monotone"
              dataKey="modularity"
              stroke="#4f6ef6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#ffffff',
                stroke: '#4f6ef6',
                strokeWidth: 2.5,
                strokeOpacity: 1,
              }}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <StatsRow stats={stats} />
    </motion.div>
  );
};

export default ModularityProgress;