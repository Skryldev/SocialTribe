const BENCHMARK_SERVER_URL = 'http://localhost:3001';

export const benchmarkAPI = {
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${BENCHMARK_SERVER_URL}/api/benchmark/health`);
      if (!response.ok) throw new Error('Server not reachable');
      return await response.json();
    } catch (error) {
      console.error('Benchmark server health check failed:', error);
      return { status: 'error', message: 'Cannot connect to benchmark server' };
    }
  },

  async runBenchmark(algorithm: string, inputSize: number, options: any = {}): Promise<any> {
    console.log(`📡 Sending benchmark request to Node.js server: ${algorithm} (${inputSize} vertices)`);
    
    try {
      const response = await fetch(`${BENCHMARK_SERVER_URL}/api/benchmark/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          algorithm, 
          inputSize, 
          options: {
            iterations: options.iterations || 3,
            warmupRuns: options.warmupRuns || 1,
            ...options
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Benchmark failed');
      }

      const result = await response.json();
      console.log('✅ Benchmark completed:', result.data.algorithm);
      console.log(`   Time: ${result.data.time.mean.toFixed(3)} ms`);
      console.log(`   Memory: ${result.data.memory.mean.toFixed(2)} KB`);
      return result;
    } catch (error) {
      console.error('❌ Benchmark error:', error);
      throw error;
    }
  },

  async compareAlgorithms(algorithms: string[], inputSize: number): Promise<any> {
    console.log(`📡 Sending comparison request: ${algorithms.join(' vs ')} (${inputSize} vertices)`);
    
    try {
      const response = await fetch(`${BENCHMARK_SERVER_URL}/api/benchmark/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithms, inputSize }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Comparison failed');
      }

      const result = await response.json();
      console.log('✅ Comparison completed');
      return result;
    } catch (error) {
      console.error('❌ Comparison error:', error);
      throw error;
    }
  },

  subscribeToProgress(algorithm: string, inputSize: number, onProgress: (data: any) => void): () => void {
    const eventSource = new EventSource(
      `${BENCHMARK_SERVER_URL}/api/benchmark/progress?algorithm=${encodeURIComponent(algorithm)}&size=${inputSize}`
    );

    eventSource.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onProgress(data);
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  },
};