import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  Layers,
  Gauge,
  Play,
  Loader2,
  ChevronDown,
  LucideIcon,
} from 'lucide-react';
import './ControlPanel.css';

const PARAM_CONFIG = [
  {
    key: 'resolution',
    label: 'Resolution',
    icon: Gauge,
    min: 0.5,
    max: 2.0,
    step: 0.1,
    formatValue: (v: number) => v.toFixed(1),
    description: 'Controls community granularity. Lower values yield fewer, larger communities.',
  },
  {
    key: 'ensembleRuns',
    label: 'Ensemble Runs',
    icon: Layers,
    min: 5,
    max: 30,
    step: 1,
    formatValue: (v: number) => v.toString(),
    description: 'Number of Leiden runs with varied resolutions. More runs improve stability.',
  },
  {
    key: 'consensusThreshold',
    label: 'Consensus Threshold',
    icon: SlidersHorizontal,
    min: 0.3,
    max: 0.8,
    step: 0.05,
    formatValue: (v: number) => v.toFixed(2),
    description: 'Minimum co-occurrence frequency to merge nodes. Higher values produce tighter communities.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const},
  },
};

const childVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: 0.08 * i, duration: 0.3 },
  }),
};

interface ParamConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  description: string;
}

interface ParamSliderProps {
  config: ParamConfig;
  value: number;
  onChange: (key: string, value: number) => void;
  disabled: boolean;
  index: number;
}

const ParamSlider = ({
  config,
  value,
  onChange,
  disabled,
  index,
}: ParamSliderProps) => {
  const Icon = config.icon;
  const percentage = ((value - config.min) / (config.max - config.min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseFloat(e.target.value);
      onChange(config.key, config.step >= 1 ? Math.round(raw) : raw);
    },
    [config.key, config.step, onChange]
  );

  return (
    <motion.div
      className="ccp-param"
      variants={childVariants}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <div className="ccp-param-header">
        <div className="ccp-param-label-group">
          <Icon size={15} className="ccp-param-icon" />
          <label className="ccp-param-label" htmlFor={`ccp-slider-${config.key}`}>
            {config.label}
          </label>
        </div>
        <span className="ccp-param-value">{config.formatValue(value)}</span>
      </div>

      <div className="ccp-slider-group">
        <input
          id={`ccp-slider-${config.key}`}
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={handleChange}
          className="ccp-slider"
          disabled={disabled}
          style={{ '--ccp-fill-percent': `${percentage}%` } as React.CSSProperties}
        />
        <div className="ccp-slider-range">
          <span className="ccp-slider-range-label">{config.min}</span>
          <span className="ccp-slider-range-label">{config.max}</span>
        </div>
      </div>

      <p className="ccp-param-desc">{config.description}</p>
    </motion.div>
  );
};

interface RunButtonProps {
  isRunning: boolean;
  progress: string;
  onClick: () => void;
}

const RunButton = ({ isRunning, progress, onClick }: RunButtonProps) => (
  <motion.button
    type="button"
    className={`ccp-run-btn ${isRunning ? 'ccp-run-btn--running' : ''}`}
    onClick={onClick}
    disabled={isRunning}
    whileHover={!isRunning ? { scale: 1.01 } : {}}
    whileTap={!isRunning ? { scale: 0.985 } : {}}
    transition={{ duration: 0.2 }}
  >
    <AnimatePresence mode="wait">
      {isRunning ? (
        <motion.span
          key="running"
          className="ccp-run-btn-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="ccp-run-btn-spinner"
          >
            <Loader2 size={17} />
          </motion.span>
          <span className="ccp-run-btn-label">
            Analyzing
            <AnimatePresence mode="wait">
              {progress && (
                <motion.span
                  key={progress}
                  className="ccp-run-btn-progress"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  &nbsp;&middot;&nbsp;{progress}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.span>
      ) : (
        <motion.span
          key="idle"
          className="ccp-run-btn-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Play size={16} className="ccp-run-btn-icon" />
          <span className="ccp-run-btn-label">Run Analysis</span>
        </motion.span>
      )}
    </AnimatePresence>
  </motion.button>
);

interface ControlPanelProps {
  params: any;
  onParamChange: (key: string, value: number) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
  progress: string;
}

const ControlPanel = ({ params, onParamChange, onRunAnalysis, isRunning, progress }: ControlPanelProps): React.ReactElement => {
  const handleParamChange = useCallback(
    (key: string, value: number) => {
      onParamChange(key, value);
    },
    [onParamChange]
  );

  return (
    <motion.div
      className="ccp-root"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="ccp-header">
        <div className="ccp-header-title-group">
          <SlidersHorizontal size={16} className="ccp-header-icon" />
          <h2 className="ccp-header-title">Parameters</h2>
        </div>
        <button
          type="button"
          className="ccp-header-action"
          disabled={isRunning}
          title="Advanced settings"
        >
          <span className="ccp-header-action-text">Advanced</span>
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="ccp-grid">
        {PARAM_CONFIG.map((config: ParamConfig, index: number) => (
          <ParamSlider
            key={config.key}
            config={config}
            value={params[config.key]}
            onChange={handleParamChange}
            disabled={isRunning}
            index={index}
          />
        ))}
      </div>

      <div className="ccp-action-area">
        <RunButton
          isRunning={isRunning}
          progress={progress}
          onClick={onRunAnalysis}
        />

        {isRunning && (
          <motion.p
            className="ccp-action-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Parameters are locked during analysis
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

export default ControlPanel;