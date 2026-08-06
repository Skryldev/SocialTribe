import {
  getCurrentLayout,
  applyLayout as sdkApplyLayout,
} from '../../generated/sdk.gen';
import type {
  ApplyLayoutData,
  ApplyLayoutResponse as SDKApplyLayoutResponse,
} from '../../generated/types.gen';

// ============================================================
// Constants (بدون تغییر)
// ============================================================
const BACKEND_TO_INTERNAL: any = {
  'Natural': 'natural',
  'Random Test': 'random',
  'Clean Grid': 'grid',
  'Ring': 'circular',
  'Ego Network': 'radial',
  'Centrality Focus': 'concentric',
  'Publication Ready': 'kamada-kawai',
  'Spread Out': 'force-directed',
  'Tight Clusters': 'force-atlas-2',
  'Community View': 'spectral',
};

const INTERNAL_TO_BACKEND: any = {
  'natural': 'Natural',
  'random': 'Random Test',
  'grid': 'Clean Grid',
  'circular': 'Ring',
  'radial': 'Ego Network',
  'concentric': 'Centrality Focus',
  'kamada-kawai': 'Publication Ready',
  'spectral': 'Community View',
  'force-directed': 'Spread Out',
  'force-atlas-2': 'Tight Clusters',
};

// ============================================================
// Helper
// ============================================================
const extractData = <T>(response: { data?: T; error?: unknown }): T => {
  if (response.error) throw response.error;
  if (!response.data) throw new Error('No data returned');
  return response.data;
};

// ============================================================
// Utility Functions (بدون تغییر)
// ============================================================
export const toBackendName = (internalKey: string): string => {
  return INTERNAL_TO_BACKEND[internalKey] || internalKey;
};

export const toInternalKey = (backendName: string): string => {
  return BACKEND_TO_INTERNAL[backendName] || backendName;
};

// ============================================================
// Types (همان interface های قبلی)
// ============================================================
interface CurrentLayoutResponse {
  algorithm: string | null;
  mode: 'preset' | 'custom';
  params: any;
}

interface ApplyLayoutResponse {
  nodes: any[];
  algorithm: string;
  executionTimeMs: number;
}

// ============================================================
// API Functions (همان signature های قبلی)
// ============================================================
export async function fetchCurrentLayout(): Promise<CurrentLayoutResponse> {
  try {
    const response = await getCurrentLayout();
    const data = extractData(response);

    console.log('📥 [Layout API] Current layout:', data);

    // Parse string response to object
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    return {
      algorithm: toInternalKey(parsed.algorithm) || null,
      mode: parsed.mode || 'preset',
      params: parsed.params || {},
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('cancel')) {
      throw new Error('Request cancelled');
    }

    if (error?.code === 'ECONNABORTED') {
      throw new Error('Request timed out while fetching current layout');
    }

    if (error?.status === 404) {
      throw new Error('Current layout endpoint not found');
    }

    if (error?.status === 500) {
      throw new Error('Server error while fetching current layout');
    }

    if (!error?.status) {
      throw new Error('Network error: Unable to reach layout server');
    }

    const message = error?.message || 'Unknown error';
    throw new Error(`Failed to fetch current layout: ${message}`);
  }
}

export async function syncCurrentLayout(
  internalKey: string,
  mode: 'preset' | 'custom' = 'preset',
  params: any = {}
): Promise<boolean> {
  try {
    const body = {
      algorithm: toBackendName(internalKey),
      mode,
      params: mode === 'preset' ? {} : params,
    };

    console.log('📤 [Layout API] Syncing layout:', body);

    // Note: این تابع فقط log میکنه و API call نداره در نسخه اصلی
    console.log('✅ [Layout API] Layout synced successfully');
    return true;
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('cancel')) {
      console.warn('⚠️ Layout sync cancelled');
      return false;
    }

    console.warn('⚠️ Layout sync failed:', error?.message || 'Unknown error');
    return false;
  }
}

export async function applyLayout(
  internalKey: string,
  params: any = {}
): Promise<ApplyLayoutResponse> {
  try {
    const body = {
      algorithm: toBackendName(internalKey),
      params: params ?? {},
    };

    console.log('📤 [Layout API] Applying layout:', body);

    const response = await sdkApplyLayout({
      body,
    } as ApplyLayoutData);

    const data = extractData(response) as SDKApplyLayoutResponse;

    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('Invalid response: missing nodes array');
    }

    console.log('📥 [Layout API] Layout applied:', {
      algorithm: data.algorithm,
      nodeCount: data.nodes.length,
      executionTimeMs: data.executionTimeMs,
    });

    return {
      nodes: data.nodes,
      algorithm: data.algorithm,
      executionTimeMs: data.executionTimeMs ?? 0,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('cancel')) {
      throw new Error('Layout calculation cancelled');
    }

    if (error?.code === 'ECONNABORTED') {
      throw new Error('Request timed out (30s). Try a simpler layout.');
    }

    if (error?.status === 422) {
      const details = error?.details
        ?.map?.((d: any) => `${d.msg} (${d.loc?.join('.')})`)
        .join(', ') || 'Validation failed';
      throw new Error(`Validation Error: ${details}`);
    }

    if (!error?.status) {
      throw new Error('Network error: Unable to reach layout server');
    }

    const message = error?.message || `${error?.status} Unknown error`;
    throw new Error(message);
  }
}

// ============================================================
// Default Export (همان signature قبلی)
// ============================================================
export default {
  fetchCurrentLayout,
  syncCurrentLayout,
  applyLayout,
  toBackendName,
  toInternalKey,
};