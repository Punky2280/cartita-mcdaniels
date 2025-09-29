/**
 * Cartrita Interface - API Data Hook
 * Generic hook for managing API data with loading, error, and caching states
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@/utils/logger';
import { CartritaApiError } from '@/services/api';
import type { ApiResponse } from '@/types';

export interface UseApiDataOptions<T> {
  immediate?: boolean;
  cacheKey?: string;
  cacheTtl?: number; // Time to live in milliseconds
  retryAttempts?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: CartritaApiError) => void;
}

export interface UseApiDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: CartritaApiError | null;
  execute: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry<unknown>>();

export const useApiData = <T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiDataOptions<T> = {}
): UseApiDataReturn<T> => {
  const {
    immediate = true,
    cacheKey,
    cacheTtl = 5 * 60 * 1000, // 5 minutes default
    retryAttempts = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<CartritaApiError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check cache for existing data
  const getCachedData = useCallback((): T | null => {
    if (!cacheKey) return null;

    const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }, [cacheKey]);

  // Set data in cache
  const setCachedData = useCallback((newData: T): void => {
    if (!cacheKey) return;

    cache.set(cacheKey, {
      data: newData,
      timestamp: Date.now(),
      ttl: cacheTtl,
    });
  }, [cacheKey, cacheTtl]);

  // Execute API call with retry logic
  const executeWithRetry = useCallback(async (attempt = 1): Promise<void> => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = await apiCall();

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setData(response.data);
      setError(null);
      setCachedData(response.data);

      logger.debug('API data loaded successfully', {
        cacheKey,
        attempt,
        dataSize: JSON.stringify(response.data).length,
      });

      onSuccess?.(response.data);
    } catch (err) {
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const apiError = err instanceof CartritaApiError ? err : new CartritaApiError(
        err instanceof Error ? err.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );

      logger.warn('API call failed', {
        error: apiError.message,
        attempt,
        maxAttempts: retryAttempts + 1,
        cacheKey,
      });

      // Retry logic
      if (attempt <= retryAttempts) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff

        logger.info('Retrying API call', {
          attempt: attempt + 1,
          delay,
          cacheKey,
        });

        retryTimeoutRef.current = setTimeout(() => {
          executeWithRetry(attempt + 1);
        }, delay);

        return;
      }

      // All attempts failed
      setError(apiError);
      onError?.(apiError);

      logger.error('API call failed after all retries', apiError, {
        attempts: attempt,
        cacheKey,
      });
    }
  }, [apiCall, retryAttempts, retryDelay, cacheKey, setCachedData, onSuccess, onError]);

  // Main execute function
  const execute = useCallback(async (): Promise<void> => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setData(cachedData);
      setError(null);
      logger.debug('Using cached data', { cacheKey });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await executeWithRetry();
    } finally {
      setLoading(false);
    }
  }, [executeWithRetry, getCachedData, cacheKey]);

  // Refresh function (bypasses cache)
  const refresh = useCallback(async (): Promise<void> => {
    if (cacheKey) {
      cache.delete(cacheKey);
    }

    setLoading(true);
    setError(null);

    try {
      await executeWithRetry();
    } finally {
      setLoading(false);
    }
  }, [executeWithRetry, cacheKey]);

  // Clear error
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Clear cache
  const clearCache = useCallback((): void => {
    if (cacheKey) {
      cache.delete(cacheKey);
    }
  }, [cacheKey]);

  // Cleanup function
  const cleanup = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Effect for immediate execution
  useEffect(() => {
    if (immediate) {
      execute();
    }

    return cleanup;
  }, [immediate, execute, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    data,
    loading,
    error,
    execute,
    refresh,
    clearError,
    clearCache,
  };
};

// Utility function to clear all cache
export const clearAllCache = (): void => {
  cache.clear();
  logger.info('All API cache cleared');
};

// Utility function to get cache stats
export const getCacheStats = (): { size: number; keys: string[] } => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
};