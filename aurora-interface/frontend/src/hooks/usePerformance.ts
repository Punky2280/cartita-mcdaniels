/**
 * Aurora Interface - Performance Monitoring Hook
 * React hook for tracking performance metrics
 */

import { useCallback, useRef } from 'react';

import { performanceMonitor, type CustomMetric, type PerformanceMetrics } from '@/utils/performance';

export interface UsePerformanceReturn {
  trackMetric: (
    name: string,
    value: number,
    category?: CustomMetric['category'],
    metadata?: Record<string, unknown>
  ) => void;
  startTiming: (name: string) => void;
  endTiming: (name: string) => number;
  measureRender: (componentName: string) => {
    start: () => void;
    end: () => void;
  };
  getMetrics: () => CustomMetric[];
  getSummary: () => PerformanceMetrics;
}

export const usePerformance = (): UsePerformanceReturn => {
  const renderTimers = useRef<Map<string, number>>(new Map());

  const trackMetric = useCallback((
    name: string,
    value: number,
    category: CustomMetric['category'] = 'user-interaction',
    metadata?: Record<string, unknown>
  ) => {
    performanceMonitor.trackCustomMetric(name, value, category, metadata);
  }, []);

  const startTiming = useCallback((name: string) => {
    performanceMonitor.markStart(name);
  }, []);

  const endTiming = useCallback((name: string) => {
    return performanceMonitor.markEnd(name);
  }, []);

  const measureRender = useCallback((componentName: string) => {
    const timerKey = `render-${componentName}`;

    return {
      start: () => {
        renderTimers.current.set(timerKey, performance.now());
      },
      end: () => {
        const startTime = renderTimers.current.get(timerKey);
        if (startTime) {
          const duration = performance.now() - startTime;
          trackMetric(`${componentName}-render`, duration, 'render');
          renderTimers.current.delete(timerKey);
        }
      },
    };
  }, [trackMetric]);

  const getMetrics = useCallback(() => {
    return performanceMonitor.getMetrics();
  }, []);

  const getSummary = useCallback(() => {
    return performanceMonitor.getPerformanceSummary();
  }, []);

  return {
    trackMetric,
    startTiming,
    endTiming,
    measureRender,
    getMetrics,
    getSummary,
  };
};