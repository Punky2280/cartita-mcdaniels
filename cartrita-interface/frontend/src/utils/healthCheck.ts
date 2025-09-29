/**
 * Cartrita Interface - Health Check System
 * Comprehensive application health monitoring with automatic recovery
 */

import { logger } from './logger';
import { apiClient } from '@/services/api';
import { HealthCheckStatus } from '@/types';

export interface HealthCheckConfig {
  checkInterval: number;
  timeoutMs: number;
  retryAttempts: number;
  retryDelay: number;
  endpoints: {
    api: string;
    database: string;
    external?: string[];
  };
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  uptime: number;
  lastCheck: Date;
}

class HealthChecker {
  private config: HealthCheckConfig;
  private checkInterval?: NodeJS.Timeout;
  private listeners: ((status: SystemHealth) => void)[] = [];
  private lastStatus?: SystemHealth;
  private startTime: number = Date.now();

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = {
      checkInterval: 30000, // 30 seconds
      timeoutMs: 5000, // 5 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      endpoints: {
        api: '/health',
        database: '/health/database',
        external: ['/health/external'],
      },
      ...config,
    };
  }

  public start(): void {
    logger.info('Starting health check system', {
      interval: this.config.checkInterval,
      timeout: this.config.timeoutMs,
    });

    // Perform initial check
    this.performHealthCheck();

    // Set up recurring checks
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    logger.info('Health check system stopped');
  }

  public addListener(callback: (status: SystemHealth) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async performHealthCheck(): Promise<void> {
    logger.debug('Performing health check');

    const checks: HealthCheckResult[] = [];

    // Check API health
    checks.push(await this.checkEndpoint('api', this.config.endpoints.api));

    // Check database health
    checks.push(await this.checkEndpoint('database', this.config.endpoints.database));

    // Check external services
    if (this.config.endpoints.external) {
      for (const endpoint of this.config.endpoints.external) {
        checks.push(await this.checkEndpoint('external', endpoint));
      }
    }

    // Additional checks
    checks.push(this.checkBrowserHealth());
    checks.push(this.checkNetworkHealth());
    checks.push(this.checkLocalStorageHealth());

    const systemHealth: SystemHealth = {
      overall: this.calculateOverallHealth(checks),
      checks,
      uptime: Date.now() - this.startTime,
      lastCheck: new Date(),
    };

    this.handleHealthUpdate(systemHealth);
  }

  private async checkEndpoint(serviceName: string, endpoint: string): Promise<HealthCheckResult> {
    const startTime = performance.now();

    try {
      const response = await this.withTimeout(
        apiClient.get(endpoint),
        this.config.timeoutMs
      );

      const responseTime = performance.now() - startTime;

      return {
        service: serviceName,
        status: response.success ? 'healthy' : 'degraded',
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  private checkBrowserHealth(): HealthCheckResult {
    const startTime = performance.now();

    try {
      // Check critical browser APIs
      const criticalAPIs = [
        'localStorage',
        'sessionStorage',
        'fetch',
        'Promise',
        'URL',
        'FormData',
      ];

      const missingAPIs = criticalAPIs.filter(api => !(api in window));

      if (missingAPIs.length > 0) {
        return {
          service: 'browser',
          status: 'degraded',
          responseTime: performance.now() - startTime,
          error: `Missing APIs: ${missingAPIs.join(', ')}`,
          timestamp: new Date(),
        };
      }

      // Check memory usage (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        if (usageRatio > 0.9) {
          return {
            service: 'browser',
            status: 'degraded',
            responseTime: performance.now() - startTime,
            error: `High memory usage: ${Math.round(usageRatio * 100)}%`,
            timestamp: new Date(),
          };
        }
      }

      return {
        service: 'browser',
        status: 'healthy',
        responseTime: performance.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'browser',
        status: 'unhealthy',
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  private checkNetworkHealth(): HealthCheckResult {
    const startTime = performance.now();

    try {
      // Check navigator.onLine (basic network connectivity)
      if (!navigator.onLine) {
        return {
          service: 'network',
          status: 'unhealthy',
          responseTime: performance.now() - startTime,
          error: 'Browser reports offline',
          timestamp: new Date(),
        };
      }

      // Check network connection type (if available)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;

        if (connection.effectiveType === 'slow-2g') {
          return {
            service: 'network',
            status: 'degraded',
            responseTime: performance.now() - startTime,
            error: 'Slow network connection detected',
            timestamp: new Date(),
          };
        }
      }

      return {
        service: 'network',
        status: 'healthy',
        responseTime: performance.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'network',
        status: 'unhealthy',
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  private checkLocalStorageHealth(): HealthCheckResult {
    const startTime = performance.now();

    try {
      const testKey = '__aurora_health_check__';
      const testValue = Date.now().toString();

      // Test localStorage read/write
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (retrieved !== testValue) {
        return {
          service: 'localStorage',
          status: 'degraded',
          responseTime: performance.now() - startTime,
          error: 'localStorage read/write test failed',
          timestamp: new Date(),
        };
      }

      // Check storage quota (if available)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          if (estimate.quota && estimate.usage) {
            const usageRatio = estimate.usage / estimate.quota;
            if (usageRatio > 0.9) {
              logger.warn('High storage usage detected', {
                usage: estimate.usage,
                quota: estimate.quota,
                ratio: usageRatio,
              });
            }
          }
        }).catch(() => {
          // Silent fail for storage estimation
        });
      }

      return {
        service: 'localStorage',
        status: 'healthy',
        responseTime: performance.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'localStorage',
        status: 'unhealthy',
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  private calculateOverallHealth(checks: HealthCheckResult[]): SystemHealth['overall'] {
    const healthyCount = checks.filter(check => check.status === 'healthy').length;
    const degradedCount = checks.filter(check => check.status === 'degraded').length;
    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;

    // If any critical service is unhealthy, system is unhealthy
    const criticalServices = ['api', 'database'];
    const criticalUnhealthy = checks.some(
      check => criticalServices.includes(check.service) && check.status === 'unhealthy'
    );

    if (criticalUnhealthy || unhealthyCount > checks.length / 2) {
      return 'unhealthy';
    }

    if (degradedCount > 0 || unhealthyCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  private handleHealthUpdate(systemHealth: SystemHealth): void {
    const prevStatus = this.lastStatus?.overall;
    const currentStatus = systemHealth.overall;

    // Log health status changes
    if (prevStatus && prevStatus !== currentStatus) {
      logger.info('System health status changed', {
        from: prevStatus,
        to: currentStatus,
        checks: systemHealth.checks.map(check => ({
          service: check.service,
          status: check.status,
          error: check.error,
        })),
      });
    }

    // Handle degraded/unhealthy status
    if (currentStatus !== 'healthy') {
      this.handleUnhealthyStatus(systemHealth);
    }

    this.lastStatus = systemHealth;

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(systemHealth);
      } catch (error) {
        logger.warn('Health check listener error', { error });
      }
    });
  }

  private handleUnhealthyStatus(systemHealth: SystemHealth): void {
    const failedChecks = systemHealth.checks.filter(check => check.status !== 'healthy');

    logger.warn('System health degraded or unhealthy', {
      overall: systemHealth.overall,
      failedChecks: failedChecks.map(check => ({
        service: check.service,
        status: check.status,
        error: check.error,
        responseTime: check.responseTime,
      })),
    });

    // Attempt recovery for specific services
    failedChecks.forEach(check => {
      this.attemptServiceRecovery(check);
    });
  }

  private attemptServiceRecovery(check: HealthCheckResult): void {
    logger.info('Attempting service recovery', {
      service: check.service,
      error: check.error,
    });

    switch (check.service) {
      case 'localStorage':
        this.recoverLocalStorage();
        break;
      case 'network':
        this.recoverNetwork();
        break;
      default:
        // For API/database issues, log for manual intervention
        logger.warn('Service recovery not available', {
          service: check.service,
          requiresManualIntervention: true,
        });
    }
  }

  private recoverLocalStorage(): void {
    try {
      // Clear potentially corrupted localStorage data
      const criticalKeys = ['aurora_user_token', 'aurora_settings'];
      const backup: Record<string, string> = {};

      // Backup critical data
      criticalKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          backup[key] = value;
        }
      });

      // Clear localStorage
      localStorage.clear();

      // Restore critical data
      Object.entries(backup).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      logger.info('localStorage recovery completed');
    } catch (error) {
      logger.error('localStorage recovery failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private recoverNetwork(): void {
    // Network recovery is primarily informational
    logger.info('Network recovery: waiting for connection restoration');

    // Listen for online event
    const handleOnline = () => {
      logger.info('Network connection restored');
      window.removeEventListener('online', handleOnline);
      // Trigger immediate health check
      this.performHealthCheck();
    };

    window.addEventListener('online', handleOnline);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  public getLastStatus(): SystemHealth | undefined {
    return this.lastStatus;
  }

  public async checkNow(): Promise<SystemHealth> {
    await this.performHealthCheck();
    return this.lastStatus!;
  }
}

// Create singleton health checker
const healthCheckConfig: Partial<HealthCheckConfig> = {
  checkInterval: import.meta.env.PROD ? 60000 : 30000, // 1 minute in prod, 30s in dev
  endpoints: {
    api: '/api/health',
    database: '/api/health/database',
    external: import.meta.env.VITE_EXTERNAL_HEALTH_ENDPOINTS?.split(',') || [],
  },
};

export const healthChecker = new HealthChecker(healthCheckConfig);

// Note: React Hook for health monitoring - should be moved to hooks directory
// export function useHealthCheck() {
//   const [health, setHealth] = React.useState<SystemHealth | undefined>();
//
//   React.useEffect(() => {
//     return healthChecker.addListener(setHealth);
//   }, []);
//
//   return {
//     health,
//     checkNow: healthChecker.checkNow.bind(healthChecker),
//     start: healthChecker.start.bind(healthChecker),
//     stop: healthChecker.stop.bind(healthChecker),
//   };
// }

export { HealthChecker };
export default healthChecker;