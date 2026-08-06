export const getMetrics = async (): Promise<any> => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  return {
    queryCount: 1247,
    cacheHitRate: 0.78,
    storageReads: 15234,
    storageWrites: 8765,
    avgQueryTime: 0.15,
    activeConnections: 12,
    indexUsage: 0.65,
    pageUtilization: 0.75,
    queriesPerSecond: 8.3,
    errorRate: 0.02,
  };
};