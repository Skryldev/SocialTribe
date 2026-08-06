import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Pin,
  PinOff,
  X,
  Zap,
  Target,
  Palette,
  ChevronDown,
  Brain,
  TrendingUp,
  Loader2,
  Plus,
  Minus,
  Activity,
  Cloud,
  Hash,
  MousePointer,
  BarChart3,
  Sliders,
} from 'lucide-react';

import { SIMULATION_MODELS } from './useRumorSimulation';
import { simulationApi } from './rumorSimulationApi';
import './RumorSimulationDrawer.css';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  CanvasRenderer,
]);

const SIR_COLORS = {
  susceptible: '#64748b',
  infected: '#ef4444',
  recovered: '#10b981',
  accent: '#f59e0b',
  surface: '#1e293b',
  bg: '#0f172a',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
};

const springBouncy = { type: 'spring' as const, stiffness: 500, damping: 20 };

const MOTION_VARIANTS = {
  drawer: {
    hidden: { x: '100%', opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 350, damping: 32, mass: 0.9 },
    },
    exit: {
      x: '100%',
      opacity: 0,
      transition: { duration: 0.25, ease: 'easeIn' as const},
    },
  },
  section: {
    hidden: { height: 0, opacity: 0 },
    visible: { height: 'auto', opacity: 1, transition: { duration: 0.3 } },
    exit: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  },
};

const SEED_METHODS = [
  { value: 'optimal', label: 'Optimal (Greedy)' },
  { value: 'degree', label: 'Degree Centrality' },
  { value: 'random', label: 'Random' },
];

const VIZ_MODES = [
  { value: 'status', label: 'Status Colors' },
  { value: 'temporal', label: 'Temporal Heatmap' },
  { value: 'critical', label: 'Critical Path' },
  { value: 'hotspot', label: 'Hotspot Mode' },
];

const SPEED_OPTIONS = [0.2, 0.5, 1, 2, 5];

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section = React.memo(({ title, icon, defaultOpen = true, children }: SectionProps) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="rs-section">
      <motion.button
        className="rs-section-header"
        onClick={() => setOpen((o: boolean) => !o)}
        whileHover={{ backgroundColor: 'rgba(245, 158, 11, 0.04)' }}
      >
        <span className="rs-section-header-left">
          <span className="rs-section-icon">{icon}</span>
          <span>{title}</span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="rs-section-arrow"
        >
          <ChevronDown size={12} />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            variants={MOTION_VARIANTS.section}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="rs-section-body"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

Section.displayName = 'Section';

interface SIRChartProps {
  dailyGrowth: any[];
}

const SIRChart = React.memo(({ dailyGrowth }: SIRChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  const option = useMemo(() => {
    if (!dailyGrowth?.length) return null;

    const days = dailyGrowth.map((d: any) => d.day);
    const total = dailyGrowth[0]?.total || 1;
    const informed = dailyGrowth.map((d: any) => d.count);
    const susceptible = dailyGrowth.map((d: any) => Math.max(0, total - d.count));
    const recovered = dailyGrowth.map((d: any) => Math.floor(d.count * 0.3));

    return {
      backgroundColor: 'transparent',
      grid: { top: 30, right: 20, bottom: 35, left: 45 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: SIR_COLORS.surface,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        textStyle: {
          color: SIR_COLORS.text,
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
        },
        formatter: (params: any) => {
          if (!params?.length) return '';
          let html = `<div style="font-weight:700;margin-bottom:4px;color:#f59e0b">Day ${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            html += `<div style="display:flex;justify-content:space-between;gap:12px">
              <span style="color:${p.color}">● ${p.seriesName}</span>
              <span style="font-weight:600">${p.value}</span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        data: ['Susceptible', 'Infected', 'Recovered'],
        bottom: 0,
        textStyle: { color: SIR_COLORS.textMuted, fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: { color: SIR_COLORS.textMuted, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: SIR_COLORS.textMuted, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed', opacity: 0.3 } },
      },
      series: [
        {
          name: 'Susceptible',
          type: 'line',
          data: susceptible,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: SIR_COLORS.susceptible, width: 2 },
          areaStyle: {
            color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(100, 116, 139, 0.15)' },
              { offset: 1, color: 'rgba(100, 116, 139, 0.02)' },
            ]),
          },
        },
        {
          name: 'Infected',
          type: 'line',
          data: informed,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: SIR_COLORS.infected, width: 2.5 },
          areaStyle: {
            color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.25)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.02)' },
            ]),
          },
          markLine: {
            silent: true,
            data: [{ type: 'max', name: 'Peak' }],
            lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 },
            label: { color: '#f59e0b', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', formatter: 'Peak: {c}' },
          },
        },
        {
          name: 'Recovered',
          type: 'line',
          data: recovered,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: SIR_COLORS.recovered, width: 2, type: 'dashed' },
          areaStyle: {
            color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.12)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
            ]),
          },
        },
      ],
      dataZoom: [
        { type: 'inside', start: 0, end: 100, minValueSpan: 5 },
        {
          type: 'slider', start: 0, end: 100, height: 16, bottom: 22,
          borderColor: '#334155', backgroundColor: '#1e293b',
          fillerColor: 'rgba(245, 158, 11, 0.15)',
          handleStyle: { color: '#f59e0b' },
          textStyle: { color: '#94a3b8', fontSize: 9 },
        },
      ],
    };
  }, [dailyGrowth]);

  useEffect(() => {
    if (!chartRef.current || !option) return;
    if (instanceRef.current) instanceRef.current.dispose();

    instanceRef.current = echarts.init(chartRef.current, null, {
      renderer: 'canvas',
      devicePixelRatio: window.devicePixelRatio || 1,
    });
    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      instanceRef.current?.dispose();
    };
  }, [option]);

  return (
    <div
      ref={chartRef}
      style={{ width: '100%', height: '200px' }}
      role="img"
      aria-label="SIR simulation chart"
    />
  );
});

SIRChart.displayName = 'SIRChart';

interface SeedChipsProps {
  seeds: string[];
  onRemove: (id: string) => void;
}

const SeedChips = React.memo(({ seeds, onRemove }: SeedChipsProps) => {
  if (!seeds?.length) {
    return (
      <div className="rs-seed-empty">
        <MousePointer size={12} />
        <span>No seeds selected</span>
      </div>
    );
  }

  return (
    <div className="rs-seed-container">
      <AnimatePresence>
        {seeds.map((id: string) => (
          <motion.span
            key={id}
            className="rs-seed-chip"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.03, borderColor: '#f59e0b' }}
            layout
          >
            <Hash size={9} />
            <span className="rs-seed-text">{id}</span>
            <motion.button
              className="rs-seed-remove"
              onClick={() => onRemove(id)}
              whileHover={{ color: '#ef4444' }}
              aria-label={`Remove seed ${id}`}
            >
              <X size={10} />
            </motion.button>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
});

SeedChips.displayName = 'SeedChips';

interface PillToggleProps {
  options: any[];
  value: any;
  onChange: (val: any) => void;
  format?: (val: any) => string;
}

const PillToggle = React.memo(({ options, value, onChange, format }: PillToggleProps) => (
  <div className="rs-pill-group">
    {options.map((opt: any) => {
      const val = typeof opt === 'object' ? opt.value : opt;
      const label = typeof opt === 'object' ? opt.label : format ? format(opt) : String(opt);
      return (
        <motion.button
          key={val}
          className={`rs-pill ${value === val ? 'rs-pill-active' : ''}`}
          onClick={() => onChange(val)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          {label}
        </motion.button>
      );
    })}
  </div>
));

PillToggle.displayName = 'PillToggle';

interface MetricRowProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ComponentType<any>;
}

const MetricRow = React.memo(({ label, value, color, icon: Icon }: MetricRowProps) => (
  <div className="rs-metric">
    <span className="rs-metric-label">
      {Icon && <Icon size={11} />}
      {label}
    </span>
    <motion.span
      className="rs-metric-value"
      style={{ color: color || SIR_COLORS.text }}
      key={value}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      transition={springBouncy}
    >
      {value}
    </motion.span>
  </div>
));

MetricRow.displayName = 'MetricRow';

interface NumberInputProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

const NumberInput = React.memo(({ value, min, max, onChange }: NumberInputProps) => (
  <div className="rs-number-row">
    <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
      <Minus size={10} />
    </button>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
      className="rs-number"
    />
    <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
      <Plus size={10} />
    </button>
  </div>
));

NumberInput.displayName = 'NumberInput';

interface RumorSimulationDrawerProps {
  isOpen: boolean;
  isPinned: boolean;
  onPin: () => void;
  onClose: () => void;
  nodes: any[];
  edges: any[];
  sim: any;
  vizMode: string;
  onVizModeChange: (mode: string) => void;
  showDayBadges: boolean;
  onToggleDayBadges: () => void;
  manualSeedMode: boolean;
  onToggleManualSeed: () => void;
}

export function RumorSimulationDrawer({
  isOpen,
  isPinned,
  onPin,
  onClose,
  edges,
  sim,
  vizMode,
  onVizModeChange,
}: RumorSimulationDrawerProps): React.ReactElement | null {
  const {
    params,
    updateParams,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    stepSimulation,
    isRunning,
    isComplete,
    currentDay,
    coverage,
    activeSpreaders,
    dailyGrowth,
    totalNodes,
    informedCount,
  } = sim;

  const [seedMethod, setSeedMethod] = useState<string>('optimal');
  const [kValue, setKValue] = useState<number>(3);
  const [isFindingSeeds, setIsFindingSeeds] = useState<boolean>(false);
  const [hasSelectedSeeds, setHasSelectedSeeds] = useState<boolean>(false);

  useEffect(() => {
    if (params.seedIds?.length > 0) setHasSelectedSeeds(true);
  }, [params.seedIds]);

  const handleFindSeeds = useCallback(async () => {
    setIsFindingSeeds(true);
    try {
      const response = await simulationApi.findOptimalSeeds({
        k: kValue,
        method: seedMethod,
      });
      if (response.success && response.data?.seeds) {
        updateParams({ seedIds: response.data.seeds.map(String) });
        setHasSelectedSeeds(true);
      }
    } catch (error) {
      console.error('Error finding seeds:', error);
    } finally {
      setIsFindingSeeds(false);
    }
  }, [seedMethod, kValue, updateParams]);

  const handleStart = useCallback(() => {
    if (!hasSelectedSeeds && !params.seedIds?.length) return;
    if (isComplete) return;
    startSimulation();
  }, [hasSelectedSeeds, params.seedIds, isComplete, startSimulation]);

  const handleReset = useCallback(() => {
    const seeds = params.seedIds;
    resetSimulation();
    updateParams({ seedIds: seeds });
  }, [resetSimulation, updateParams, params.seedIds]);

  const handleStep = useCallback(() => {
    if (!hasSelectedSeeds && !params.seedIds?.length) return;
    stepSimulation();
  }, [hasSelectedSeeds, params.seedIds, stepSimulation]);

  const handleRemoveSeed = useCallback(
    (id: string) => {
      const newSeeds = params.seedIds.filter((s: string) => s !== id);
      updateParams({ seedIds: newSeeds });
      if (!newSeeds.length) setHasSelectedSeeds(false);
    },
    [params.seedIds, updateParams]
  );

  const growthRate = dailyGrowth.length >= 2
    ? dailyGrowth[dailyGrowth.length - 1].count - dailyGrowth[dailyGrowth.length - 2].count
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          className="rs-drawer"
          variants={MOTION_VARIANTS.drawer}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="complementary"
          aria-label="Rumor Simulation Panel"
        >
          <div className="rs-header">
            <div className="rs-header-left">
              <div className="rs-header-icon">
                <Activity size={16} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="rs-header-title">Rumor Simulation</h2>
                <p className="rs-header-meta">
                  {totalNodes} nodes · {edges.length} edges
                </p>
              </div>
            </div>
            <div className="rs-header-actions">
              <motion.button
                className="rs-header-btn"
                onClick={onPin}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={isPinned ? 'Unpin drawer' : 'Pin drawer'}
              >
                {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
              </motion.button>
              <motion.button
                className="rs-header-btn rs-header-btn-close"
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Close drawer"
              >
                <X size={14} />
              </motion.button>
            </div>
          </div>

          <div className="rs-body">
            <Section title="Control Panel" icon={<Sliders size={13} />}>
              <div className="rs-controls">
                {!isRunning ? (
                  <>
                    <motion.button
                      className="rs-btn rs-btn-success"
                      onClick={handleStart}
                      disabled={isComplete}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Play size={12} /> Play
                    </motion.button>
                    <motion.button
                      className="rs-btn rs-btn-ghost"
                      onClick={handleStep}
                      disabled={isComplete}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <SkipForward size={12} /> Step
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    className="rs-btn rs-btn-danger"
                    onClick={pauseSimulation}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Pause size={12} /> Pause
                  </motion.button>
                )}
                <motion.button
                  className="rs-btn rs-btn-ghost"
                  onClick={handleReset}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <RotateCcw size={12} /> Reset
                </motion.button>
              </div>
              <div className="rs-label">Playback Speed</div>
              <PillToggle
                options={SPEED_OPTIONS}
                value={params.speedMultiplier}
                onChange={(v: any) => updateParams({ speedMultiplier: Number(v) })}
                format={(v: any) => `${v}x`}
              />
            </Section>

            <Section title="Model Settings" icon={<Brain size={13} />}>
              <div className="rs-label">Propagation Model</div>
              <select
                className="rs-select"
                value={params.model}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateParams({ model: e.target.value })}
              >
                {Object.entries(SIMULATION_MODELS).map(([val, label]: [string, any]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>

              {(params.model === 'random' || params.model === 'weighted') && (
                <div className="rs-slider">
                  <div className="rs-slider-header">
                    <span className="rs-label">Infection Probability</span>
                    <span className="rs-slider-val">{(params.probability * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={params.probability}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateParams({ probability: Number(e.target.value) })}
                    className="rs-range"
                  />
                </div>
              )}

              {params.model === 'threshold' && (
                <div className="rs-threshold">
                  <div className="rs-label">Threshold (min informed neighbours)</div>
                  <NumberInput value={params.threshold} min={1} max={20} onChange={(v: number) => updateParams({ threshold: v })} />
                  <span className="rs-number-hint">neighbours required</span>
                </div>
              )}

              {params.model === 'wave' && (
                <div className="rs-wave-note">
                  <Zap size={12} />
                  <span>Wave / BFS — all neighbours informed in one wave per day</span>
                </div>
              )}
            </Section>

            <Section title="Seed Selection" icon={<Target size={13} />}>
              <div className="rs-seed-row">
                <div>
                  <div className="rs-label">Seed Count (K)</div>
                  <NumberInput value={kValue} min={1} max={20} onChange={setKValue} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="rs-label">Selection Method</div>
                  <select className="rs-select" value={seedMethod} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeedMethod(e.target.value)}>
                    {SEED_METHODS.map((m: any) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <motion.button
                className="rs-btn rs-btn-primary rs-btn-full"
                onClick={handleFindSeeds}
                disabled={isFindingSeeds || isRunning}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {isFindingSeeds ? <Loader2 size={14} className="spin" /> : <Cloud size={14} />}
                {isFindingSeeds ? 'Computing...' : 'Find Seeds via API'}
              </motion.button>

              <div className="rs-seed-header">
                <span className="rs-label">Selected Seeds</span>
                <span className="rs-seed-count">{params.seedIds?.length || 0} selected</span>
              </div>
              <SeedChips seeds={params.seedIds || []} onRemove={handleRemoveSeed} />
            </Section>

            <Section title="Live Metrics" icon={<BarChart3 size={13} />}>
              <MetricRow label="Coverage" value={`${informedCount} / ${totalNodes}`} color={SIR_COLORS.recovered} />
              <div className="rs-progress">
                <motion.div className="rs-progress-fill" animate={{ width: `${Math.min(100, coverage * 100)}%` }} transition={{ duration: 0.4 }} />
              </div>
              <MetricRow label="Current Day" value={currentDay} />
              <MetricRow label="Active Spreaders" value={activeSpreaders} color={SIR_COLORS.infected} />
              <MetricRow
                label="Growth Rate"
                value={growthRate >= 0 ? `+${growthRate}/day` : `${growthRate}/day`}
                color={growthRate > 0 ? SIR_COLORS.recovered : SIR_COLORS.textMuted}
              />

              {dailyGrowth.length > 1 && (
                <div className="rs-chart-wrap">
                  <div className="rs-label" style={{ marginBottom: 8 }}>
                    <TrendingUp size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Spread Over Time
                  </div>
                  <SIRChart dailyGrowth={dailyGrowth} />
                </div>
              )}
            </Section>

            <Section title="Display Settings" icon={<Palette size={13} />} defaultOpen={false}>
              <div className="rs-label">Visualization Mode</div>
              <PillToggle options={VIZ_MODES} value={vizMode} onChange={onVizModeChange} />
            </Section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export default RumorSimulationDrawer;