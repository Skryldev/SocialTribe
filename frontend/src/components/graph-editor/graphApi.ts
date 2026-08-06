import {
  executePlan,
  getGraphStats as sdkGetGraphStats,
} from '../../generated/sdk.gen';
import type {
  ExecutePlanData,
  ExecutePlanResponse as SDKExecutePlanResponse,
} from '../../generated/types.gen';

// ============================================================
// Config
// ============================================================
const API_BASE_URL = 'http://localhost:8080';

// ============================================================
// Logger (بدون تغییر - utility pure)
// ============================================================
const logger = {
  request: (config: any) => {
    const { method, baseURL, url, data } = config;
    console.group('📤 API REQUEST');
    console.log('  Method:', method?.toUpperCase());
    console.log('  URL:', `${baseURL}${url}`);
    console.log('  Timestamp:', new Date().toISOString());
    if (data) {
      const bodyPreview = typeof data === 'string'
        ? data.substring(0, 500)
        : JSON.stringify(data).substring(0, 500);
      console.log('  Body Preview:', bodyPreview);

      if (data.plan) {
        console.log('  Plan Type:', typeof data.plan);
        if (typeof data.plan === 'object' && data.plan !== null) {
          console.log('  Plan Keys:', Object.keys(data.plan).join(', '));
        }
      }
    }
    console.groupEnd();
    return config;
  },

  response: (response: any) => {
    const { status, config, data } = response;
    console.group(`📥 API RESPONSE [${status}]`);
    console.log('  URL:', `${config?.baseURL}${config?.url}`);
    console.log('  Timestamp:', new Date().toISOString());
    console.log('  Status:', status);

    if (data?.success !== undefined) {
      console.log('  Success:', data.success);
    }

    if (data?.data) {
      console.log('  Rows Count:', data.data.rows?.length || 0);
      console.log('  Columns:', data.data.columns);
      console.log('  Statistics:', data.data.statistics);
    }

    if (data?.success === false || data?.error) {
      console.warn('  ⚠️ Response Error:', data?.error || 'Unknown error');
    }

    console.log('  Full Response:', data);
    console.groupEnd();
    return response;
  },

  error: (error: any) => {
    console.group('❌ API ERROR');
    console.log('  Timestamp:', new Date().toISOString());

    if (error.response) {
      const { status, data, config } = error.response;
      console.error('  Status:', status);
      console.error('  URL:', `${config?.baseURL}${config?.url}`);
      console.error('  Response Body:', data);

      if (status === 422 && data?.detail) {
        console.group('  Validation Errors:');
        data.detail.forEach((err: any, i: number) => {
          console.error(`    ${i + 1}. ${err.msg} (${err.type})`);
          console.error(`       Location: ${err.loc?.join(' → ')}`);
        });
        console.groupEnd();
      }
    } else if (error.request) {
      console.error('  Type: Network Error');
      console.error('  Message: No response received from server');
      console.error('  Possible causes:');
      console.error(`    - Server is not running on ${API_BASE_URL}`);
      console.error('    - CORS not enabled on backend');
      console.error('    - Endpoint does not exist');
    } else {
      console.error('  Type: Request Setup Error');
      console.error('  Message:', error.message);
    }

    console.groupEnd();
    return Promise.reject(error);
  }
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
// Types (همان interface های قبلی)
// ============================================================
interface QueryResult {
  success: boolean;
  data?: {
    columns: string[];
    rows: any[];
    statistics: any;
  };
  error?: string;
  status?: number;
}

// ============================================================
// API Functions (همان signature های قبلی)
// ============================================================
export const executeGraphQuery = async (
  originalQuery: string,
  physicalPlan: any
): Promise<QueryResult> => {
  const requestId = `exec_${Date.now()}`;

  try {
    console.log(`\n🚀 [${requestId}] Starting query execution`);
    console.log(`  Query: ${originalQuery.substring(0, 100)}${originalQuery.length > 100 ? '...' : ''}`);

    const requestBody = {
      plan: physicalPlan
    };

    console.log(`  Plan keys: [${Object.keys(physicalPlan || {}).join(', ')}]`);

    const response = await executePlan({
      body: requestBody,
    } as ExecutePlanData);

    const data = extractData(response) as SDKExecutePlanResponse;

    // Logger
    logger.response({
      status: 200,
      config: { baseURL: API_BASE_URL, url: '/graph/query/' },
      data,
    });

    if (data?.success) {
      const { columns, rows, statistics } = data.data || {};
      const rowCount = rows?.length || 0;

      console.log(`✅ [${requestId}] Query executed successfully`);
      console.log(`  Rows returned: ${rowCount}`);
      console.log(`  Columns: [${(columns || []).join(', ') || 'none'}]`);

      if (statistics) {
        console.log(`  Stats:`, {
          scanned: statistics.scanned ?? 'N/A',
          traversed: statistics.traversed ?? 'N/A',
          filtered: statistics.filtered ?? 'N/A',
          executionTime: `${statistics.execution_time_ms ?? 'N/A'}ms`
        });
      }

      return {
        success: true,
        data: {
          columns: columns || [],
          rows: rows || [],
          statistics: statistics || {}
        }
      };
    }

    console.warn(`⚠️ [${requestId}] Backend returned success=false`);
    console.warn(`  Error: ${(data as any)?.error || 'Unknown error'}`);

    return {
      success: false,
      error: (data as any)?.error || 'Backend execution failed'
    };

  } catch (error: any) {
    console.error(`❌ [${requestId}] Query execution failed`);

    if (error?.status === 422 || error?.data?.detail) {
      const details = error.data?.detail || [];
      const errorMessages = details.map((d: any) => `${d.msg} (${d.loc?.join('.')})`).join('; ');
      console.error(`  Validation Errors: ${errorMessages}`);
      return {
        success: false,
        error: `Validation error: ${errorMessages}`,
        status: 422
      };
    }

    if (error?.status) {
      console.error(`  Server responded with status: ${error.status}`);
    }

    return {
      success: false,
      error: error?.data?.detail?.[0]?.msg ||
             error?.data?.error ||
             error?.message,
      status: error?.status,
    };
  }
};

export const explainGraphQuery = async (
  _originalQuery: string,
  physicalPlan: any
): Promise<QueryResult> => {
  try {
    console.log('📊 Requesting query explain plan');

    // Note: /graph/explain endpoint در OpenAPI نیست
    const { default: axios } = await import('axios');
    const { data } = await axios.post(`${API_BASE_URL}/graph/explain`, {
      plan: physicalPlan
    });

    console.log('  Explain result:', data?.explain ? 'Received' : 'Empty');

    return {
      success: true,
      explain: data?.explain,
    } as any;
  } catch (error: any) {
    console.error('❌ Explain query failed:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

export const getGraphSchema = async (): Promise<QueryResult> => {
  try {
    console.log('🔍 Fetching graph schema');

    // Note: /graph/schema endpoint در OpenAPI نیست
    const { default: axios } = await import('axios');
    const { data } = await axios.get(`${API_BASE_URL}/graph/schema`);

    console.log('  Schema received:', data?.schema ? 'Yes' : 'No');

    return {
      success: true,
      schema: data?.schema,
    } as any;
  } catch (error: any) {
    console.error('❌ Failed to fetch schema:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

export const getGraphStats = async (): Promise<QueryResult> => {
  try {
    console.log('📈 Fetching graph statistics');

    const response = await sdkGetGraphStats();
    const data = extractData(response);

    console.log('  Stats received:', data ? 'Yes' : 'No');

    return {
      success: true,
      stats: typeof data === 'string' ? JSON.parse(data) : data,
    } as any;
  } catch (error: any) {
    console.error('❌ Failed to fetch stats:', error.message);
    return {
      success: false,
      error: error?.data?.error || error?.message,
    };
  }
};

export const getApiConfig = (): any => ({
  baseURL: API_BASE_URL,
  timestamp: new Date().toISOString()
});

// ============================================================
// Default Export
// ============================================================
export default {
  get: async (url: string) => {
    const { default: axios } = await import('axios');
    return axios.get(`${API_BASE_URL}${url}`);
  },
  post: async (url: string, data: any) => {
    const { default: axios } = await import('axios');
    return axios.post(`${API_BASE_URL}${url}`, data);
  },
};