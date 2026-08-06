import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchCurrentLayout } from './LayoutApi';

interface ShortcutConfig {
  code: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export function useKeyboardShortcut(shortcut: ShortcutConfig, callback: () => void, enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const { code, ctrlKey, shiftKey, altKey, metaKey } = e;

      const isMatch =
        code === shortcut.code &&
        !!ctrlKey === !!shortcut.ctrl &&
        !!shiftKey === !!shortcut.shift &&
        !!altKey === !!shortcut.alt &&
        !!metaKey === !!shortcut.meta;

      if (isMatch) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        callback();
        return false;
      }
    };

    window.addEventListener('keydown', handler, { capture: true, passive: false });
    document.addEventListener('keydown', handler, { capture: true, passive: false });

    return () => {
      window.removeEventListener('keydown', handler, { capture: true });
      document.removeEventListener('keydown', handler, { capture: true });
    };
  }, [shortcut.code, shortcut.ctrl, shortcut.shift, shortcut.alt, shortcut.meta, callback, enabled]);
}

interface UseHideOnIdleOptions {
  idleTimeout?: number;
  triggerZoneHeight?: number;
  initiallyVisible?: boolean;
}

interface UseHideOnIdleReturn {
  isVisible: boolean;
  show: () => void;
  toggle: () => void;
  manuallyHidden: boolean;
  containerRef: React.RefObject<any>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  isHovering: boolean;
}

export function useHideOnIdle({
  idleTimeout = 3000,
  triggerZoneHeight = 60,
  initiallyVisible = true,
}: UseHideOnIdleOptions = {}): UseHideOnIdleReturn {
  const [isVisible, setIsVisible] = useState<boolean>(initiallyVisible);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [manuallyHidden, setManuallyHidden] = useState<boolean>(false);
  const idleTimerRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const isManuallyHiddenRef = useRef<boolean>(false);

  useEffect(() => {
    isManuallyHiddenRef.current = manuallyHidden;
  }, [manuallyHidden]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (!isManuallyHiddenRef.current) {
      idleTimerRef.current = setTimeout(() => setIsVisible(false), idleTimeout);
    }
  }, [idleTimeout]);

  const show = useCallback(() => {
    setManuallyHidden(false);
    setIsVisible(true);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const toggle = useCallback(() => {
    setIsVisible((prev: boolean) => {
      if (prev) {
        setManuallyHidden(true);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
        return false;
      }
      setManuallyHidden(false);
      resetIdleTimer();
      return true;
    });
  }, [resetIdleTimer]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isManuallyHiddenRef.current) return;

      if (e.clientY <= triggerZoneHeight) {
        setIsHovering(true);
        setIsVisible(true);
        resetIdleTimer();
      } else if (e.clientY > triggerZoneHeight + 20) {
        setIsHovering(false);
        resetIdleTimer();
      }
    },
    [triggerZoneHeight, resetIdleTimer]
  );

  const handleMouseEnter = useCallback(() => {
    if (isManuallyHiddenRef.current) return;
    setIsHovering(true);
    setIsVisible(true);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [handleMouseMove, resetIdleTimer]);

  return {
    isVisible,
    show,
    toggle,
    manuallyHidden,
    containerRef,
    handleMouseEnter,
    handleMouseLeave,
    isHovering,
  };
}

interface UseLayoutSyncReturn {
  isLoading: boolean;
  error: string | null;
  layoutMode: string | null;
  layoutParams: any;
  activePresetKey: string | null;
  customOptions: any;
  selectedAlgo: string | null;
  retry: () => void;
  setActivePresetKey: (key: string | null) => void;
  setCustomOptions: (options: any) => void;
  setSelectedAlgo: (algo: string | null) => void;
  setLayoutMode: (mode: string | null) => void;
  setLayoutParams: (params: any) => void;
}

export function useLayoutSync(presets: any): UseLayoutSyncReturn {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<string | null>(null);
  const [layoutParams, setLayoutParams] = useState<any>({});
  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
  const [customOptions, setCustomOptions] = useState<any>({});
  const [selectedAlgo, setSelectedAlgo] = useState<string | null>(null);
  const hasInitialized = useRef<boolean>(false);

  const loadCurrentLayout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await fetchCurrentLayout();

      if (data.algorithm) {
        setLayoutMode(data.mode);
        setLayoutParams(data.params);

        if (data.mode === 'preset') {
          const presetEntry = Object.entries(presets).find(
            ([, preset]: [string, any]) => preset.algorithm === data.algorithm
          );
          if (presetEntry) setActivePresetKey(presetEntry[0]);
        } else if (data.mode === 'custom') {
          setCustomOptions(data.params);
          setSelectedAlgo(data.algorithm);
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Failed to load current layout:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [presets]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    loadCurrentLayout();
  }, [loadCurrentLayout]);

  const retry = useCallback(() => {
    hasInitialized.current = false;
    setTimeout(() => {
      hasInitialized.current = false;
      loadCurrentLayout();
    }, 100);
  }, [loadCurrentLayout]);

  return {
    isLoading,
    error,
    layoutMode,
    layoutParams,
    activePresetKey,
    customOptions,
    selectedAlgo,
    retry,
    setActivePresetKey,
    setCustomOptions,
    setSelectedAlgo,
    setLayoutMode,
    setLayoutParams,
  };
}