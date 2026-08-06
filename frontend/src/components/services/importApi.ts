import {
  importDataset as sdkImportDataset,
  exportGraph,
  getGraphs as sdkGetGraphs,
  switchGraph as sdkSwitchGraph,
  getBackups as sdkGetBackups,
  createBackup as sdkCreateBackup,
  restoreBackup as sdkRestoreBackup,
  deleteBackup as sdkDeleteBackup,
  downloadBackup as sdkDownloadBackup,
} from '../../generated/sdk.gen';
import type {
  ImportDatasetData,
  DeleteBackupData,
  DownloadBackupData,
  CreateBackupData,
  RestoreBackupData,
  SwitchGraphData,
} from '../../generated/types.gen';

// ============================================================
// Config
// ============================================================
const API_BASE = (import.meta as any).env.VITE_API_BASE || 'http://localhost:8080';

// ============================================================
// Logger
// ============================================================
const logger = {
  info: (message: string, data?: any) => {
    console.log(`%c📘 [DownloadBackup] ${message}`, 'color: #3b82f6; font-weight: bold;', data || '');
  },
  success: (message: string, data?: any) => {
    console.log(`%c✅ [DownloadBackup] ${message}`, 'color: #22c55e; font-weight: bold;', data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`%c⚠️ [DownloadBackup] ${message}`, 'color: #eab308; font-weight: bold;', data || '');
  },
  error: (message: string, data?: any) => {
    console.error(`%c❌ [DownloadBackup] ${message}`, 'color: #ef4444; font-weight: bold;', data || '');
  },
  debug: (message: string, data?: any) => {
    console.debug(`%c🔍 [DownloadBackup] ${message}`, 'color: #8b5cf6; font-weight: bold;', data || '');
  },
  divider: () => {
    console.log('%c' + '='.repeat(80), 'color: #6b7280');
  },
  section: (title: string) => {
    console.log(`%c🔹 ${title}`, 'color: #6b7280; font-weight: bold;');
    console.log('%c' + '-'.repeat(60), 'color: #6b7280');
  }
};

// ============================================================
// Helper: Extract data from SDK response with enhanced error
// ============================================================
const extractData = <T>(response: { data?: T; error?: unknown }): T => {
  if (response.error) {
    const error = response.error as any;
    let message = error?.message || 'Something went wrong';
    let details: any = null;

    if (error?.data?.detail) {
      if (typeof error.data.detail === 'string') {
        message = error.data.detail;
      } else if (Array.isArray(error.data.detail)) {
        details = error.data.detail;
        message = error.data.detail.map((d: any) => {
          const field = d.loc ? d.loc.join('.') : 'unknown';
          return `${field}: ${d.msg}`;
        }).join('; ');
      } else if (typeof error.data.detail === 'object') {
        details = error.data.detail;
        message = error.data.detail.msg || error.data.detail.message || message;
      }
    } else if (error?.data?.message) {
      message = error.data.message;
    }

    if (error?.status === 422) {
      console.error('❌ Validation Error:', details || message);
    }

    throw {
      message,
      status: error?.status,
      details,
      originalError: error,
    };
  }

  if (!response.data) throw new Error('No data returned');
  return response.data;
};

// ============================================================
// File Import Functions
// ============================================================
export const importDataset = async (
  file: File,
  options: any = {},
  onProgress?: (percent: number) => void
): Promise<any> => {
  const mode = options.mode || 'switch';

  const response = await sdkImportDataset({
    query: { mode },
    body: {
      file: file as any,
    },
  } as ImportDatasetData);

  if (onProgress) {
    onProgress(100);
  }

  return extractData(response);
};

export const importGraphData = async (
  graphData: any,
  options: any = {},
  onProgress?: (percent: number) => void
): Promise<any> => {
  const jsonString = JSON.stringify({
    nodes: graphData.nodes || [],
    edges: graphData.edges || [],
  });

  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], `graph_${Date.now()}.json`, { type: 'application/json' });

  return importDataset(file, { mode: options.mode || 'switch' }, onProgress);
};

// ============================================================
// Graph Functions
// ============================================================
export const getGraphNetwork = async (): Promise<any> => {
  const response = await exportGraph();
  return extractData(response);
};

export const getGraphs = async (): Promise<any> => {
  const response = await sdkGetGraphs();
  return extractData(response);
};

export const switchGraph = async (graphId: string): Promise<any> => {
  const response = await sdkSwitchGraph({
    path: { graph_id: graphId },
  } as SwitchGraphData);
  return extractData(response);
};

// ============================================================
// Backup Functions
// ============================================================
export const getBackups = async (): Promise<any> => {
  const response = await sdkGetBackups();
  return extractData(response);
};

export const createBackup = async (data: any = {}): Promise<any> => {
  const response = await sdkCreateBackup({
    body: data,
  } as CreateBackupData);
  return extractData(response);
};

export const restoreBackup = async (backupId: string): Promise<any> => {
  const response = await sdkRestoreBackup({
    path: { backup_id: backupId },
  } as RestoreBackupData);
  return extractData(response);
};

export const deleteBackup = async (backupId: string): Promise<any> => {
  const response = await sdkDeleteBackup({
    path: { backup_id: backupId },
  } as DeleteBackupData);
  return extractData(response);
};

// ============================================================
// ✅ نسخه نهایی: Download Backup با تشخیص صحیح Blob
// ============================================================
export const downloadBackup = async (backupId: string): Promise<Blob> => {
  logger.divider();
  logger.section(`DOWNLOAD BACKUP: ${backupId}`);

  try {
    // مرحله ۱: ارسال درخواست
    logger.info('📤 Sending request to SDK...');
    
    const response = await sdkDownloadBackup({
      path: { backup_id: backupId },
    } as DownloadBackupData) as any;

    logger.debug('📦 Full response structure:', response);

    // مرحله ۲: بررسی خطا
    if (response.error) {
      logger.error('Server returned error', response.error);
      const error = response.error as any;
      let message = error?.message || 'Download failed';
      
      if (error?.data?.detail) {
        if (typeof error.data.detail === 'string') {
          message = error.data.detail;
        } else if (Array.isArray(error.data.detail)) {
          message = error.data.detail.map((d: any) => d.msg || d.message).join('; ');
        }
      }
      throw new Error(message);
    }

    // مرحله ۳: بررسی وجود داده
    if (!response.data) {
      logger.error('No data in response');
      throw new Error('No data received from server');
    }

    const rawData = response.data;

    // ============================================================
    // 🎯 تشخیص نوع داده به ترتیب اولویت
    // ============================================================
    
    // ✅ حالت ۱: داده از نوع Blob است (مستقیم)
    if (rawData instanceof Blob) {
      logger.success('✅ Data is Blob directly', {
        size: rawData.size,
        type: rawData.type,
      });
      
      if (rawData.size === 0) {
        throw new Error('Received empty Blob');
      }
      
      logger.success(`✅ Download successful: ${(rawData.size / 1024).toFixed(2)} KB`);
      logger.divider();
      return rawData;
    }

    // ✅ حالت ۲: داده از نوع ArrayBuffer است
    if (rawData instanceof ArrayBuffer) {
      logger.success('✅ Data is ArrayBuffer', {
        size: rawData.byteLength,
      });
      
      if (rawData.byteLength === 0) {
        throw new Error('Received empty ArrayBuffer');
      }
      
      const blob = new Blob([rawData], { type: 'application/gzip' });
      logger.success(`✅ Download successful: ${(blob.size / 1024).toFixed(2)} KB`);
      logger.divider();
      return blob;
    }

    // ✅ حالت ۳: داده از نوع string است
    if (typeof rawData === 'string') {
      logger.info('📄 Processing string data', {
        length: rawData.length,
        preview: rawData.substring(0, 100)
      });
      
      let arrayBuffer: ArrayBuffer;
      
      // بررسی base64
      try {
        const binaryString = atob(rawData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer as ArrayBuffer;
        logger.success('✅ Decoded base64 string');
      } catch {
        // اگر base64 نبود، به عنوان متن ساده
        const encoder = new TextEncoder();
        const bytes = encoder.encode(rawData);
        arrayBuffer = bytes.buffer as ArrayBuffer;
        logger.warn('⚠️ String was not base64, treated as plain text');
      }
      
      const blob = new Blob([arrayBuffer], { type: 'application/gzip' });
      logger.success(`✅ Download successful: ${(blob.size / 1024).toFixed(2)} KB`);
      logger.divider();
      return blob;
    }

    // ✅ حالت ۴: داده از نوع object است (با کلیدهای مختلف)
    if (typeof rawData === 'object' && rawData !== null) {
      logger.info('📦 Processing object data...');
      
      const keys = Object.keys(rawData);
      logger.debug('🔑 Object keys:', keys);

      // بررسی کلیدهای مختلف برای استخراج داده
      const possibleKeys = ['data', 'content', 'result', 'file', 'blob', 'body', 'value'];
      
      for (const key of possibleKeys) {
        if (key in rawData) {
          const value = rawData[key];
          
          // اگر مقدار Blob باشد
          if (value instanceof Blob) {
            logger.success(`✅ Extracted Blob from key: "${key}"`, {
              size: value.size,
              type: value.type,
            });
            if (value.size === 0) {
              throw new Error(`Extracted Blob from "${key}" is empty`);
            }
            logger.success(`✅ Download successful: ${(value.size / 1024).toFixed(2)} KB`);
            logger.divider();
            return value;
          }
          
          // اگر مقدار string باشد
          if (typeof value === 'string') {
            logger.info(`📄 Extracted string from key: "${key}"`, {
              length: value.length,
            });
            
            let arrayBuffer: ArrayBuffer;
            try {
              const binaryString = atob(value);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              arrayBuffer = bytes.buffer as ArrayBuffer;
              logger.success('✅ Decoded base64 from extracted string');
            } catch {
              const encoder = new TextEncoder();
              const bytes = encoder.encode(value);
              arrayBuffer = bytes.buffer as ArrayBuffer;
              logger.warn('⚠️ Extracted string was not base64');
            }
            
            const blob = new Blob([arrayBuffer], { type: 'application/gzip' });
            logger.success(`✅ Download successful: ${(blob.size / 1024).toFixed(2)} KB`);
            logger.divider();
            return blob;
          }
          
          // اگر مقدار ArrayBuffer باشد
          if (value instanceof ArrayBuffer) {
            logger.success(`✅ Extracted ArrayBuffer from key: "${key}"`, {
              size: value.byteLength,
            });
            const blob = new Blob([value], { type: 'application/gzip' });
            logger.success(`✅ Download successful: ${(blob.size / 1024).toFixed(2)} KB`);
            logger.divider();
            return blob;
          }
        }
      }
      
      // اگر هیچ کلید معروفی پیدا نشد، کل object را به JSON تبدیل کن
      try {
        const jsonString = JSON.stringify(rawData);
        logger.warn('⚠️ No known key found, converting entire object to JSON', {
          length: jsonString.length,
        });
        
        const encoder = new TextEncoder();
        const bytes = encoder.encode(jsonString);
        const blob = new Blob([bytes], { type: 'application/gzip' });
        logger.success(`✅ Download successful: ${(blob.size / 1024).toFixed(2)} KB`);
        logger.divider();
        return blob;
      } catch (e) {
        logger.error('Failed to process object', e);
        throw new Error(`Cannot extract data from object. Keys: ${keys.join(', ')}`);
      }
    }

    // ❌ نوع داده نامشخص
    logger.error('❌ Unsupported data type:', {
      type: typeof rawData,
      constructor: rawData?.constructor?.name,
      value: rawData
    });
    throw new Error(`Unsupported data type: ${typeof rawData}`);

  } catch (error) {
    logger.error('Download failed:', error);
    logger.divider();
    throw error;
  }
};

// ============================================================
// Other Functions
// ============================================================
export const fetchSavedGraphs = async (): Promise<any> => {
  const { default: axios } = await import('axios');
  const { data } = await axios.get(`${API_BASE}/api/saved-graphs`);
  return data;
};