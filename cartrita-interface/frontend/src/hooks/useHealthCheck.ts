/**
 * Cartrita Interface - Health Check Hook
 * React hook for monitoring application health
 */

import { useState, useEffect, useCallback } from 'react';

import { healthChecker, type SystemHealth } from '@/utils/healthCheck';

export interface UseHealthCheckReturn {
  health: SystemHealth | undefined;
  isHealthy: boolean;
  isDegraded: boolean;
  isUnhealthy: boolean;
  checkNow: () => Promise<SystemHealth>;
  start: () => void;
  stop: () => void;
}

export const useHealthCheck = (): UseHealthCheckReturn => {
  const [health, setHealth] = useState<SystemHealth | undefined>();

  useEffect(() => {
    const unsubscribe = healthChecker.addListener(setHealth);

    // Start health checking if not already started
    healthChecker.start();

    return () => {
      unsubscribe();
    };
  }, []);

  const checkNow = useCallback(async () => {
    return await healthChecker.checkNow();
  }, []);

  const start = useCallback(() => {
    healthChecker.start();
  }, []);

  const stop = useCallback(() => {
    healthChecker.stop();
  }, []);

  return {
    health,
    isHealthy: health?.overall === 'healthy',
    isDegraded: health?.overall === 'degraded',
    isUnhealthy: health?.overall === 'unhealthy',
    checkNow,
    start,
    stop,
  };
};