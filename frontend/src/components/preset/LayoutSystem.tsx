  import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import {
    LayoutGrid, Undo2, Redo2, Loader2, X, Zap, SlidersHorizontal,
    Network, CheckCircle2, ChevronDown, Settings2,
    BoxSelect, Dot, Eye, EyeOff, ChevronUp,
    RefreshCw, AlertCircle, WifiOff,
  } from 'lucide-react';
  import { syncCurrentLayout } from './LayoutApi';
  import { useKeyboardShortcut, useHideOnIdle, useLayoutSync } from './layoutHooks';
  import {
    ALGORITHM_ICONS, ALGORITHM_COLORS, ALGORITHM_OPTIONS,
    DEFAULT_ALGORITHM_ICON, DEFAULT_ALGORITHM_COLOR,
    ANIMATION_VARIANTS,
  } from './layoutConstants';
  import './LayoutSystem.css';

  interface ProgressIndicatorProps {
    progress: number;
    onCancel: () => void;
  }

  const ProgressIndicator = memo(({ progress, onCancel }: ProgressIndicatorProps) => (
    <motion.div
      className="ls-progress"
      initial={{ opacity: 0, scaleX: 0.8 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0.8 }}
      transition={{ duration: 0.15 }}
    >
      <Loader2 size={13} className="ls-spinner" />
      <div className="ls-progress-track">
        <motion.div
          className="ls-progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <button onClick={onCancel} className="ls-btn-icon ls-btn-cancel" title="Cancel">
        <X size={11} />
      </button>
    </motion.div>
  ));

  ProgressIndicator.displayName = 'ProgressIndicator';

  interface StatsBadgeProps {
    nodeCount: number;
    edgeCount: number;
  }

  const StatsBadge = memo(({ nodeCount, edgeCount }: StatsBadgeProps) => (
    <div className="ls-stats">
      <span className="ls-stat">
        <BoxSelect size={11} />
        <strong>{nodeCount}</strong>
        <span className="ls-stat-label">nodes</span>
      </span>
      <span className="ls-stat-divider">·</span>
      <span className="ls-stat">
        <Network size={11} />
        <strong>{edgeCount}</strong>
        <span className="ls-stat-label">edges</span>
      </span>
    </div>
  ));

  StatsBadge.displayName = 'StatsBadge';

  interface PresetCardProps {
    preset: any;
    icon: React.ComponentType<any>;
    isActive: boolean;
    onClick: () => void;
    disabled: boolean;
    color: string;
  }

  const PresetCard = memo(({ preset, icon: Icon, isActive, onClick, disabled, color }: PresetCardProps) => (
    <motion.button
      className={`ls-preset-card ${isActive ? 'ls-preset-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{ '--accent-color': color } as React.CSSProperties}
      {...ANIMATION_VARIANTS.cardHover}
      title={preset.description}
    >
      <div className="ls-preset-icon-wrap">
        <Icon size={20} />
        {isActive && (
          <motion.div
            className="ls-check-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
          >
            <CheckCircle2 size={12} />
          </motion.div>
        )}
      </div>
      <span className="ls-preset-name">{preset.name}</span>
    </motion.button>
  ));

  PresetCard.displayName = 'PresetCard';

  interface AlgorithmCardProps {
    algo: any;
    icon: React.ComponentType<any>;
    isSelected: boolean;
    isCurrent: boolean;
    onClick: () => void;
    disabled: boolean;
    color: string;
  }

  const AlgorithmCard = memo(({ algo, icon: Icon, isSelected, isCurrent, onClick, disabled, color }: AlgorithmCardProps) => (
    <motion.button
      className={`ls-algo-card ${isSelected ? 'ls-algo-selected' : ''} ${isCurrent ? 'ls-algo-current' : ''} ${disabled ? 'ls-algo-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{ '--accent-color': color } as React.CSSProperties}
      {...ANIMATION_VARIANTS.cardHover}
      title={algo.description}
    >
      <Icon size={18} />
      <span className="ls-algo-name">{algo.name}</span>
      {isCurrent && <span className="ls-algo-badge" style={{ background: color }}>active</span>}
    </motion.button>
  ));

  AlgorithmCard.displayName = 'AlgorithmCard';

  interface FloatingShowButtonProps {
    onClick: () => void;
    isVisible: boolean;
  }

  const FloatingShowButton = memo(({ onClick, isVisible }: FloatingShowButtonProps) => {
    if (isVisible) return null;

    return (
      <motion.button
        className="ls-floating-show-btn"
        onClick={onClick}
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{
          opacity: 1, scale: 1, y: 0,
          transition: { delay: 0.3, type: 'spring', stiffness: 400, damping: 25 },
        }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        whileHover={{ scale: 1.1, boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)' }}
        whileTap={{ scale: 0.95 }}
        title="Show layout controls (Ctrl+Shift+H)"
        style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 1098,
          width: '36px', height: '36px', borderRadius: '10px',
          border: '1px solid rgba(180, 140, 100, 0.2)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(254,252,250,0.93))',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 8px rgba(139, 92, 20, 0.08)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#d97706',
        }}
      >
        <Eye size={16} />
        <motion.div
          style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '8px', fontWeight: 'bold', color: 'white',
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronUp size={8} />
        </motion.div>
      </motion.button>
    );
  });

  FloatingShowButton.displayName = 'FloatingShowButton';

  interface TriggerZoneProps {
    isVisible: boolean;
    manuallyHidden: boolean;
    onMouseEnter: () => void;
  }

  const TriggerZone = memo(({ isVisible, manuallyHidden, onMouseEnter }: TriggerZoneProps) => {
    if (manuallyHidden) return null;

    return (
      <motion.div
        className="ls-trigger-zone"
        onMouseEnter={onMouseEnter}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 0 : 1, transition: { duration: 0.3 } }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '48px', zIndex: 1098,
          cursor: 'pointer', pointerEvents: 'all',
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.04) 0%, transparent 100%)',
        }}
        title="Hover to show layout controls"
      >
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '10px', color: '#d97706', opacity: 0.6,
            display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'none',
          }}
        >
          <LayoutGrid size={10} />
          Layout Controls
        </motion.div>
      </motion.div>
    );
  });

  TriggerZone.displayName = 'TriggerZone';

  interface ErrorBannerProps {
    message: string;
    onRetry?: () => void;
  }

  const ErrorBanner = memo(({ message, onRetry }: ErrorBannerProps) => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '8px 12px', borderRadius: '8px', marginBottom: '8px',
        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
        color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)',
        background: 'rgba(239, 68, 68, 0.08)',
      }}
    >
      <WifiOff size={14} />
      <span>{message || 'Could not load layout from server. Using local state.'}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginLeft: 'auto', cursor: 'pointer', fontSize: '11px', color: '#ef4444',
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(239, 68, 68, 0.1)', border: 'none',
            borderRadius: '4px', padding: '2px 8px',
          }}
        >
          <RefreshCw size={10} /> Retry
        </button>
      )}
    </motion.div>
  ));

  ErrorBanner.displayName = 'ErrorBanner';

  interface CustomOptionsPanelProps {
    algorithmKey: string;
    algorithms: any[];
    customOptions: any;
    isCalculating: boolean;
    onOptionChange: (key: string, value: number) => void;
    onApply: () => void;
  }

  const CustomOptionsPanel = memo(({
    algorithmKey, algorithms, customOptions, isCalculating, onOptionChange, onApply,
  }: CustomOptionsPanelProps) => {
    const algoConfig = ALGORITHM_OPTIONS[algorithmKey];
    if (!algoConfig) return null;

    const algoName = algorithms.find((a: any) => a.key === algorithmKey)?.name || algorithmKey;
    const Icon = ALGORITHM_ICONS[algorithmKey] || Settings2;
    const color = ALGORITHM_COLORS[algorithmKey] || DEFAULT_ALGORITHM_COLOR;

    return (
      <motion.div
        className="ls-options-panel"
        initial={{ height: 0, opacity: 0, marginTop: 0 }}
        animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
        exit={{ height: 0, opacity: 0, marginTop: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="ls-options-header">
          <Icon size={15} />
          <span>{algoName}</span>
          <span className="ls-options-tag">Custom</span>
        </div>

        <div className="ls-options-list">
          {algoConfig.map((opt: any) => (
            <div key={opt.key} className="ls-option">
              <div className="ls-option-header">
                <span className="ls-option-label">{opt.label}</span>
                <span className="ls-option-value">
                  {customOptions[opt.key] ?? opt.default}
                </span>
              </div>
              <input
                type="range"
                min={opt.min}
                max={opt.max}
                step={opt.step}
                value={customOptions[opt.key] ?? opt.default}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onOptionChange(opt.key, Number(e.target.value))}
                className="ls-option-slider"
                style={{ '--slider-color': color } as React.CSSProperties}
              />
            </div>
          ))}
        </div>

        <motion.button
          className="ls-apply-btn"
          onClick={onApply}
          disabled={isCalculating}
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          }}
          whileHover={{
            scale: 1.01, y: -1,
            boxShadow: `0 6px 20px ${color}40`,
          }}
          whileTap={{ scale: 0.98 }}
        >
          {isCalculating ? (
            <><Loader2 size={14} className="ls-spinner" /> Processing...</>
          ) : (
            <><CheckCircle2 size={14} /> Apply Layout</>
          )}
        </motion.button>
      </motion.div>
    );
  });

  CustomOptionsPanel.displayName = 'CustomOptionsPanel';

  interface PresetsTabProps {
    presets: any;
    activePresetKey: string | null;
    isCalculating: boolean;
    onPresetClick: (key: string) => void;
  }

  const PresetsTab = memo(({ presets, activePresetKey, isCalculating, onPresetClick }: PresetsTabProps) => (
    <motion.div key="presets" className="ls-tab-content" {...ANIMATION_VARIANTS.fadeSlideIn}>
      <div className="ls-presets-grid">
        {Object.entries(presets).map(([key, preset]: [string, any]) => {
          const Icon = ALGORITHM_ICONS[preset.algorithm] || DEFAULT_ALGORITHM_ICON;
          const color = ALGORITHM_COLORS[preset.algorithm] || DEFAULT_ALGORITHM_COLOR;

          return (
            <PresetCard
              key={key}
              preset={preset}
              icon={Icon}
              isActive={activePresetKey === key}
              onClick={() => onPresetClick(key)}
              disabled={isCalculating}
              color={color}
            />
          );
        })}
      </div>
    </motion.div>
  ));

  PresetsTab.displayName = 'PresetsTab';

  interface CustomTabProps {
    algorithms: any[];
    currentLayout: string | null;
    activePresetKey: string | null;
    selectedAlgo: string | null;
    isCalculating: boolean;
    customOptions: any;
    onAlgoSelect: (key: string) => void;
    onOptionChange: (key: string, value: number) => void;
    onApplyCustom: () => void;
  }

  const CustomTab = memo(({
    algorithms, currentLayout, activePresetKey, selectedAlgo,
    isCalculating, customOptions, onAlgoSelect, onOptionChange, onApplyCustom,
  }: CustomTabProps) => (
    <motion.div key="custom" className="ls-tab-content" {...ANIMATION_VARIANTS.fadeSlideIn}>
      <div className="ls-algo-grid">
        {algorithms.map((algo: any) => {
          const Icon = ALGORITHM_ICONS[algo.key] || Network;
          const color = ALGORITHM_COLORS[algo.key] || DEFAULT_ALGORITHM_COLOR;
          const isAvailable = algo.isAvailable !== false;

          return (
            <AlgorithmCard
              key={algo.key}
              algo={algo}
              icon={Icon}
              isSelected={selectedAlgo === algo.key}
              isCurrent={currentLayout === algo.key && !activePresetKey}
              onClick={() => isAvailable && !isCalculating && onAlgoSelect(algo.key)}
              disabled={!isAvailable || isCalculating}
              color={color}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {selectedAlgo && (
          <CustomOptionsPanel
            algorithmKey={selectedAlgo}
            algorithms={algorithms}
            customOptions={customOptions}
            isCalculating={isCalculating}
            onOptionChange={onOptionChange}
            onApply={onApplyCustom}
          />
        )}
      </AnimatePresence>
    </motion.div>
  ));

  CustomTab.displayName = 'CustomTab';

  interface LayoutPanelProps {
    isOpen: boolean;
    activeTab: string;
    onTabChange: (tab: string) => void;
    currentLayoutError: string | null;
    onRetry: () => void;
    presets: any;
    activePresetKey: string | null;
    isCalculating: boolean;
    onPresetClick: (key: string) => void;
    algorithms: any[];
    currentLayout: string | null;
    selectedAlgo: string | null;
    customOptions: any;
    onAlgoSelect: (key: string) => void;
    onOptionChange: (key: string, value: number) => void;
    onApplyCustom: () => void;
    onBackdropClick: (e: React.MouseEvent) => void;
  }

  const LayoutPanel = memo(({
    isOpen, activeTab, onTabChange, currentLayoutError, onRetry,
    presets, activePresetKey, isCalculating, onPresetClick,
    algorithms, currentLayout, selectedAlgo, customOptions,
    onAlgoSelect, onOptionChange, onApplyCustom, onBackdropClick,
  }: LayoutPanelProps) => (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="ls-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onBackdropClick}
          />

          <motion.div className="ls-panel" {...ANIMATION_VARIANTS.panel}>
            {currentLayoutError && (
              <ErrorBanner message={currentLayoutError} onRetry={onRetry} />
            )}

            <div className="ls-tabs">
              <button
                className={`ls-tab ${activeTab === 'presets' ? 'ls-tab-active' : ''}`}
                onClick={() => onTabChange('presets')}
              >
                <Zap size={14} /> <span>Presets</span>
              </button>
              <button
                className={`ls-tab ${activeTab === 'custom' ? 'ls-tab-active' : ''}`}
                onClick={() => onTabChange('custom')}
              >
                <SlidersHorizontal size={14} /> <span>Custom</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'presets' && (
                <PresetsTab
                  presets={presets}
                  activePresetKey={activePresetKey}
                  isCalculating={isCalculating}
                  onPresetClick={onPresetClick}
                />
              )}
              {activeTab === 'custom' && (
                <CustomTab
                  algorithms={algorithms}
                  currentLayout={currentLayout}
                  activePresetKey={activePresetKey}
                  selectedAlgo={selectedAlgo}
                  isCalculating={isCalculating}
                  customOptions={customOptions}
                  onAlgoSelect={onAlgoSelect}
                  onOptionChange={onOptionChange}
                  onApplyCustom={onApplyCustom}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  ));

  LayoutPanel.displayName = 'LayoutPanel';

  interface LayoutTopbarProps {
    containerRef: React.RefObject<any>;
    isVisible: boolean;
    isOpen: boolean;
    isCalculating: boolean;
    isLoadingCurrent: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    currentLabel: string;
    currentColor: string;
    modeLabel: string | null;
    layoutMode: string | null;
    currentLayoutError: string | null;
    onTogglePanel: () => void;
    onToggleVisibility: () => void;
    onRetry: () => void;
    onCancel: () => void;
    progress: number;
    manuallyHidden: boolean;
    nodeCount: number;
    edgeCount: number;
  }

  const LayoutTopbar = memo(({
    containerRef, isVisible, isOpen, isCalculating, isLoadingCurrent,
    onMouseEnter, onMouseLeave,
    canUndo, canRedo, onUndo, onRedo,
    currentLabel, currentColor, modeLabel, layoutMode,
    currentLayoutError, onTogglePanel, onToggleVisibility,
    onRetry, onCancel, progress,
    manuallyHidden, nodeCount, edgeCount,
  }: LayoutTopbarProps) => (
    <motion.div
      ref={containerRef}
      className="ls-topbar"
      variants={ANIMATION_VARIANTS.topbar}
      initial="visible"
      animate={isVisible || isOpen || isCalculating ? 'visible' : 'hidden'}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ pointerEvents: isVisible || isOpen ? 'all' : 'none' }}
    >
      <div className="ls-topbar-inner">
        <div className="ls-topbar-group">
          <motion.button className="ls-btn-icon" onClick={onUndo} disabled={!canUndo || isCalculating}
            title="Undo Layout (Ctrl+Z)"
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(99, 102, 241, 0.08)' }}
            whileTap={{ scale: 0.9 }}>
            <Undo2 size={15} />
          </motion.button>
          <motion.button className="ls-btn-icon" onClick={onRedo} disabled={!canRedo || isCalculating}
            title="Redo Layout (Ctrl+Y)"
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(99, 102, 241, 0.08)' }}
            whileTap={{ scale: 0.9 }}>
            <Redo2 size={15} />
          </motion.button>
        </div>

        <div className="ls-divider" />

        <div className="ls-topbar-group ls-center">
          <motion.button
            className="ls-selector-btn"
            onClick={onTogglePanel}
            disabled={isCalculating || isLoadingCurrent}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
            whileTap={{ scale: 0.98 }}
          >
            <LayoutGrid size={16} className="ls-selector-icon" />
            <span className="ls-selector-label">Layout</span>
            <Dot size={12} className="ls-dot-separator" />
            <span className="ls-selector-current" style={{ color: currentColor }}>
              {isLoadingCurrent ? 'Loading...' : currentLabel}
            </span>
            {modeLabel && !isLoadingCurrent && (
              <span className="ls-mode-badge" style={{
                background: layoutMode === 'preset' ? '#6366f120' : '#f59e0b20',
                color: layoutMode === 'preset' ? '#6366f1' : '#f59e0b',
                fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                marginLeft: '4px', fontWeight: 600,
              }}>
                {modeLabel}
              </span>
            )}
            {currentLayoutError && (
              <span title={`Error: ${currentLayoutError}`} style={{ marginLeft: '4px', display: 'flex' }}>
                <AlertCircle size={12} style={{ color: '#ef4444' }} />
              </span>
            )}
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} className="ls-chevron" />
            </motion.div>
          </motion.button>

          <motion.button className="ls-btn-icon" onClick={onToggleVisibility}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            title={manuallyHidden ? 'Toolbar hidden. Click to show (Ctrl+Shift+H)' :
              isVisible ? 'Hide toolbar (Ctrl+Shift+H)' : 'Show toolbar (Ctrl+Shift+H)'}>
            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          </motion.button>

          <motion.button className="ls-btn-icon" onClick={onRetry}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            title="Refresh current layout from server" disabled={isLoadingCurrent}>
            <RefreshCw size={14} className={isLoadingCurrent ? 'ls-spinner' : ''} />
          </motion.button>

          <AnimatePresence>
            {isCalculating && <ProgressIndicator progress={progress} onCancel={onCancel} />}
          </AnimatePresence>
        </div>

        <div className="ls-divider" />

        <div className="ls-topbar-group ls-right">
          <StatsBadge nodeCount={nodeCount} edgeCount={edgeCount} />
        </div>
      </div>
    </motion.div>
  ));

  LayoutTopbar.displayName = 'LayoutTopbar';

  interface LayoutSystemProps {
    algorithms?: any[];
    presets?: any;
    currentLayout: string | null;
    isCalculating: boolean;
    progress?: number;
    canUndo: boolean;
    canRedo: boolean;
    nodeCount?: number;
    edgeCount?: number;
    onApplyLayout: (algoKey: string, params: any) => void;
    onApplyPreset: (presetKey: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onCancel: () => void;
  }

  export const LayoutSystem = memo(({
    algorithms = [],
    presets = {},
    currentLayout,
    isCalculating,
    progress = 0,
    canUndo,
    canRedo,
    nodeCount = 0,
    edgeCount = 0,
    onApplyLayout,
    onApplyPreset,
    onUndo,
    onRedo,
    onCancel,
  }: LayoutSystemProps) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('presets');
    const [selectedAlgo, setSelectedAlgo] = useState<string | null>(null);
    const [customOptions, setCustomOptions] = useState<any>({});

    const {
      isVisible, show, toggle, manuallyHidden,
      containerRef, handleMouseEnter, handleMouseLeave,
    } = useHideOnIdle({ idleTimeout: 4000, triggerZoneHeight: 60, initiallyVisible: true });

    useKeyboardShortcut(
      { code: 'KeyH', ctrl: true, shift: true, alt: false, meta: false },
      toggle,
      true
    );

    const {
      isLoading: isLoadingCurrent,
      error: currentLayoutError,
      layoutMode,
      activePresetKey,
      retry: handleRetryLoad,
      setActivePresetKey,
      setLayoutMode,
      setLayoutParams,
    } = useLayoutSync(presets);

    const currentColor = ALGORITHM_COLORS[currentLayout as any] || DEFAULT_ALGORITHM_COLOR;
      
    const currentLabel = useMemo(() => {
      if (activePresetKey && presets[activePresetKey as any]) return presets[activePresetKey as any].name;
      return algorithms.find((a: any) => a.key === currentLayout)?.name || 'Layout';
    }, [currentLayout, presets, algorithms, activePresetKey]);

    const modeLabel = useMemo(() => {
      if (!layoutMode) return null;
      return layoutMode === 'preset' ? 'Preset' : 'Custom';
    }, [layoutMode]);

    const handlePresetClick = useCallback((presetKey: string) => {
      setActivePresetKey(presetKey);
      setLayoutMode('preset');
      setLayoutParams({});
      onApplyPreset(presetKey);

      const preset = presets[presetKey];
      if (preset) syncCurrentLayout(preset.algorithm, 'preset', {});

      setIsOpen(false);
    }, [onApplyPreset, presets, setActivePresetKey, setLayoutMode, setLayoutParams]);

    const handleAlgoSelect = useCallback((algoKey: string) => {
      setSelectedAlgo((prev: string | null) => prev === algoKey ? null : algoKey);
      if (selectedAlgo !== algoKey) setCustomOptions({});
    }, [selectedAlgo]);

    const handleApplyCustom = useCallback(() => {
      if (!selectedAlgo) return;

      setActivePresetKey(null);
      setLayoutMode('custom');
      setLayoutParams(customOptions);
      onApplyLayout(selectedAlgo, customOptions);

      syncCurrentLayout(selectedAlgo, 'custom', customOptions);

      setIsOpen(false);
      setSelectedAlgo(null);
      setCustomOptions({});
    }, [selectedAlgo, customOptions, onApplyLayout, setActivePresetKey, setLayoutMode, setLayoutParams]);

    const handleOptionChange = useCallback((key: string, value: number) => {
      setCustomOptions((prev: any) => ({ ...prev, [key]: value }));
    }, []);

    const handleTogglePanel = useCallback(() => {
      setIsOpen((prev: boolean) => {
        if (!prev) show();
        return !prev;
      });
    }, [show]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
      if (e.target === e.currentTarget) setIsOpen(false);
    }, []);

    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) setIsOpen(false);
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

    return (
      <>
        <FloatingShowButton isVisible={isVisible || isOpen} onClick={show} />

        <AnimatePresence>
          {!isVisible && !isOpen && (
            <TriggerZone
              isVisible={isVisible}
              manuallyHidden={manuallyHidden}
              onMouseEnter={show}
            />
          )}
        </AnimatePresence>

        <LayoutTopbar
          containerRef={containerRef}
          isVisible={isVisible}
          isOpen={isOpen}
          isCalculating={isCalculating}
          isLoadingCurrent={isLoadingCurrent}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          currentLabel={currentLabel}
          currentColor={currentColor}
          modeLabel={modeLabel}
          layoutMode={layoutMode}
          currentLayoutError={currentLayoutError}
          onTogglePanel={handleTogglePanel}
          onToggleVisibility={toggle}
          onRetry={handleRetryLoad}
          onCancel={onCancel}
          progress={progress}
          manuallyHidden={manuallyHidden}
          nodeCount={nodeCount}
          edgeCount={edgeCount}
        />

        <LayoutPanel
          isOpen={isOpen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentLayoutError={currentLayoutError}
          onRetry={handleRetryLoad}
          presets={presets}
          activePresetKey={activePresetKey}
          isCalculating={isCalculating}
          onPresetClick={handlePresetClick}
          algorithms={algorithms}
          currentLayout={currentLayout}
          selectedAlgo={selectedAlgo}
          customOptions={customOptions}
          onAlgoSelect={handleAlgoSelect}
          onOptionChange={handleOptionChange}
          onApplyCustom={handleApplyCustom}
          onBackdropClick={handleBackdropClick}
        />
      </>
    );
  });

  LayoutSystem.displayName = 'LayoutSystem';

  export { useHideOnIdle, useKeyboardShortcut, useLayoutSync };