import React from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
} from 'recharts';

interface Dataset {
  x: number;
  y: number;
}

interface ProfessionalChartProps {
  datasets: Record<string, Dataset[]>;
  height?: number;
  title?: string;
  syncId?: string;
}

const ProfessionalChart = ({ datasets, height = 300, title, syncId }: ProfessionalChartProps): React.ReactElement => {
  const transformData = (): any[] => {
    if (!datasets || Object.keys(datasets).length === 0) return [];

    const allXValues = new Set<number>();
    Object.entries(datasets).forEach(([_key, data]) => {
      if (data && Array.isArray(data)) {
        data.forEach((point: Dataset) => {
          if (point && typeof point.x === 'number' && !isNaN(point.x)) {
            allXValues.add(point.x);
          }
        });
      }
    });

    const sortedX = Array.from(allXValues).sort((a: number, b: number) => a - b);

    if (sortedX.length === 0) return [];

    return sortedX.map((x: number) => {
      const point: any = { 
        x: parseFloat((x || 0).toFixed(2)) 
      };
      
      Object.entries(datasets).forEach(([key, data]) => {
        if (data && Array.isArray(data)) {
          const match = data.find((d: Dataset) => d && Math.abs((d.x || 0) - x) < 0.01);
          if (match && typeof match.y === 'number' && !isNaN(match.y)) {
            point[key] = Math.abs(match.y);
          } else {
            point[key] = null;
          }
        }
      });

      return point;
    });
  };

  const chartData = transformData();

  if (chartData.length === 0) {
    return (
      <div style={{ position: 'relative' }}>
        {title && (
          <div style={{
            fontSize: '14px', fontWeight: 600, marginBottom: '20px', color: '#f0f6fc',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg, #4f6ef7, #20b2aa)', borderRadius: '2px' }} />
            {title}
          </div>
        )}
        <div style={{
          height: height, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0d1117', borderRadius: '8px', color: '#6e7681', fontSize: '13px',
        }}>
          No data available for chart
        </div>
      </div>
    );
  }

  const lineConfigs: any = {
    iterations: {
      name: 'Iterations',
      color: '#4f6ef7',
      gradientId: 'iterationsGradient',
      yAxisId: 'left',
    },
    memory: {
      name: 'Memory (KB)',
      color: '#20b2aa',
      gradientId: 'memoryGradient',
      yAxisId: 'right',
    },
    operations: {
      name: 'Operations',
      color: '#ec4899',
      gradientId: 'operationsGradient',
      yAxisId: 'left',
    },
    timestamps: {
      name: 'Time (ms)',
      color: '#f59e0b',
      gradientId: 'timestampsGradient',
      yAxisId: 'left',
    },
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(13, 17, 23, 0.97)',
          border: '1px solid rgba(79, 110, 247, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{
            fontSize: '11px', color: '#6e7681', marginBottom: '12px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            borderBottom: '1px solid rgba(48, 54, 61, 0.6)', paddingBottom: '8px',
          }}>
            Progress: {typeof label === 'number' ? label.toFixed(1) : label}%
          </div>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) return null;
            return (
              <div key={index} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '24px', marginBottom: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '3px',
                    background: entry.color, boxShadow: `0 0 8px ${entry.color}40`,
                  }} />
                  <span style={{ fontSize: '13px', color: '#b1bac4' }}>{entry.name}:</span>
                </div>
                <span style={{
                  fontSize: '14px', fontWeight: 700, color: entry.color,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const CustomDot = ({ cx, cy, payload, dataKey }: any) => {
    if (payload[dataKey] === null || payload[dataKey] === undefined) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={3} fill={lineConfigs[dataKey]?.color || '#fff'} stroke="#fff" strokeWidth={1}
          style={{ filter: `drop-shadow(0 0 4px ${lineConfigs[dataKey]?.color || '#fff'}60)` }} />
      </g>
    );
  };

  const CustomActiveDot = ({ cx, cy, payload, dataKey }: any) => {
    if (payload[dataKey] === null || payload[dataKey] === undefined) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="transparent" stroke={lineConfigs[dataKey]?.color || '#fff'} strokeWidth={2}
          style={{ filter: `drop-shadow(0 0 10px ${lineConfigs[dataKey]?.color || '#fff'}80)` }} />
        <circle cx={cx} cy={cy} r={3.5} fill={lineConfigs[dataKey]?.color || '#fff'} stroke="#fff" strokeWidth={2} />
      </g>
    );
  };

  const formatYAxis = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return Math.round(value).toString();
  };

  const hasMemoryAxis = Object.keys(datasets).some((key: string) => 
    lineConfigs[key]?.yAxisId === 'right' && datasets[key]?.length > 0
  );

  return (
    <div style={{ position: 'relative' }}>
      {title && (
        <div style={{
          fontSize: '14px', fontWeight: 600, marginBottom: '20px', color: '#f0f6fc',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg, #4f6ef7, #20b2aa)', borderRadius: '2px' }} />
          {title}
        </div>
      )}

      <div style={{ width: '100%' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            syncId={syncId}
            margin={{ top: 10, right: hasMemoryAxis ? 30 : 20, left: 10, bottom: 10 }}
          >
            <defs>
              {Object.entries(lineConfigs).map(([_key, config]: [string, any]) => (
                <linearGradient key={config.gradientId} id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={config.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(48, 54, 61, 0.4)" vertical={false} />

            <XAxis
              dataKey="x"
              stroke="#484f58"
              tick={{ fill: '#6e7681', fontSize: 11 }}
              tickLine={{ stroke: '#484f58' }}
              axisLine={{ stroke: '#30363d' }}
              label={{ value: 'Progress (%)', position: 'insideBottom', offset: -5, fill: '#6e7681', fontSize: 12 }}
              domain={['dataMin', 'dataMax']}
              type="number"
            />

            <YAxis
              yAxisId="left"
              stroke="#484f58"
              tick={{ fill: '#6e7681', fontSize: 11 }}
              tickLine={{ stroke: '#484f58' }}
              axisLine={{ stroke: '#30363d' }}
              tickFormatter={formatYAxis}
            />

            {hasMemoryAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#484f58"
                tick={{ fill: '#6e7681', fontSize: 11 }}
                tickLine={{ stroke: '#484f58' }}
                axisLine={{ stroke: '#30363d' }}
                tickFormatter={formatYAxis}
              />
            )}

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(79, 110, 247, 0.3)', strokeWidth: 1, strokeDasharray: '5 5' }}
            />

            <Legend
              wrapperStyle={{ paddingTop: '16px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: '#b1bac4', fontSize: '12px', fontWeight: 500 }}>{value}</span>
              )}
            />

            {Object.entries(datasets).map(([key, data]: [string, Dataset[]]) => {
              const config = lineConfigs[key];
              if (!config || !data || data.length === 0) return null;

              return (
                <React.Fragment key={key}>
                  <Area
                    yAxisId={config.yAxisId || 'left'}
                    type="monotone"
                    dataKey={key}
                    fill={`url(#${config.gradientId})`}
                    stroke="none"
                    connectNulls={true}
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                  
                  <Line
                    yAxisId={config.yAxisId || 'left'}
                    type="monotone"
                    dataKey={key}
                    name={config.name}
                    stroke={config.color}
                    strokeWidth={2.5}
                    dot={<CustomDot />}
                    activeDot={<CustomActiveDot />}
                    connectNulls={true}
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    style={{ filter: `drop-shadow(0 0 4px ${config.color}40)` }}
                  />
                </React.Fragment>
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProfessionalChart;