/**
 * Aurora Interface - Hooks Index
 * Central export for all custom hooks
 */

export { useHealthCheck } from './useHealthCheck';
export { usePerformance } from './usePerformance';
export { useApiData, clearAllCache, getCacheStats } from './useApiData';

export type { UseHealthCheckReturn } from './useHealthCheck';
export type { UsePerformanceReturn } from './usePerformance';
export type { UseApiDataReturn, UseApiDataOptions } from './useApiData';