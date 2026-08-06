import { exportGraph } from '../../generated/sdk.gen';

// ============================================================
// Helper
// ============================================================
const extractData = <T>(response: { data?: T; error?: unknown }): T => {
  if (response.error) throw response.error;
  if (!response.data) throw new Error('No data returned');
  return response.data;
};

// ============================================================
// API Function (همان signature قبلی)
// ============================================================
export const getFullNetwork = async (): Promise<any> => {
  try {
    const response = await exportGraph();
    return extractData(response);
  } catch (error) {
    console.error('Error fetching network data:', error);
    throw error;
  }
};