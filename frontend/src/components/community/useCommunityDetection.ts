import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

export function useCommunityDetection(): any {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  
  const abortControllerRef = useRef<any>(null);
  const lastParamsRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const areParamsEqual = useCallback((params1: any, params2: any): boolean => {
    if (!params1 || !params2) return false;
    return JSON.stringify(params1) === JSON.stringify(params2);
  }, []);

  const mapApiResponse = useCallback((apiData: any) => {
    return {
      finalCommunities: apiData.finalCommunities.map((community: any) => ({
        members: community.members,
        size: community.size
      })),
      
      stabilityMetrics: {
        overallStability: apiData.stabilityMetrics?.overallStability ?? 0,
        avgWithinConsensus: apiData.stabilityMetrics?.avgWithinConsensus ?? 0,
        avgBetweenConsensus: apiData.stabilityMetrics?.avgBetweenConsensus ?? 0
      },
      
      modularityHistory: apiData.modularityHistory || [],
      bestModularity: apiData.bestModularity ?? 0,
      avgModularity: apiData.avgModularity ?? 0,
      
      largestCommunitySize: apiData.largestCommunitySize ?? 0,
      smallestCommunitySize: apiData.smallestCommunitySize ?? 0,
      avgCommunitySize: apiData.avgCommunitySize ?? 0,
      communitySizeDistribution: apiData.communitySizeDistribution || [],
      numFinalCommunities: apiData.numFinalCommunities ?? 0,
      
      numRuns: apiData.numRuns ?? 0,
      resolution: apiData.resolution ?? 0,
      ensembleRuns: apiData.ensembleRuns ?? 0,
      consensusThreshold: apiData.consensusThreshold ?? 0,
      executionTimeMs: apiData.executionTimeMs ?? 0
    };
  }, []);

  const runDetection = useCallback(async (params: any) => {
    if (areParamsEqual(lastParamsRef.current, params) && results) {
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    lastParamsRef.current = { ...params };
    
    setIsRunning(true);
    setProgress('Connecting to server...');
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (abortController.signal.aborted) return;
      
      setProgress('Running ensemble community detection...');
      
      const response = await axios.post(
        `${API_BASE_URL}/graph/ensemble-communities`,
        {
          config: {
            resolution: params.resolution,
            ensembleRuns: params.ensembleRuns,
            consensusThreshold: params.consensusThreshold
          }
        },
        {
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (abortController.signal.aborted) return;
      
      if (!response.data?.success) {
        throw new Error('Server indicated failure');
      }
      
      if (!response.data?.data) {
        throw new Error('Invalid response format: missing data field');
      }
      
      setProgress('Processing results...');
      
      const mappedResults = mapApiResponse(response.data.data);
      
      setResults(mappedResults);
      setIsRunning(false);
      setProgress('');
      
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        setIsRunning(false);
        setProgress('');
        return;
      }
      
      console.error('Community detection failed:', err);
      
      let errorMessage: string;
      
      if (err.response) {
        const status = err.response.status;
        const serverMessage = err.response.data?.detail || err.message;
        
        switch (status) {
          case 422:
            errorMessage = `Invalid parameters: ${serverMessage}`;
            break;
          case 500:
            errorMessage = 'Server error. The analysis could not be completed.';
            break;
          case 503:
            errorMessage = 'Server is temporarily unavailable. Please try again.';
            break;
          default:
            errorMessage = `Server error (${status}): ${serverMessage}`;
        }
      } else if (err.request) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running on port 8080.';
      } else {
        errorMessage = `Detection failed: ${err.message}`;
      }
      
      setError(errorMessage);
      setIsRunning(false);
      setProgress('');
      
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [results, mapApiResponse, areParamsEqual]);

  return {
    isRunning,
    progress,
    error,
    results,
    runDetection
  };
}

export default useCommunityDetection;