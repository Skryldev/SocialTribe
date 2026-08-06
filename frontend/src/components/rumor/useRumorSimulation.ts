import { useCallback, useEffect, useRef, useState } from 'react';
import { useViewportGraphStore } from '../ui/viewportGraphStore';
import { viewportCache } from '../ui/viewportCacheManager';
import { simulationApi } from './rumorSimulationApi';

const PREFIX = '[RumorSim]';
const log = (...a: any[]) => console.log(PREFIX, ...a);
const ok = (...a: any[]) => console.log(`%c${PREFIX} ✅`, 'color:#4ade80', ...a);
const info = (...a: any[]) => console.log(`%c${PREFIX} 🎬`, 'color:#f59e0b', ...a);
const warn = (...a: any[]) => console.warn(PREFIX, '⚠️', ...a);

export const SIMULATION_MODELS: any = {
  wave: 'Wave / BFS',
  random: 'Random / SIR',
  threshold: 'Threshold',
  weighted: 'Weighted',
};

const DEFAULT_PARAMS = {
  model: 'wave',
  probability: 0.3,
  threshold: 2,
  speedMultiplier: 1,
  seedIds: [],
};

const SKIP_INTERVAL_MS = 10;
const SKIP_BATCH_SIZE = 20;

export function useRumorSimulation(nodes: any[], _edges: any[]): any {
  const [params, setParams] = useState<any>(DEFAULT_PARAMS);
  const paramsRef = useRef<any>(params);
  paramsRef.current = params;

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [coverage, setCoverage] = useState<number>(0);
  const [activeSpreaders, setActiveSpreaders] = useState<number>(0);
  const [dailyGrowth, setDailyGrowth] = useState<any[]>([]);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const isRunningRef = useRef<boolean>(false);
  const allStepsRef = useRef<any[]>([]);
  const totalStepsRef = useRef<number>(0);
  const stepIndexRef = useRef<number>(0);
  const appliedCountRef = useRef<number>(0);
  const skippedCountRef = useRef<number>(0);
  const currentDayRef = useRef<number>(0);

  const applyNodeUpdate = useCallback((nodeId: string, status: string, day: number) => {
    const state = useViewportGraphStore.getState();
    const existingNode = state._nodeMap.get(nodeId);

    viewportCache.saveSimulationStatus(nodeId, status, day);

    if (!existingNode) {
      skippedCountRef.current++;
      return false;
    }

    const newSim = { status, day };
    state._nodeMap.set(nodeId, {
      ...existingNode,
      data: { ...existingNode.data, simulation: newSim },
    });

    const updatedNodes = state.nodes.map((n: any) =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, simulation: newSim } }
        : n
    );

    useViewportGraphStore.setState({ nodes: updatedNodes });
    appliedCountRef.current++;
    return true;
  }, []);

  const getCurrentStats = useCallback(() => {
    const state = useViewportGraphStore.getState();
    let informed = 0, spreaders = 0;
    for (const node of state.nodes) {
      const sim = node.data?.simulation;
      if (sim && sim.status !== 'ignorant') informed++;
      if (sim && sim.status === 'spreader') spreaders++;
    }
    return { informed, spreaders, total: state.nodes.length, coverage: state.nodes.length > 0 ? informed / state.nodes.length : 0 };
  }, []);

  const buildStepsFromDays = useCallback((days: any[]) => {
    const allSteps: any[] = [];

    for (const day of days) {
      if (!day.nodeUpdates) continue;
      for (const update of day.nodeUpdates) {
        allSteps.push({
          nodeId: update.id,
          status: update.status,
          day: day.day,
        });
      }
    }

    const state = useViewportGraphStore.getState();
    const storeNodeIds = new Set(state._nodeMap.keys());
    const visibleCount = allSteps.filter((s: any) => storeNodeIds.has(s.nodeId)).length;

    ok(`Built ${allSteps.length} total steps (${visibleCount} visible, ${allSteps.length - visibleCount} fast-forward)`);
    return { steps: allSteps, totalSteps: allSteps.length };
  }, []);

  const fastForwardSkipped = useCallback(() => {
    const state = useViewportGraphStore.getState();
    const storeNodeIds = new Set(state._nodeMap.keys());
    let batchCount = 0;

    while (stepIndexRef.current < totalStepsRef.current && batchCount < SKIP_BATCH_SIZE) {
      const step = allStepsRef.current[stepIndexRef.current];

      if (storeNodeIds.has(step.nodeId)) break;

      viewportCache.saveSimulationStatus(step.nodeId, step.status, step.day);

      if (step.day !== currentDayRef.current) {
        currentDayRef.current = step.day;
      }

      skippedCountRef.current++;
      stepIndexRef.current++;
      batchCount++;
    }

    if (batchCount > 0) {
      const step = allStepsRef.current[Math.min(stepIndexRef.current, totalStepsRef.current - 1)];
      if (step) {
        setCurrentDay(step.day);
      }
    }

    if (stepIndexRef.current >= totalStepsRef.current) {
      finishAnimation();
      return true;
    }

    return false;
  }, []);

  const finishAnimation = useCallback(() => {
    const stats = getCurrentStats();
    setCoverage(stats.coverage);
    setActiveSpreaders(stats.spreaders);
    setIsRunning(false);
    isRunningRef.current = false;
    setIsComplete(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    ok(`🏁 Complete: ${appliedCountRef.current} applied, ${skippedCountRef.current} fast-forwarded`);
  }, [getCurrentStats]);

  const tick = useCallback(() => {
    if (stepIndexRef.current >= totalStepsRef.current) {
      finishAnimation();
      return;
    }

    const allDone = fastForwardSkipped();
    if (allDone) return;

    const idx = stepIndexRef.current;
    const step = allStepsRef.current[idx];
    const prevStep = allStepsRef.current[idx - 1];
    const dayChanged = !prevStep || step.day !== prevStep.day;

    if (dayChanged) {
      info(`📅 Day ${step.day} (step ${idx + 1}/${totalStepsRef.current})`);
      currentDayRef.current = step.day;
    }

    const applied = applyNodeUpdate(step.nodeId, step.status, step.day);
    stepIndexRef.current = idx + 1;

    if (applied && (appliedCountRef.current % 5 === 0 || dayChanged)) {
      const stats = getCurrentStats();
      if (dayChanged) {
        setCurrentDay(step.day);
        setDailyGrowth((prev: any[]) => [...prev, { day: step.day, count: stats.informed }].slice(-60));
      }
      setCoverage(stats.coverage);
      setActiveSpreaders(stats.spreaders);
    }

    if (stepIndexRef.current >= totalStepsRef.current) {
      finishAnimation();
    }
  }, [applyNodeUpdate, getCurrentStats, fastForwardSkipped, finishAnimation]);

  const scheduleLoop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (totalStepsRef.current === 0) {
      warn('No steps to animate!');
      setIsRunning(false);
      isRunningRef.current = false;
      setIsComplete(true);
      return;
    }

    const state = useViewportGraphStore.getState();
    const storeNodeIds = new Set(state._nodeMap.keys());
    const hasVisibleSteps = allStepsRef.current.some((s: any) => storeNodeIds.has(s.nodeId));

    if (!hasVisibleSteps) {
      warn('No visible nodes — fast-forwarding all steps...');
      const fastTimer = setInterval(() => {
        if (!isRunningRef.current) {
          clearInterval(fastTimer);
          return;
        }
        const done = fastForwardSkipped();
        if (done) {
          clearInterval(fastTimer);
          finishAnimation();
        }
      }, SKIP_INTERVAL_MS);
      timerRef.current = fastTimer;
      return;
    }

    const baseInterval = 1000 / paramsRef.current.speedMultiplier;
    const totalSteps = totalStepsRef.current;
    const ms = totalSteps > 50 ? Math.max(80, baseInterval / 3) : Math.max(200, baseInterval);

    info(`Schedule: ${ms}ms/step, ${totalSteps} total steps`);
    log(`⏲️ Timer set: ${timerRef.current}`);

    timerRef.current = setInterval(() => {
      if (!isRunningRef.current) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        return;
      }
      tick();
    }, ms);
  }, [tick, fastForwardSkipped, finishAnimation]);

  const startSimulation = useCallback(async () => {
    setIsLoading(true);
    stepIndexRef.current = 0;
    appliedCountRef.current = 0;
    skippedCountRef.current = 0;
    currentDayRef.current = 0;

    try {
      const response = await simulationApi.runSimulation({
        model: paramsRef.current.model,
        probability: paramsRef.current.probability,
        threshold: paramsRef.current.threshold,
        maxTicks: 100,
      });

      const days = response?.data?.days || response?.days || [];

      if (!days.length) {
        warn('No simulation data returned');
        setIsLoading(false);
        return;
      }

      const { steps, totalSteps } = buildStepsFromDays(days);

      if (!steps.length) {
        setIsLoading(false);
        return;
      }

      allStepsRef.current = steps;
      totalStepsRef.current = totalSteps;

      setCurrentDay(0);
      setIsComplete(false);

      const firstDayStats = days[0]?.stats;
      setDailyGrowth(firstDayStats ? [{ day: 0, count: firstDayStats.informed }] : []);
      setCoverage(firstDayStats?.coverage || 0);
      setActiveSpreaders(firstDayStats?.spreaders || 0);

      setIsRunning(true);
      isRunningRef.current = true;

      ok(`Starting: ${totalSteps} steps across ${days.length} days`);
      scheduleLoop();
    } catch (error: any) {
      console.error('[RumorSim] Failed:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [buildStepsFromDays, scheduleLoop]);

  const pauseSimulation = useCallback(() => {
    setIsRunning(false);
    isRunningRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const resumeSimulation = useCallback(() => {
    if (!allStepsRef.current.length || isComplete) return;
    setIsRunning(true);
    isRunningRef.current = true;
    scheduleLoop();
  }, [isComplete, scheduleLoop]);

  const stepSimulation = useCallback(() => {
    if (!allStepsRef.current.length || stepIndexRef.current >= totalStepsRef.current) return;
    tick();
  }, [tick]);

  const resetSimulation = useCallback(() => {
    pauseSimulation();
    allStepsRef.current = [];
    totalStepsRef.current = 0;
    stepIndexRef.current = 0;
    appliedCountRef.current = 0;
    skippedCountRef.current = 0;
    currentDayRef.current = 0;
    setCurrentDay(0);
    setCoverage(0);
    setActiveSpreaders(0);
    setDailyGrowth([]);
    setIsComplete(false);

    const state = useViewportGraphStore.getState();
    const cleanedNodes = state.nodes.map((node: any) => {
      if (node.data?.simulation) {
        const { simulation: _, ...rest } = node.data;
        return { ...node, data: rest };
      }
      return node;
    });

    for (const [id, node] of state._nodeMap.entries()) {
      if (node.data?.simulation) {
        const { simulation: _, ...rest } = node.data;
        state._nodeMap.set(id, { ...node, data: rest });
      }
    }

    useViewportGraphStore.setState({ nodes: cleanedNodes });
    viewportCache.clearSimulationCache();
  }, [pauseSimulation]);

  const updateParams = useCallback((patch: any) => {
    setParams((prev: any) => {
      const next = { ...prev, ...patch };
      paramsRef.current = next;
      if (isRunningRef.current && patch.speedMultiplier != null) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (!isRunningRef.current) return;
          tick();
        }, Math.round(1000 / next.speedMultiplier));
      }
      return next;
    });
  }, [tick]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return {
    startSimulation, pauseSimulation, resumeSimulation, resetSimulation,
    stepSimulation, updateParams, params,
    isRunning, isComplete, isLoading,
    currentDay, coverage, activeSpreaders, dailyGrowth,
    totalNodes: nodes.length,
    informedCount: Math.round(coverage * nodes.length),
  };
}