import React, { useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useNetwork } from './NetworkContext';
import './DistanceHistogram.css';

echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

const COLOR_PALETTE = {
  short: '#10b981',
  mediumShort: '#22d3ee',
  medium: '#8b5cf6',
  mediumLong: '#c084fc',
  long: '#f59e0b',
};

const CHART_DIMENSIONS = {
  height: 320,
  grid: {
    top: 60,
    right: 40,
    bottom: 55,
    left: 70,
    containLabel: true,
  },
};

const SMALL_WORLD_THRESHOLD = 6;

const NETWORK_TYPES = {
  SMALL_WORLD: 'small_world',
  LARGE_WORLD: 'large_world',
  DISCONNECTED: 'disconnected',
};

const getBarColor = (length: number, maxLength: number): string => {
  if (maxLength === 0) return COLOR_PALETTE.short;
  
  const ratio = length / maxLength;
  
  if (ratio < 0.2) return COLOR_PALETTE.short;
  if (ratio < 0.4) return COLOR_PALETTE.mediumShort;
  if (ratio < 0.6) return COLOR_PALETTE.medium;
  if (ratio < 0.8) return COLOR_PALETTE.mediumLong;
  return COLOR_PALETTE.long;
};

const formatCount = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const detectNetworkType = (diameter: number): string => {
  if (diameter === Infinity) return NETWORK_TYPES.DISCONNECTED;
  if (diameter <= SMALL_WORLD_THRESHOLD) return NETWORK_TYPES.SMALL_WORLD;
  return NETWORK_TYPES.LARGE_WORLD;
};

interface Stats {
  totalPairs: number;
  avgDistance: number;
  diameter: number;
  mostFrequentLength: number;
  mostFrequentCount: number;
  distinctLengths: number;
}

interface Insight {
  message: string;
  description: string;
  icon: string;
  type: string;
}

const generateInsight = (stats: Stats | null): Insight | null => {
  if (!stats) return null;

  const networkType = detectNetworkType(stats.diameter);
  
  const insights: any = {
    [NETWORK_TYPES.SMALL_WORLD]: {
      message: 'Small-world network detected',
      description: `Characteristic of efficient information flow with diameter ${stats.diameter}`,
      icon: '🌐',
      type: 'positive',
    },
    [NETWORK_TYPES.LARGE_WORLD]: {
      message: 'Large-world network detected',
      description: `Higher latency in information propagation, diameter: ${stats.diameter}`,
      icon: '🔭',
      type: 'neutral',
    },
    [NETWORK_TYPES.DISCONNECTED]: {
      message: 'Network may be disconnected',
      description: 'Consider checking for isolated components',
      icon: '⚠️',
      type: 'warning',
    },
  };

  return insights[networkType] || null;
};

interface HistogramItem {
  length: number;
  count: number;
}

const calculateStatistics = (histogram: HistogramItem[]): Stats | null => {
  if (!histogram?.length) return null;

  const totalPairs = histogram.reduce((sum: number, d: HistogramItem) => sum + d.count, 0);
  
  if (totalPairs === 0) return null;
  
  const weightedSum = histogram.reduce(
    (sum: number, d: HistogramItem) => sum + d.length * d.count, 
    0
  );
  
  const avgDistance = (weightedSum / totalPairs).toFixed(2);
  
  const validLengths = histogram
    .filter((d: HistogramItem) => d.count > 0)
    .map((d: HistogramItem) => d.length);
  
  const maxDistance = validLengths.length > 0 
    ? Math.max(...validLengths) 
    : 0;
  
  const mostFrequentData = histogram.reduce(
    (max: HistogramItem, d: HistogramItem) => d.count > max.count ? d : max, 
    histogram[0]
  );

  return {
    totalPairs,
    avgDistance: parseFloat(avgDistance),
    diameter: maxDistance,
    mostFrequentLength: mostFrequentData.length,
    mostFrequentCount: mostFrequentData.count,
    distinctLengths: validLengths.length,
  };
};

export default function DistanceHistogram(): React.ReactElement {
  const { distanceHistogram } = useNetwork() as any;
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const stats = useMemo(
    () => calculateStatistics(distanceHistogram), 
    [distanceHistogram]
  );

  const insight = useMemo(
    () => generateInsight(stats), 
    [stats]
  );

  const chartData = useMemo(() => {
    if (!distanceHistogram?.length || !stats) return null;

    return distanceHistogram.map((d: HistogramItem) => ({
      value: d.count,
      length: d.length,
      percentage: stats.totalPairs > 0 
        ? ((d.count / stats.totalPairs) * 100).toFixed(1)
        : '0.0',
      itemStyle: {
        color: getBarColor(d.length, stats.diameter),
        borderRadius: [7, 7, 0, 0],
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
      },
    }));
  }, [distanceHistogram, stats]);

  useEffect(() => {
    if (!chartRef.current || !chartData) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    chartInstanceRef.current = echarts.init(chartRef.current, null, {
      renderer: 'canvas',
      devicePixelRatio: window.devicePixelRatio || 1,
    });

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        chartInstanceRef.current?.resize();
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      chartInstanceRef.current?.dispose();
    };
  }, [chartData]);

  useEffect(() => {
    if (!chartInstanceRef.current || !chartData || !stats) return;

    const option = {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#94a3b8',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      },
      grid: CHART_DIMENSIONS.grid,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#22d3ee',
        borderWidth: 1.5,
        borderRadius: 12,
        padding: [12, 16],
        extraCssText: 'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); backdrop-filter: blur(12px);',
        textStyle: {
          color: '#e2e8f0',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
        },
        formatter: (params: any) => {
          if (!params?.length) return '';
          
          const { length, percentage } = params[0].data;
          const count = params[0].value;
          const color = getBarColor(length, stats.diameter);
          
          return `
            <div style="min-width: 200px;">
              <div style="display: flex; align-items: center; gap: 10px; 
                          margin-bottom: 10px; padding-bottom: 8px; 
                          border-bottom: 1.5px solid rgba(34, 211, 238, 0.2);">
                <span style="width: 10px; height: 10px; border-radius: 3px; 
                             background: ${color}; display: inline-block;"></span>
                <span style="font-size: 13px; font-weight: 700; color: #22d3ee;">
                  Distance ${length}
                </span>
              </div>
              <div style="display: grid; gap: 6px;">
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: #94a3b8;">Node Pairs</span>
                  <span style="font-weight: 600; color: #e2e8f0;">
                    ${formatCount(count)}
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: #94a3b8;">Percentage</span>
                  <span style="font-weight: 600; color: #e2e8f0;">
                    ${percentage}%
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: #94a3b8;">Visual</span>
                  <span style="font-weight: 600;">
                    <div style="width: 120px; height: 4px; background: rgba(51, 65, 85, 0.5); 
                                border-radius: 2px; overflow: hidden; margin-top: 4px;">
                      <div style="width: ${percentage}%; height: 100%; 
                                  background: ${color}; border-radius: 2px; 
                                  transition: width 0.3s ease;"></div>
                    </div>
                  </span>
                </div>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: chartData.map((d: any) => d.length),
        name: 'Path Length (hops)',
        nameLocation: 'center',
        nameGap: 38,
        nameTextStyle: {
          color: '#94a3b8',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 0.5,
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          margin: 12,
          formatter: (value: string) => {
            const num = parseInt(value);
            return num >= 1000 ? `${(num / 1000).toFixed(0)}k` : num;
          },
        },
        axisLine: {
          lineStyle: { color: '#334155', width: 1.5 },
        },
        axisTick: {
          show: false,
        },
        splitLine: { 
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Number of Node Pairs',
        nameLocation: 'center',
        nameGap: 55,
        nameTextStyle: {
          color: '#94a3b8',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 0.5,
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          formatter: (value: number) => formatCount(value),
        },
        axisLine: {
          lineStyle: { color: '#334155', width: 1.5 },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#334155',
            opacity: 0.25,
            type: 'dashed',
            width: 1,
          },
        },
        minInterval: 1,
      },
      series: [
        {
          type: 'bar',
          data: chartData,
          barWidth: '55%',
          barCategoryGap: '30%',
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 15,
              shadowOffsetY: 4,
              shadowColor: 'rgba(34, 211, 238, 0.5)',
              borderRadius: [8, 8, 0, 0],
            },
            label: {
              show: true,
              position: 'top',
              color: '#e2e8f0',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              formatter: (params: any) => formatCount(params.value),
            },
          },
          markLine: stats.diameter > 0 ? {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#f59e0b',
              type: 'dashed',
              width: 2,
              opacity: 0.6,
            },
            label: {
              color: '#f59e0b',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              formatter: `Diameter: ${stats.diameter}`,
              position: 'end',
            },
            data: [
              {
                xAxis: stats.diameter,
                name: 'Diameter',
              },
            ],
          } : undefined,
          animationDuration: 1000,
          animationEasing: 'cubicInOut',
          animationDelay: (idx: number) => idx * 30,
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          minValueSpan: 3,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 22,
          bottom: 8,
          borderColor: '#334155',
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          fillerColor: 'rgba(34, 211, 238, 0.15)',
          handleStyle: {
            color: '#22d3ee',
            borderColor: '#06b6d4',
            borderWidth: 1,
          },
          dataBackground: {
            lineStyle: {
              color: '#22d3ee',
              opacity: 0.3,
            },
            areaStyle: {
              color: '#22d3ee',
              opacity: 0.05,
            },
          },
          selectedDataBackground: {
            lineStyle: {
              color: '#22d3ee',
              opacity: 0.5,
            },
            areaStyle: {
              color: '#22d3ee',
              opacity: 0.1,
            },
          },
          textStyle: {
            color: '#94a3b8',
            fontSize: 10,
          },
          moveHandleSize: 0,
        },
      ],
    };

    chartInstanceRef.current.setOption(option, { notMerge: true });
  }, [chartData, stats]);

  if (!stats) {
    return (
      <div className="echarts-chart-card echarts-chart-card--empty">
        <header className="echarts-chart-card__header">
          <div className="echarts-chart-card__icon-wrapper">
            <span className="echarts-chart-card__icon" aria-hidden="true">
              📏
            </span>
          </div>
          <div className="echarts-chart-card__title-wrapper">
            <h3 className="echarts-chart-card__title">
              Distance Distribution
            </h3>
            <p className="echarts-chart-card__subtitle">
              Shortest path length analysis
            </p>
          </div>
        </header>
        
        <div className="echarts-chart-card__empty-state">
          <span 
            className="echarts-chart-card__empty-icon" 
            aria-hidden="true"
          >
            📐
          </span>
          <p className="echarts-chart-card__empty-text">
            No distance data available
          </p>
          <span className="echarts-chart-card__empty-hint">
            Load a connected graph to analyze path distances
          </span>
        </div>
      </div>
    );
  }

  const isSmallWorld = stats.diameter <= SMALL_WORLD_THRESHOLD;

  return (
    <div 
      className={`echarts-chart-card ${insight?.type === 'warning' ? 'echarts-chart-card--warning' : ''}`}
      role="region"
      aria-label="Distance distribution chart"
    >
      <header className="echarts-chart-card__header">
        <div className="echarts-chart-card__icon-wrapper">
          <span 
            className="echarts-chart-card__icon" 
            aria-hidden="true"
            role="img"
          >
            📏
          </span>
        </div>
        
        <div className="echarts-chart-card__title-wrapper">
          <h3 className="echarts-chart-card__title">
            Distance Distribution
          </h3>
          <p className="echarts-chart-card__subtitle">
            Shortest path length analysis between node pairs
          </p>
        </div>

        <div className="echarts-chart-card__stats" role="list">
          <div className="echarts-chart-card__stat" role="listitem">
            <span className="echarts-chart-card__stat-label">
              Avg. Distance
            </span>
            <span className="echarts-chart-card__stat-value">
              {stats.avgDistance.toFixed(2)}
            </span>
          </div>
          <div 
            className="echarts-chart-card__stat echarts-chart-card__stat--highlight"
            role="listitem"
          >
            <span className="echarts-chart-card__stat-label">
              Diameter
            </span>
            <span className="echarts-chart-card__stat-value">
              {stats.diameter}
            </span>
          </div>
          <div className="echarts-chart-card__stat" role="listitem">
            <span className="echarts-chart-card__stat-label">
              Node Pairs
            </span>
            <span className="echarts-chart-card__stat-value">
              {formatCount(stats.totalPairs)}
            </span>
          </div>
        </div>
      </header>

      <div className="echarts-chart-card__container">
        <div 
          ref={chartRef} 
          style={{ height: `${CHART_DIMENSIONS.height}px`, width: '100%' }}
          role="img"
          aria-label={
            `Distance distribution histogram showing ${stats.totalPairs} node pairs ` +
            `with average distance ${stats.avgDistance.toFixed(2)} hops ` +
            `and diameter ${stats.diameter}`
          }
        />
      </div>

      <footer className="echarts-chart-card__footer">
        <div className="echarts-chart-card__insight">
          <span 
            className={`echarts-chart-card__insight-icon ${
              insight ? `echarts-chart-card__insight-icon--${insight.type}` : ''
            }`}
            aria-hidden="true"
          >
            {insight?.icon || '💡'}
          </span>
          <div className="echarts-chart-card__insight-content">
            <span className="echarts-chart-card__insight-text">
              Most common distance:{' '}
              <strong>{stats.mostFrequentLength} hops</strong>
              {isSmallWorld && (
                <span className="echarts-chart-card__insight-badge">
                  · Small-world network
                </span>
              )}
            </span>
            {insight && (
              <span className={`echarts-chart-card__insight-description ${
                `echarts-chart-card__insight-description--${insight.type}`
              }`}>
                {insight.description}
              </span>
            )}
          </div>
        </div>
        
        <div className="echarts-chart-card__legend">
          <div className="echarts-chart-card__legend-item">
            <span 
              className="echarts-chart-card__legend-color echarts-chart-card__legend-color--short"
              aria-hidden="true" 
            />
            <span className="echarts-chart-card__legend-label">
              Short
            </span>
          </div>
          <div className="echarts-chart-card__legend-item">
            <span 
              className="echarts-chart-card__legend-color echarts-chart-card__legend-color--medium"
              aria-hidden="true"
            />
            <span className="echarts-chart-card__legend-label">
              Medium
            </span>
          </div>
          <div className="echarts-chart-card__legend-item">
            <span 
              className="echarts-chart-card__legend-color echarts-chart-card__legend-color--long"
              aria-hidden="true"
            />
            <span className="echarts-chart-card__legend-label">
              Long
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}