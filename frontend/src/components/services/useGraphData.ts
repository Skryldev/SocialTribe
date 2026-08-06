import { useState, useEffect, useCallback } from 'react';
import { getFullNetwork } from '../dashboard/getNodeApi';
import { toast } from 'sonner';

const graphChangeListeners: Set<() => void> = new Set();

export function emitGraphChange(): void {
  console.log('📢 emitGraphChange called');
  graphChangeListeners.forEach((listener: () => void) => listener());
}

interface GraphData {
  nodes: any[];
  edges: any[];
}

export function useGraphData(): any {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraphData = useCallback(async () => {
    console.log('🔄 fetchGraphData called');
    setLoading(true);
    setError(null);
    try {
      const data = await getFullNetwork();
      setGraphData({
        nodes: data.nodes || [],
        edges: data.edges || [],
      });
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load graph data from API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    const handleGraphChange = () => {
      console.log('📢 Graph change detected, fetching new data...');
      fetchGraphData();
    };
    
    graphChangeListeners.add(handleGraphChange);
    return () => {
      graphChangeListeners.delete(handleGraphChange);
    };
  }, [fetchGraphData]);

  return { graphData, loading, error, refetch: fetchGraphData };
}