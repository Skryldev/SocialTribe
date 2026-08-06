import React, { useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useNetwork } from './NetworkContext';
import './DegreeDistributionChart.css';

echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const COLOR_PALETTE = {
  low: '#10b981',
  mediumLow: '#22d3ee',
  medium: '#8b5cf6',
  mediumHigh: '#c084fc',
  high: '#f59e0b',
};

const CHART_THEME = {
  backgroundColor: 'transparent',
  textStyle: { color: '#94a3b8' },
  grid: {
    top: 60,
    right: 30,
    bottom: 50,
    left: 60,
    containLabel: true,
  },
};

const getBarColor = (degree: number, maxDegree: number): string => {
  const ratio = maxDegree > 0 ? degree / maxDegree : 0;
  
  if (ratio < 0.2) return COLOR_PALETTE.low;
  if (ratio < 0.4) return COLOR_PALETTE.mediumLow;
  if (ratio < 0.6) return COLOR_PALETTE.medium;
  if (ratio < 0.8) return COLOR_PALETTE.mediumHigh;
  return COLOR_PALETTE.high;
};

const formatCount = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

interface DistributionItem {
  degree: number;
  count: number;
}

interface Stats {
  totalNodes: number;
  avgDegree: string;
  maxDegree: number;
  minDegree: number;
  mostCommonDegree: DistributionItem;
}

const calculateStatistics = (distribution: DistributionItem[]): Stats | null => {
  if (!distribution?.length) return null;

  const totalNodes = distribution.reduce((sum: number, d: DistributionItem) => sum + d.count, 0);
  const weightedSum = distribution.reduce((sum: number, d: DistributionItem) => sum + d.degree * d.count, 0);
  
  const nonZeroDegrees = distribution.filter((d: DistributionItem) => d.count > 0).map((d: DistributionItem) => d.degree);
  
  return {
    totalNodes,
    avgDegree: totalNodes > 0 ? (weightedSum / totalNodes).toFixed(2) : '0.00',
    maxDegree: Math.max(...distribution.map((d: DistributionItem) => d.degree)),
    minDegree: nonZeroDegrees.length > 0 ? Math.min(...nonZeroDegrees) : 0,
    mostCommonDegree: distribution.reduce(
      (max: DistributionItem, d: DistributionItem) => (d.count > max.count ? d : max), 
      distribution[0]
    ),
  };
};

export default function DegreeDistributionChart(): React.ReactElement {
  const { degreeDistribution } = useNetwork() as any;
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const stats = useMemo(() => 
    calculateStatistics(degreeDistribution), 
    [degreeDistribution]
  );

  const chartData = useMemo(() => {
    if (!degreeDistribution?.length || !stats) return null;

    return degreeDistribution.map((d: DistributionItem) => ({
      value: d.count,
      degree: d.degree,
      percentage: ((d.count / stats.totalNodes) * 100).toFixed(1),
      itemStyle: {
        color: getBarColor(d.degree, stats.maxDegree),
        borderRadius: [6, 6, 0, 0],
      },
    }));
  }, [degreeDistribution, stats]);

  useEffect(() => {
    if (!chartRef.current || !chartData) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    chartInstanceRef.current = echarts.init(chartRef.current, null, {
      renderer: 'canvas',
    });

    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstanceRef.current?.dispose();
    };
  }, [chartData]);

  useEffect(() => {
    if (!chartInstanceRef.current || !chartData || !stats) return;

    const option = {
      ...CHART_THEME,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#22d3ee',
        borderWidth: 1,
        textStyle: {
          color: '#e2e8f0',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
        },
        formatter: (params: any) => {
          if (!params?.length) return '';
          const { degree, percentage } = params[0].data;
          
          return `
            <div style="padding: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; 
                          margin-bottom: 8px; padding-bottom: 6px; 
                          border-bottom: 1px solid rgba(34, 211, 238, 0.2);">
                <span>📊</span>
                <span style="font-weight: 700; color: #22d3ee;">Degree ${degree}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #94a3b8;">Nodes</span>
                  <span style="font-weight: 600;">${formatCount(params[0].value)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #94a3b8;">Percentage</span>
                  <span style="font-weight: 600;">${percentage}%</span>
                </div>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: chartData.map((d: any) => d.degree),
        name: 'Degree (k)',
        nameLocation: 'center',
        nameGap: 35,
        nameTextStyle: {
          color: '#94a3b8',
          fontSize: 11,
          fontWeight: 500,
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          formatter: (value: string) => {
            const num = parseInt(value);
            return num >= 1000 ? `${(num / 1000).toFixed(0)}k` : num;
          },
        },
        axisLine: {
          lineStyle: { color: '#334155' },
        },
        axisTick: {
          lineStyle: { color: '#334155' },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'Number of Nodes',
        nameLocation: 'center',
        nameGap: 45,
        nameTextStyle: {
          color: '#94a3b8',
          fontSize: 11,
          fontWeight: 500,
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          formatter: (value: number) => formatCount(value),
        },
        axisLine: {
          lineStyle: { color: '#334155' },
        },
        axisTick: {
          lineStyle: { color: '#334155' },
        },
        splitLine: {
          lineStyle: {
            color: '#334155',
            opacity: 0.3,
            type: 'dashed',
          },
        },
        minInterval: 1,
      },
      series: [
        {
          type: 'bar',
          data: chartData,
          barWidth: '60%',
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(34, 211, 238, 0.5)',
            },
          },
          animationDuration: 800,
          animationEasing: 'cubicInOut',
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          minValueSpan: 5,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
          bottom: 10,
          borderColor: '#334155',
          backgroundColor: '#1e293b',
          fillerColor: 'rgba(34, 211, 238, 0.2)',
          handleStyle: {
            color: '#22d3ee',
          },
          textStyle: {
            color: '#94a3b8',
          },
        },
      ],
    };

    chartInstanceRef.current.setOption(option, true);
  }, [chartData, stats]);

  if (!stats) {
    return (
      <div className="echarts-chart-card echarts-chart-card--empty">
        <div className="echarts-chart-card__header">
          <div className="echarts-chart-card__icon-wrapper">
            <span className="echarts-chart-card__icon" aria-hidden="true">
              📊
            </span>
          </div>
          <div className="echarts-chart-card__title-wrapper">
            <h3 className="echarts-chart-card__title">Degree Distribution</h3>
            <p className="echarts-chart-card__subtitle">
              Network connectivity analysis
            </p>
          </div>
        </div>
        
        <div className="echarts-chart-card__empty-state">
          <span className="echarts-chart-card__empty-icon" aria-hidden="true">
            📈
          </span>
          <p className="echarts-chart-card__empty-text">
            No data loaded yet.
          </p>
          <span className="echarts-chart-card__empty-hint">
            Import a graph to see distribution
          </span>
        </div>
      </div>
    );
  }

  const { mostCommonDegree } = stats;
  const isLowDegreeNetwork = stats.maxDegree <= 10;

  return (
    <div className="echarts-chart-card">
      <div className="echarts-chart-card__header">
        <div className="echarts-chart-card__icon-wrapper">
          <span className="echarts-chart-card__icon" aria-hidden="true">
            📊
          </span>
        </div>
        
        <div className="echarts-chart-card__title-wrapper">
          <h3 className="echarts-chart-card__title">
            Degree Distribution
          </h3>
          <p className="echarts-chart-card__subtitle">
            Network connectivity analysis
          </p>
        </div>

        <div className="echarts-chart-card__stats" role="list">
          <div className="echarts-chart-card__stat" role="listitem">
            <span className="echarts-chart-card__stat-label">
              Avg. Degree
            </span>
            <span className="echarts-chart-card__stat-value">
              {stats.avgDegree}
            </span>
          </div>
          <div className="echarts-chart-card__stat" role="listitem">
            <span className="echarts-chart-card__stat-label">
              Max Degree
            </span>
            <span className="echarts-chart-card__stat-value">
              {stats.maxDegree}
            </span>
          </div>
          <div className="echarts-chart-card__stat" role="listitem">
            <span className="echarts-chart-card__stat-label">
              Min Degree
            </span>
            <span className="echarts-chart-card__stat-value">
              {stats.minDegree}
            </span>
          </div>
        </div>
      </div>

      <div 
        className="echarts-chart-card__container"
        style={{ height: '320px', width: '100%' }}
      >
        <div 
          ref={chartRef} 
          style={{ height: '100%', width: '100%' }}
          role="img"
          aria-label={`Degree distribution chart showing ${stats.totalNodes} nodes with average degree ${stats.avgDegree}`}
        />
      </div>

      <div className="echarts-chart-card__footer">
        <div className="echarts-chart-card__insight">
          <span className="echarts-chart-card__insight-icon" aria-hidden="true">
            💡
          </span>
          <span className="echarts-chart-card__insight-text">
            Most common degree:{' '}
            <strong>{mostCommonDegree?.degree || 0} hops</strong>
            {isLowDegreeNetwork && (
              <span className="echarts-chart-card__insight-badge">
                · Low-degree network detected
              </span>
            )}
          </span>
        </div>
        
        <div className="echarts-chart-card__legend">
          <div className="echarts-chart-card__legend-item">
            <span 
              className="echarts-chart-card__legend-color echarts-chart-card__legend-color--low"
              aria-hidden="true" 
            />
            <span className="echarts-chart-card__legend-label">Low</span>
          </div>
          <div className="echarts-chart-card__legend-item">
            <span 
              className="echarts-chart-card__legend-color echarts-chart-card__legend-color--medium"
              aria-hidden="true"
            />
            <span className="echarts-chart-card__legend-label">Medium</span>
          </div>
          <div className="echarts-chart-card__legend-item">
            <span 
              className="echarts-chart-card__legend-color echarts-chart-card__legend-color--high"
              aria-hidden="true"
            />
            <span className="echarts-chart-card__legend-label">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}