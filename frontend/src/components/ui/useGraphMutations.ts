import { useCallback, useState } from 'react';
import {
  fetchShortestPath,
  fetchCommonNeighbors,
  fetchRecommendations,
  fetchRecommendationDetails, // ✅ اضافه شده
} from './contextMenuApi';

export function useGraphMutations(): any {
  const [shortestPathLoading, setShortestPathLoading] = useState<boolean>(false);
  const [commonNeighborsLoading, setCommonNeighborsLoading] = useState<boolean>(false);
  const [suggestLoading, setSuggestLoading] = useState<boolean>(false);
  const [suggestDetailsLoading, setSuggestDetailsLoading] = useState<boolean>(false); // ✅ جدید

  const getShortestPath = useCallback(async (sourceId: string, targetId: string) => {
    setShortestPathLoading(true);
    try {
      const result = await fetchShortestPath(sourceId, targetId);
      return result;
    } catch (err) {
      console.error('Shortest path fetch failed:', err);
      throw err;
    } finally {
      setShortestPathLoading(false);
    }
  }, []);

  const getCommonNeighbors = useCallback(async (sourceId: string, targetId: string) => {
    setCommonNeighborsLoading(true);
    try {
      const result = await fetchCommonNeighbors(sourceId, targetId);
      return result;
    } catch (err) {
      console.error('Common neighbors fetch failed:', err);
      throw err;
    } finally {
      setCommonNeighborsLoading(false);
    }
  }, []);

  // ✅ ساده (بدون جزئیات) - برای استفاده‌های دیگر
  const getRecommendations = useCallback(async (userId: string, topK: number = 10) => {
    setSuggestLoading(true);
    try {
      const result = await fetchRecommendations(userId, topK);
      return result;
    } catch (err) {
      console.error('Recommendations fetch failed:', err);
      throw err;
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  // ✅ جدید: دریافت جزئیات پیشنهادات با ساختار کامل
  const getRecommendationDetails = useCallback(async (userId: string, topK: number = 10) => {
    setSuggestDetailsLoading(true);
    try {
      const result = await fetchRecommendationDetails(userId, topK);
      return result;
    } catch (err) {
      console.error('Recommendation details fetch failed:', err);
      throw err;
    } finally {
      setSuggestDetailsLoading(false);
    }
  }, []);

  return {
    // کوتاه‌ترین مسیر
    getShortestPath,
    shortestPathLoading,
    
    // همسایه‌های مشترک
    getCommonNeighbors,
    commonNeighborsLoading,
    
    // پیشنهادات ساده
    getRecommendations,
    suggestLoading,
    
    // ✅ پیشنهادات با جزئیات کامل (برای SuggestFriendModal)
    getRecommendationDetails,
    suggestDetailsLoading,
  };
}