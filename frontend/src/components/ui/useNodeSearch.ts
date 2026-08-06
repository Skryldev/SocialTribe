import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getGraphNetwork } from '../services/importApi';

interface UseNodeSearchOptions {
  autoFetch?: boolean;
  initialNodes?: any[];
}

export function useNodeSearch({ autoFetch = true, initialNodes = [] }: UseNodeSearchOptions = {}): any {
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);
  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchNodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getGraphNetwork();
      if (mountedRef.current) {
        setNodes(data?.nodes || []);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch nodes');
        console.error('[useNodeSearch] Fetch error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchNodes();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, fetchNodes]);

  useEffect(() => {
    if (!query) {
      setDebouncedQuery('');
      setIsDebouncing(false);
      clearTimeout(timerRef.current);
      return;
    }
    setIsDebouncing(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setIsDebouncing(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [debouncedQuery]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return nodes.filter((n: any) =>
      String(n.data?.name ?? n.id ?? '').toLowerCase().includes(q)
    );
  }, [nodes, debouncedQuery]);

  const currentNode = results[currentIndex] ?? null;
  const hasQuery = debouncedQuery.trim().length > 0;

  const next = useCallback(() => {
    setCurrentIndex((i: number) => (results.length ? (i + 1) % results.length : 0));
  }, [results.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i: number) =>
      results.length ? (i - 1 + results.length) % results.length : 0
    );
  }, [results.length]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setCurrentIndex(0);
    setIsDebouncing(false);
    clearTimeout(timerRef.current);
  }, []);

  return {
    query,
    setQuery,
    results,
    currentNode,
    currentIndex,
    isDebouncing,
    hasQuery,
    isLoading,
    error,
    nodes,
    totalNodes: nodes.length,
    next,
    prev,
    clearSearch,
    refetch: fetchNodes,
  };
}