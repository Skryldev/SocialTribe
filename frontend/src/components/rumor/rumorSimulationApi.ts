import {
  runSimulation as sdkRunSimulation,
  influenceMaximization,
} from '../../generated/sdk.gen';
import type {
  RunSimulationData,
  InfluenceMaximizationData,
  RunSimulationRequest,
  InfluenceMaximizationRequest,
} from '../../generated/types.gen';

// ============================================================
// Helper
// ============================================================
const extractData = <T>(response: { data?: T; error?: unknown }): T => {
  if (response.error) throw response.error;
  if (!response.data) throw new Error('No data returned');
  return response.data;
};

// ============================================================
// Types (همان interface های قبلی)
// ============================================================
interface SimulationParams {
  model?: string;
  probability?: number;
  threshold?: number;
  maxTicks?: number;
}

interface SeedParams {
  k: number;
  method?: string;
}

// ============================================================
// Simulation API (همان signature های قبلی)
// ============================================================
export const simulationApi = {
  runSimulation: async (params: SimulationParams): Promise<any> => {
    const response = await sdkRunSimulation({
      body: {
        model: params.model || 'wave',
        probability: params.probability ?? 0.3,
        threshold: params.threshold ?? 2,
        maxTicks: params.maxTicks ?? 100,
      } as RunSimulationRequest,
    } as RunSimulationData);
    return extractData(response);
  },

  findOptimalSeeds: async (params: SeedParams): Promise<any> => {
    const response = await influenceMaximization({
      body: {
        k: params.k,
        method: params.method || 'optimal',
      } as InfluenceMaximizationRequest,
    } as InfluenceMaximizationData);
    return extractData(response);
  },
};

export default simulationApi;