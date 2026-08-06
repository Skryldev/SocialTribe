import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  findShortestPath,
  findCommonNeighbors,
  getRecommendations,
  getRecommendationDetails,
} from '../../generated/sdk.gen';
import type {
  ShortestPathRequest,
} from '../../generated/types.gen';

// ============================================================
// Query Keys Factory (Senior Pattern)
// ============================================================
export const graphAnalysisKeys = {
  all: ['graph-analysis'] as const,
  shortestPath: (source: string, target: string) =>
    [...graphAnalysisKeys.all, 'shortest-path', source, target] as const,
  commonNeighbors: (source: string, target: string) =>
    [...graphAnalysisKeys.all, 'common-neighbors', source, target] as const,
  recommendations: (userId: string, topK: number) =>
    [...graphAnalysisKeys.all, 'recommendations', userId, topK] as const,
  recommendationDetails: (userId: string, topK: number) =>
    [...graphAnalysisKeys.all, 'recommendation-details', userId, topK] as const,
};

// ============================================================
// Helper: Extract data from SDK response
// ============================================================
const extractData = <T>(response: { data?: T; error?: unknown }): T => {
  if (response.error) throw response.error;
  if (!response.data) throw new Error('No data returned');
  return response.data;
};

// ============================================================
// Helper: Parse JSON string response
// ============================================================
const parseJsonResponse = <T>(data: unknown): T => {
  // اگر داده از نوع string باشد، آن را JSON.parse کن
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('[parseJsonResponse] Failed to parse JSON:', error);
      throw new Error('Invalid JSON response from server');
    }
  }
  // اگر از قبل object است، همان را برگردان
  return data as T;
};

// ============================================================
// Direct API Functions
// ============================================================

/**
 * دریافت کوتاه‌ترین مسیر بین دو گره
 */
export const fetchShortestPath = async (
  sourceId: string,
  targetId: string
): Promise<any> => {
  const response = await findShortestPath({
    body: {
      source_id: sourceId,
      target_id: targetId,
    },
  });
  return extractData(response);
};

/**
 * دریافت همسایه‌های مشترک بین دو گره
 */
export const fetchCommonNeighbors = async (
  sourceId: string,
  targetId: string
): Promise<any> => {
  const response = await findCommonNeighbors({
    body: {
      source_id: sourceId,
      target_id: targetId,
    },
  });
  return extractData(response);
};

// ============================================================
// ✅ اصلاح شده: Recommendations با user_id
// ============================================================

/**
 * دریافت پیشنهادات برای یک کاربر
 */
export const fetchRecommendations = async (
  userId: string,
  topK: number = 10
): Promise<any> => {
  // ✅ اصلاح: استفاده از user_id (نه node_id)
  const response = await getRecommendations({
    path: { user_id: userId },
    query: { top_k: topK },
  });
  
  const data = extractData(response);
  
  // ✅ پاسخ به صورت JSON string است، باید parse شود
  return parseJsonResponse(data);
};

/**
 * دریافت جزئیات پیشنهادات برای یک کاربر
 */
export const fetchRecommendationDetails = async (
  userId: string,
  topK: number = 10
): Promise<any> => {
  // ✅ اصلاح: استفاده از user_id (نه node_id)
  const response = await getRecommendationDetails({
    path: { user_id: userId },
    query: { top_k: topK },
  });
  
  const data = extractData(response);
  
  // ✅ پاسخ به صورت JSON string است، باید parse شود
  return parseJsonResponse(data);
};

// ============================================================
// React Query Hooks
// ============================================================

/**
 * Hook برای کوتاه‌ترین مسیر با کش کردن
 */
export const useShortestPath = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, ShortestPathRequest>({
    mutationFn: async (params) => {
      return await fetchShortestPath(params.source_id, params.target_id);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        graphAnalysisKeys.shortestPath(variables.source_id, variables.target_id),
        data
      );
    },
    onError: (error) => {
      console.error('[ShortestPath] Failed:', error.message);
    },
  });
};

/**
 * Hook برای همسایه‌های مشترک با کش کردن
 */
export const useCommonNeighbors = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, ShortestPathRequest>({
    mutationFn: async (params) => {
      return await fetchCommonNeighbors(params.source_id, params.target_id);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        graphAnalysisKeys.commonNeighbors(variables.source_id, variables.target_id),
        data
      );
    },
    onError: (error) => {
      console.error('[CommonNeighbors] Failed:', error.message);
    },
  });
};

// ============================================================
// ✅ اصلاح شده: Recommendations Hooks
// ============================================================

interface UseRecommendationsOptions {
  userId: string;
  topK?: number;
  enabled?: boolean;
}

/**
 * Hook برای دریافت پیشنهادات با کش کردن
 */
export const useRecommendations = ({
  userId,
  topK = 10,
  enabled = true,
}: UseRecommendationsOptions) => {
  return useQuery<any, Error>({
    queryKey: graphAnalysisKeys.recommendations(userId, topK),
    queryFn: async () => {
      const result = await fetchRecommendations(userId, topK);
      return result;
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 دقیقه
    gcTime: 30 * 60 * 1000, // 30 دقیقه
    placeholderData: (prev: any | undefined) => prev,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook برای دریافت جزئیات پیشنهادات با کش کردن
 */
export const useRecommendationDetails = ({
  userId,
  topK = 10,
  enabled = false,
}: UseRecommendationsOptions) => {
  return useQuery<any, Error>({
    queryKey: graphAnalysisKeys.recommendationDetails(userId, topK),
    queryFn: async () => {
      const result = await fetchRecommendationDetails(userId, topK);
      return result;
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 دقیقه
    gcTime: 30 * 60 * 1000, // 30 دقیقه
    retry: 2,
    refetchOnWindowFocus: false,
  });
};