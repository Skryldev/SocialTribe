import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { compile_query, explain_query } from '../../pkg/wasm.js';
import { executeGraphQuery } from './graphApi.js';
import { useQueryStore } from './queryStore.js';

const normalizeWasmResult = (wasmResult: any): any =>
  wasmResult instanceof Map ? Object.fromEntries(wasmResult) : { ...wasmResult };

const parseWasmField = (field: any): any =>
  typeof field === 'string' ? JSON.parse(field) : field;

const formatQuery = (query: string): string => {
  return query
    .replace(/\s*MATCH\s+/gi, 'MATCH ')
    .replace(/\s*WHERE\s+/gi, '\n  WHERE ')
    .replace(/\s*RETURN\s+/gi, '\nRETURN ')
    .replace(/\s*CREATE\s+/gi, '\nCREATE ')
    .replace(/\s*SET\s+/gi, '\n  SET ')
    .replace(/\s*MERGE\s+/gi, '\nMERGE ')
    .replace(/\s*WITH\s+/gi, '\nWITH ')
    .replace(/\s*ORDER\s+BY\s+/gi, '\nORDER BY ')
    .replace(/\s*LIMIT\s+/gi, '\nLIMIT ')
    .replace(/\s*AND\s+/gi, ' AND ')
    .replace(/\s*OR\s+/gi, ' OR ')
    .replace(/\s*=\s*/g, ' = ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
};

interface UseQueryEngineProps {
  activeTab: any;
  isExecuting: boolean;
  wasmReady: boolean;
  addLog: (level: string, message: string, source?: string) => void;
  editorRef: any;
}

export const useQueryEngine = ({ activeTab, isExecuting, wasmReady, addLog }: UseQueryEngineProps): any => {
  const { setExecuting, setQueryResult, addToHistory, updateQueryContent, setQueryPlan } = useQueryStore() as any;
  
  const isExecuteDisabled = useMemo(
    () => isExecuting || !activeTab || !activeTab.query?.trim() || !wasmReady,
    [isExecuting, activeTab, wasmReady]
  );
  
  const handleExecute = useCallback(async () => {
    if (!activeTab) {
      toast.error('No active query tab');
      return;
    }
    
    const trimmedQuery = activeTab.query.trim();
    if (!trimmedQuery) {
      toast.warning('Please enter a query to execute');
      return;
    }
    
    if (isExecuting) {
      toast.warning('A query is already executing');
      return;
    }
    
    if (!wasmReady) {
      toast.error('Query engine is still loading');
      return;
    }
    
    setQueryResult(null);
    setExecuting(true);
    
    const truncatedQuery = trimmedQuery.length > 80
      ? `${trimmedQuery.substring(0, 80)}...`
      : trimmedQuery;
    
    addLog('INFO', `Executing query: ${truncatedQuery}`, 'query');
    
    const loadingToastId = toast.loading('Compiling & executing query...');
    const startTime = performance.now();
    
    try {
      const wasmResult = compile_query(trimmedQuery, 1000, 5000);
      const compiled = normalizeWasmResult(wasmResult);
      
      console.log('🔍 WASM Compiled:', compiled);
      
      const compilationErrors = compiled.errors || [];
      if (!compiled.success || compilationErrors.length > 0) {
        throw new Error(`Compilation failed: ${compilationErrors.join(', ') || 'Unknown error'}`);
      }
      
      const physicalPlan = parseWasmField(compiled.physical_plan);
      console.log('📋 Physical Plan (raw):', physicalPlan);
      
      toast.loading('Executing on Graph Storage...', { id: loadingToastId });
      
      const backendResult = await executeGraphQuery(trimmedQuery, physicalPlan);
      console.log('💾 Backend Result:', backendResult);
      
      if (!backendResult.success) {
        throw new Error(backendResult.error || 'Backend execution failed');
      }
      
      const durationSec = ((performance.now() - startTime) / 1000).toFixed(2);
      const columns = backendResult.data?.columns || [];
      const rows = backendResult.data?.rows || [];
      const statistics = backendResult.data?.statistics || {};
      const rowCount = rows.length;
      
      const explainData = compiled.explain_data instanceof Map
        ? Object.fromEntries(compiled.explain_data)
        : compiled.explain_data || {};
      
      const formattedResult = {
        columns,
        rows,
        rowCount,
        executionTime: durationSec,
        statistics,
        timestamp: new Date().toISOString(),
        compilation: {
          diagnostics: compiled.diagnostics || [],
          warnings: compiled.warnings || [],
          estimatedCost: explainData.estimated_cost ?? null,
          estimatedRows: explainData.estimated_rows ?? null,
        },
      };
      
      setQueryResult(formattedResult);
      
      addToHistory({
        id: Date.now(),
        query: trimmedQuery,
        timestamp: new Date().toISOString(),
        duration: durationSec,
        status: 'success',
        rowCount,
      });
      
      const scanned = statistics.scanned ?? '?';
      const traversed = statistics.traversed ?? '?';
      const filtered = statistics.filtered ?? '?';
      
      addLog(
        'SUCCESS',
        `Query executed in ${durationSec}s — ${rowCount} row(s) returned ` +
        `(scanned: ${scanned}, traversed: ${traversed}, filtered: ${filtered})`,
        'query'
      );
      
      toast.success(`Returned ${rowCount} row(s) in ${durationSec}s`, {
        id: loadingToastId,
        icon: '✅',
        description: `Scanned: ${scanned} | Traversed: ${traversed} | Filtered: ${filtered}`,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown execution error';
      console.error('❌ Query execution error:', error);
      
      addLog('ERROR', `Query failed: ${errorMessage}`, 'query');
      
      setQueryResult({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      
      toast.error(`Query failed: ${errorMessage}`, {
        id: loadingToastId,
        icon: '❌',
        duration: 5000,
      });
    } finally {
      setExecuting(false);
    }
  }, [activeTab, isExecuting, wasmReady, setExecuting, addLog, setQueryResult, addToHistory]);
  
  const handleExplain = useCallback(async () => {
    if (!activeTab?.query.trim()) {
      toast.warning('Please enter a query to explain');
      return;
    }
    
    if (!wasmReady) {
      toast.error('Query engine is still loading');
      return;
    }
    
    addLog('INFO', 'Generating query plan via WASM', 'query');
    const loadingToast = toast.loading('Generating query plan...');
    
    try {
      const result = explain_query(activeTab.query, 1000, 5000);
      console.log('📊 Explain Result:', result);
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      const plan = {
        query: activeTab.query,
        logicalPlan: result.explain?.logical_plan || 'N/A',
        optimizedPlan: result.explain?.optimized_plan || 'N/A',
        physicalPlan: result.explain?.physical_plan || 'N/A',
        totalCost: result.explain?.estimated_cost || 0,
        estimatedRows: result.explain?.estimated_rows || 0,
        optimizations: result.explain?.optimizations || [],
        raw: result,
      };
      
      setQueryPlan(plan);
      addLog('INFO', `Plan generated — Total Cost: ${plan.totalCost}`, 'query');
      addLog('DEBUG', `Plan Details: ${JSON.stringify(plan, null, 2)}`, 'query');
      
      toast.success('Query plan generated successfully', {
        id: loadingToast,
        description: `Total Cost: ${plan.totalCost}`,
        icon: '📊',
      });
    } catch (error: any) {
      addLog('ERROR', `Failed to generate plan: ${error.message}`, 'query');
      toast.error(`Failed to generate plan: ${error.message}`, {
        id: loadingToast,
        icon: '❌',
      });
    }
  }, [activeTab, wasmReady, setQueryPlan, addLog]);
  
  const handleFormat = useCallback(() => {
    if (!activeTab) return;
    
    const formatted = formatQuery(activeTab.query);
    updateQueryContent(activeTab.id, formatted);
    addLog('DEBUG', 'Query formatted', 'query');
    toast.success('Query formatted successfully', { duration: 2000, icon: '✨' });
  }, [activeTab, updateQueryContent, addLog]);
  
  return {
    handleExecute,
    handleExplain,
    handleFormat,
    isExecuteDisabled,
  };
};