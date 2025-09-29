import { performance, PerformanceObserver, PerformanceEntry } from 'node:perf_hooks';
import { EventEmitter } from 'node:events';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { cpus, loadavg, freemem, totalmem } from 'node:os';

export interface PerformanceMetrics {
  system: {
    cpuUsage: NodeJS.CpuUsage;
    memoryUsage: NodeJS.MemoryUsage;
    loadAverage: number[];
    freeMemory: number;
    totalMemory: number;
    uptime: number;
  };
  application: {
    requestCount: number;
    errorCount: number;
    activeConnections: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number; // requests per second
  };
  database: {
    connectionCount: number;
    queryCount: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  gc: {
    collections: number;
    pauseTime: number;
    heapBefore: number;
    heapAfter: number;
  };
}

export interface AlertThreshold {
  metric: keyof PerformanceMetrics['system'] | keyof PerformanceMetrics['application'];
  value: number;
  comparison: 'gt' | 'lt' | 'eq';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
  severity: AlertThreshold['severity'];
  message: string;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private responseTimes: number[] = [];
  private requestTimestamps: number[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: AlertThreshold[] = [];
  private observers: PerformanceObserver[] = [];
  private intervalId?: NodeJS.Timeout;
  private startTime = Date.now();
  private activeConnections = 0;

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.setupPerformanceObservers();
    this.setupDefaultThresholds();
    this.startMonitoring();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      system: {
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        loadAverage: loadavg(),
        freeMemory: freemem(),
        totalMemory: totalmem(),
        uptime: process.uptime()
      },
      application: {
        requestCount: 0,
        errorCount: 0,
        activeConnections: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0
      },
      database: {
        connectionCount: 0,
        queryCount: 0,
        averageQueryTime: 0,
        slowQueries: 0
      },
      gc: {
        collections: 0,
        pauseTime: 0,
        heapBefore: 0,
        heapAfter: 0
      }
    };
  }

  private setupPerformanceObservers(): void {
    // Observe HTTP requests
    const httpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && entry.name.startsWith('http-request')) {
          this.recordResponseTime(entry.duration);
        }
      }
    });
    httpObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(httpObserver);

    // Observe garbage collection
    const gcObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'gc') {
          this.recordGarbageCollection(entry);
        }
      }
    });
    gcObserver.observe({ entryTypes: ['gc'] });
    this.observers.push(gcObserver);

    // Observe function performance
    const functionObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'function' && entry.duration > 100) {
          this.emit('slowFunction', {
            name: entry.name,
            duration: entry.duration,
            timestamp: new Date()
          });
        }
      }
    });
    functionObserver.observe({ entryTypes: ['function'] });
    this.observers.push(functionObserver);
  }

  private setupDefaultThresholds(): void {
    this.thresholds = [
      {
        metric: 'averageResponseTime',
        value: 1000, // 1 second
        comparison: 'gt',
        severity: 'medium'
      },
      {
        metric: 'averageResponseTime',
        value: 5000, // 5 seconds
        comparison: 'gt',
        severity: 'high'
      },
      {
        metric: 'errorCount',
        value: 100,
        comparison: 'gt',
        severity: 'high'
      },
      {
        metric: 'cpuUsage',
        value: 80,
        comparison: 'gt',
        severity: 'medium'
      },
      {
        metric: 'freeMemory',
        value: 100 * 1024 * 1024, // 100MB
        comparison: 'lt',
        severity: 'high'
      }
    ];
  }

  private startMonitoring(): void {
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
      this.calculateApplicationMetrics();
      this.checkThresholds();
      this.cleanupOldData();
    }, 10000); // Every 10 seconds
  }

  private collectSystemMetrics(): void {
    this.metrics.system = {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      loadAverage: loadavg(),
      freeMemory: freemem(),
      totalMemory: totalmem(),
      uptime: process.uptime()
    };
  }

  private calculateApplicationMetrics(): void {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute

    // Filter recent request timestamps
    this.requestTimestamps = this.requestTimestamps.filter(timestamp =>
      now - timestamp < timeWindow
    );

    // Calculate throughput (requests per second)
    this.metrics.application.throughput = this.requestTimestamps.length / 60;

    // Calculate response time percentiles
    if (this.responseTimes.length > 0) {
      const sorted = [...this.responseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);

      this.metrics.application.p95ResponseTime = sorted[p95Index] || 0;
      this.metrics.application.p99ResponseTime = sorted[p99Index] || 0;
      this.metrics.application.averageResponseTime =
        sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
    }

    this.metrics.application.activeConnections = this.activeConnections;
  }

  private recordResponseTime(duration: number): void {
    this.responseTimes.push(duration);
    this.requestTimestamps.push(Date.now());

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  private recordGarbageCollection(entry: PerformanceEntry): void {
    this.metrics.gc.collections++;
    this.metrics.gc.pauseTime += entry.duration;

    // Emit GC alert if pause time is significant
    if (entry.duration > 100) { // 100ms pause
      this.emit('longGcPause', {
        duration: entry.duration,
        kind: (entry as any).kind,
        timestamp: new Date()
      });
    }
  }

  private checkThresholds(): void {
    for (const threshold of this.thresholds) {
      const value = this.getMetricValue(threshold.metric);
      if (value === undefined) continue;

      let violated = false;
      switch (threshold.comparison) {
        case 'gt':
          violated = value > threshold.value;
          break;
        case 'lt':
          violated = value < threshold.value;
          break;
        case 'eq':
          violated = value === threshold.value;
          break;
      }

      if (violated) {
        this.createAlert(threshold, value);
      }
    }
  }

  private getMetricValue(metric: string): number | undefined {
    const parts = metric.split('.');
    let value: any = this.metrics;

    for (const part of parts) {
      value = value?.[part];
    }

    // Handle special cases for CPU usage percentage
    if (metric === 'cpuUsage') {
      const cpuCount = cpus().length;
      const usage = this.metrics.system.cpuUsage;
      return ((usage.user + usage.system) / (cpuCount * 1000000)) * 100;
    }

    return typeof value === 'number' ? value : undefined;
  }

  private createAlert(threshold: AlertThreshold, value: number): void {
    const alertId = `${threshold.metric}-${Date.now()}`;

    // Check if similar alert was already created recently
    const recentAlert = this.alerts.find(alert =>
      alert.metric === threshold.metric.toString() &&
      Date.now() - alert.timestamp.getTime() < 300000 // 5 minutes
    );

    if (recentAlert) return; // Don't spam alerts

    const alert: PerformanceAlert = {
      id: alertId,
      timestamp: new Date(),
      metric: threshold.metric.toString(),
      value,
      threshold: threshold.value,
      severity: threshold.severity,
      message: this.generateAlertMessage(threshold, value)
    };

    this.alerts.push(alert);
    this.emit('performanceAlert', alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private generateAlertMessage(threshold: AlertThreshold, value: number): string {
    const comparisonText = {
      gt: 'exceeded',
      lt: 'below',
      eq: 'equals'
    }[threshold.comparison];

    return `Performance metric ${threshold.metric} ${comparisonText} threshold: ${value} vs ${threshold.value}`;
  }

  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - 3600000;

    // Clean up old response times
    this.responseTimes = this.responseTimes.slice(-1000);

    // Clean up old request timestamps
    this.requestTimestamps = this.requestTimestamps.filter(timestamp =>
      timestamp > oneHourAgo
    );

    // Clean up old alerts
    this.alerts = this.alerts.filter(alert =>
      Date.now() - alert.timestamp.getTime() < 86400000 // 24 hours
    );
  }

  /**
   * Integrate with Fastify server for automatic monitoring
   */
  public integrateWithFastify(server: FastifyInstance): void {
    // Track request lifecycle
    server.addHook('onRequest', async (request, reply) => {
      this.activeConnections++;
      this.metrics.application.requestCount++;

      const requestId = `http-request-${Date.now()}-${Math.random()}`;
      (request as any).performanceId = requestId;
      performance.mark(`${requestId}-start`);
    });

    server.addHook('onResponse', async (request, reply) => {
      this.activeConnections--;

      const requestId = (request as any).performanceId;
      if (requestId) {
        performance.mark(`${requestId}-end`);
        performance.measure(requestId, `${requestId}-start`, `${requestId}-end`);
      }
    });

    server.addHook('onError', async (request, reply, error) => {
      this.metrics.application.errorCount++;
      this.emit('requestError', {
        error: error.message,
        url: request.url,
        method: request.method,
        timestamp: new Date()
      });
    });

    console.log('Performance monitoring integrated with Fastify');
  }

  /**
   * Add custom performance thresholds
   */
  public addThreshold(threshold: AlertThreshold): void {
    this.thresholds.push(threshold);
  }

  /**
   * Remove performance threshold
   */
  public removeThreshold(metric: string): void {
    this.thresholds = this.thresholds.filter(t => t.metric !== metric);
  }

  /**
   * Record database query performance
   */
  public recordDatabaseQuery(duration: number, isSlowQuery: boolean = false): void {
    this.metrics.database.queryCount++;

    // Update average query time using exponential moving average
    const alpha = 0.1;
    this.metrics.database.averageQueryTime =
      (1 - alpha) * this.metrics.database.averageQueryTime + alpha * duration;

    if (isSlowQuery || duration > 1000) { // Queries taking more than 1 second
      this.metrics.database.slowQueries++;
      this.emit('slowQuery', { duration, timestamp: new Date() });
    }
  }

  /**
   * Update database connection count
   */
  public updateDatabaseConnections(count: number): void {
    this.metrics.database.connectionCount = count;
  }

  /**
   * Generate performance report
   */
  public generateReport(): {
    metrics: PerformanceMetrics;
    alerts: PerformanceAlert[];
    recommendations: string[];
    uptime: number;
  } {
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (this.metrics.application.averageResponseTime > 1000) {
      recommendations.push('Consider optimizing slow API endpoints');
    }

    if (this.metrics.system.memoryUsage.heapUsed / this.metrics.system.memoryUsage.heapTotal > 0.8) {
      recommendations.push('High memory usage detected - consider memory optimization');
    }

    if (this.metrics.application.errorCount > 10) {
      recommendations.push('High error rate - investigate error patterns');
    }

    if (this.metrics.database.slowQueries > 5) {
      recommendations.push('Multiple slow database queries detected - optimize queries or add indexes');
    }

    const cpuUsagePercent = this.getMetricValue('cpuUsage') || 0;
    if (cpuUsagePercent > 70) {
      recommendations.push('High CPU usage - consider load balancing or code optimization');
    }

    return {
      metrics: this.metrics,
      alerts: this.alerts.slice(-20), // Last 20 alerts
      recommendations,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get real-time metrics
   */
  public getCurrentMetrics(): PerformanceMetrics {
    this.collectSystemMetrics();
    this.calculateApplicationMetrics();
    return { ...this.metrics };
  }

  /**
   * Start profiling a function
   */
  public startProfiling(name: string): () => void {
    const startMark = `${name}-start`;
    performance.mark(startMark);

    return () => {
      const endMark = `${name}-end`;
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);
    };
  }

  /**
   * Profile an async function
   */
  public async profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endProfiling = this.startProfiling(name);
    try {
      const result = await fn();
      return result;
    } finally {
      endProfiling();
    }
  }

  /**
   * Cleanup and stop monitoring
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    for (const observer of this.observers) {
      observer.disconnect();
    }

    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();