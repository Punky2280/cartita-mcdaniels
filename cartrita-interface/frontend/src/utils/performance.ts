/**
 * Cartrita Interface - Performance Monitoring System
 * Comprehensive performance tracking for Core Web Vitals and custom metrics
 */

import { logger } from './logger';
import { PerformanceMetrics } from '@/types';

export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'FPS';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

export interface CustomMetric {
  name: string;
  value: number;
  timestamp: Date;
  category: 'render' | 'api' | 'user-interaction' | 'resource';
  metadata?: Record<string, unknown>;
}

export interface PerformanceConfig {
  enableWebVitals: boolean;
  enableCustomMetrics: boolean;
  enableResourceTiming: boolean;
  enableNavigationTiming: boolean;
  sampleRate: number; // 0-1, for performance sampling
  reportingEndpoint?: string;
}

class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: CustomMetric[] = [];
  private observer?: PerformanceObserver;
  private startTime: number = performance.now();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableWebVitals: true,
      enableCustomMetrics: true,
      enableResourceTiming: true,
      enableNavigationTiming: true,
      sampleRate: 1.0,
      ...config,
    };

    this.init();
  }

  private init(): void {
    if (!this.shouldSample()) {
      logger.debug('Performance monitoring skipped due to sampling rate');
      return;
    }

    this.setupWebVitals();
    this.setupResourceTiming();
    this.setupNavigationTiming();
    this.setupCustomObserver();

    // Set up global reference for debugging
    window.__AURORA_PERFORMANCE_OBSERVER__ = this.observer;
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private setupWebVitals(): void {
    if (!this.config.enableWebVitals || !('PerformanceObserver' in window)) {
      return;
    }

    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry) => {
      this.reportWebVital({
        name: 'LCP',
        value: entry.startTime,
        rating: this.getLCPRating(entry.startTime),
        delta: entry.startTime,
        id: 'lcp',
        navigationType: this.getNavigationType(),
      });
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry) => {
      const fid = entry.processingStart - entry.startTime;
      this.reportWebVital({
        name: 'FID',
        value: fid,
        rating: this.getFIDRating(fid),
        delta: fid,
        id: 'fid',
        navigationType: this.getNavigationType(),
      });
    });

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        this.reportWebVital({
          name: 'CLS',
          value: entry.value,
          rating: this.getCLSRating(entry.value),
          delta: entry.value,
          id: 'cls',
          navigationType: this.getNavigationType(),
        });
      }
    });

    // First Contentful Paint (FCP)
    this.observeMetric('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') {
        this.reportWebVital({
          name: 'FCP',
          value: entry.startTime,
          rating: this.getFCPRating(entry.startTime),
          delta: entry.startTime,
          id: 'fcp',
          navigationType: this.getNavigationType(),
        });
      }
    });
  }

  private setupResourceTiming(): void {
    if (!this.config.enableResourceTiming) return;

    this.observeMetric('resource', (entry) => {
      // Track slow resources
      const duration = entry.responseEnd - entry.startTime;
      if (duration > 1000) { // Resources taking more than 1 second
        this.trackCustomMetric('slow-resource', duration, 'resource', {
          name: entry.name,
          type: entry.initiatorType,
          size: entry.transferSize,
        });
      }
    });
  }

  private setupNavigationTiming(): void {
    if (!this.config.enableNavigationTiming) return;

    this.observeMetric('navigation', (entry) => {
      const ttfb = entry.responseStart - entry.requestStart;
      this.reportWebVital({
        name: 'TTFB',
        value: ttfb,
        rating: this.getTTFBRating(ttfb),
        delta: ttfb,
        id: 'ttfb',
        navigationType: this.getNavigationType(),
      });

      // Track various navigation metrics
      this.trackCustomMetric('dom-complete', entry.domComplete, 'render');
      this.trackCustomMetric('load-complete', entry.loadEventEnd, 'render');
    });
  }

  private setupCustomObserver(): void {
    if (!this.config.enableCustomMetrics) return;

    // Track frame rate
    this.trackFrameRate();

    // Track memory usage (if available)
    this.trackMemoryUsage();
  }

  private observeMetric(type: string, callback: (entry: any) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });

      observer.observe({ type, buffered: true });
    } catch (error) {
      logger.warn(`Failed to observe ${type} metrics`, { error });
    }
  }

  private trackFrameRate(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const trackFrame = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = (frameCount * 1000) / (currentTime - lastTime);
        this.reportWebVital({
          name: 'FPS',
          value: fps,
          rating: fps >= 60 ? 'good' : fps >= 30 ? 'needs-improvement' : 'poor',
          delta: fps,
          id: 'fps',
          navigationType: this.getNavigationType(),
        });

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(trackFrame);
    };

    requestAnimationFrame(trackFrame);
  }

  private trackMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.trackCustomMetric('memory-used', memory.usedJSHeapSize, 'resource', {
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        });
      }, 30000); // Every 30 seconds
    }
  }

  public trackCustomMetric(
    name: string,
    value: number,
    category: CustomMetric['category'] = 'user-interaction',
    metadata?: Record<string, unknown>
  ): void {
    const metric: CustomMetric = {
      name,
      value,
      timestamp: new Date(),
      category,
      metadata,
    };

    this.metrics.push(metric);

    logger.debug('Custom metric tracked', {
      name,
      value,
      category,
      metadata,
    });

    this.reportCustomMetric(metric);
  }

  public markStart(name: string): void {
    performance.mark(`${name}-start`);
  }

  public markEnd(name: string): number {
    const endMark = `${name}-end`;
    performance.mark(endMark);

    const measureName = `${name}-duration`;
    performance.measure(measureName, `${name}-start`, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    const duration = measure.duration;

    this.trackCustomMetric(name, duration, 'render');

    // Clean up marks
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    return duration;
  }

  public async measureAsyncOperation<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.markStart(name);

    try {
      const result = await operation();
      this.markEnd(name);
      return result;
    } catch (error) {
      this.markEnd(name);
      throw error;
    }
  }

  private reportWebVital(metric: WebVitalsMetric): void {
    logger.info('Web Vital metric', metric);

    if (this.config.reportingEndpoint) {
      this.sendToEndpoint('web-vital', metric);
    }
  }

  private reportCustomMetric(metric: CustomMetric): void {
    if (this.config.reportingEndpoint) {
      this.sendToEndpoint('custom-metric', metric);
    }
  }

  private async sendToEndpoint(type: string, data: unknown): Promise<void> {
    if (!this.config.reportingEndpoint) return;

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString(),
          sessionId: logger.getSessionId(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      logger.warn('Failed to send performance data to endpoint', { error });
    }
  }

  private getNavigationType(): WebVitalsMetric['navigationType'] {
    if ('getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      return navigation?.type || 'navigate';
    }
    return 'navigate';
  }

  // Rating functions based on Core Web Vitals thresholds
  private getLCPRating(value: number): WebVitalsMetric['rating'] {
    return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
  }

  private getFIDRating(value: number): WebVitalsMetric['rating'] {
    return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
  }

  private getCLSRating(value: number): WebVitalsMetric['rating'] {
    return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
  }

  private getFCPRating(value: number): WebVitalsMetric['rating'] {
    return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
  }

  private getTTFBRating(value: number): WebVitalsMetric['rating'] {
    return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
  }

  public getMetrics(): CustomMetric[] {
    return [...this.metrics];
  }

  public getPerformanceSummary(): PerformanceMetrics {
    const currentTime = performance.now();
    const loadTime = currentTime - this.startTime;

    return {
      loadTime,
      renderTime: currentTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
      timestamp: new Date(),
    };
  }

  public clearMetrics(): void {
    this.metrics = [];
  }
}

// Create singleton performance monitor
const performanceConfig: Partial<PerformanceConfig> = {
  sampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% sampling in production
  reportingEndpoint: import.meta.env.VITE_PERFORMANCE_ENDPOINT,
};

export const performanceMonitor = new PerformanceMonitor(performanceConfig);

// React Hook for performance tracking
export function usePerformanceTracking() {
  return {
    trackMetric: performanceMonitor.trackCustomMetric.bind(performanceMonitor),
    markStart: performanceMonitor.markStart.bind(performanceMonitor),
    markEnd: performanceMonitor.markEnd.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsyncOperation.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getSummary: performanceMonitor.getPerformanceSummary.bind(performanceMonitor),
  };
}

export { PerformanceMonitor };
export default performanceMonitor;