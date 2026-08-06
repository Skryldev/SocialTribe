import { QueryClient } from '@tanstack/react-query';
import { fetchViewportGraph } from './viewportApi';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 10 * 60_000,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 800,
    },
  },
});

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export function viewportQueryKey(viewport: Viewport): any[] {
  return [
    'viewport-graph',
    {
      x: Math.round(viewport.x),
      y: Math.round(viewport.y),
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      zoom: Math.round(viewport.zoom * 10) / 10,
    },
  ];
}

export function viewportQueryFn(viewport: Viewport): any {
  return async ({ signal }: { signal: AbortSignal }) => {
    return fetchViewportGraph(viewport, signal);
  };
}

export async function prefetchViewport(viewport: Viewport): Promise<any> {
  if (!viewport) return null;
  
  try {
    await queryClient.prefetchQuery({
      queryKey: viewportQueryKey(viewport),
      queryFn: viewportQueryFn(viewport),
      staleTime: Infinity,
    });
    
    const data = queryClient.getQueryData(viewportQueryKey(viewport));
    return { data };
  } catch (error) {
    console.error('Prefetch error:', error);
    return null;
  }
}

export function cancelStaleViewportQueries(exceptKey: string): void {
  const queries = queryClient.getQueryCache().getAll();
  
  for (const query of queries) {
    if (query.queryKey[0] === 'viewport-graph') {
      if (JSON.stringify(query.queryKey) !== exceptKey) {
        queryClient.cancelQueries({ queryKey: query.queryKey });
      }
    }
  }
}

export function invalidateGraphCache(): void {
  queryClient.cancelQueries({ queryKey: ['viewport-graph'] });
  queryClient.invalidateQueries({ queryKey: ['viewport-graph'] });
  console.log('🗑️ Graph cache invalidated (queries will refetch)');
}

export function clearGraphCache(): void {
  queryClient.cancelQueries({ queryKey: ['viewport-graph'] });
  queryClient.removeQueries({ queryKey: ['viewport-graph'] });
  console.log('🧹 Graph cache cleared completely');
}

export function resetGraphCache(): void {
  queryClient.cancelQueries({ queryKey: ['viewport-graph'] });
  queryClient.removeQueries({ queryKey: ['viewport-graph'] });
  queryClient.invalidateQueries({ queryKey: ['viewport-graph'] });
  console.log('🔄 Graph cache reset (cleared + invalidated)');
}

export default {
  queryClient,
  viewportQueryKey,
  viewportQueryFn,
  prefetchViewport,
  cancelStaleViewportQueries,
  invalidateGraphCache,
  clearGraphCache,
  resetGraphCache,
};