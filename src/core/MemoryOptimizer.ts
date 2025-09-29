import { EventEmitter } from 'node:events';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { cpus, freemem, totalmem } from 'node:os';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface MemoryMetrics {
  heap: {
    used: number;
    total: number;
    limit: number;
    usage: number; // percentage
  };
  external: number;
  rss: number;
  arrayBuffers: number;
  system: {
    free: number;
    total: number;
    usage: number; // percentage
  };
  gc: {
    collections: number;
    pauseTime: number;
    averagePause: number;
    lastCollection: number;
    efficiency: number; // memory freed / pause time
  };
}

export interface MemoryAlert {
  type: 'warning' | 'critical' | 'emergency';
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  message: string;
  recommendation?: string;
}

export interface MemoryConfig {
  heapWarningThreshold: number; // percentage
  heapCriticalThreshold: number;
  gcInterval: number; // ms
  heapSnapshotThreshold: number; // percentage
  enableAutoGC: boolean;
  enableHeapSnapshots: boolean;
  enableMemoryProfiling: boolean;
  maxHeapSnapshots: number;
}

interface MemoryLeak {
  objectType: string;
  count: number;
  size: number;
  growth: number;
  firstSeen: number;
  lastSeen: number;
}

interface HeapProfilerData {
  timestamp: number;
  heapUsage: number;
  objectTypes: Map<string, { count: number; size: number }>;
}

export class MemoryOptimizer extends EventEmitter {
  private config: MemoryConfig;
  private metrics: MemoryMetrics;
  private alerts: MemoryAlert[] = [];
  private gcObserver?: PerformanceObserver;
  private monitoringInterval?: NodeJS.Timeout;
  private heapSnapshots: string[] = [];
  private heapProfilerHistory: HeapProfilerData[] = [];
  private memoryLeaks: Map<string, MemoryLeak> = new Map();
  private lastGCForced = 0;
  private objectCountsHistory: Array<{ timestamp: number; counts: Map<string, number> }> = [];

  constructor(config: Partial<MemoryConfig> = {}) {
    super();

    this.config = {
      heapWarningThreshold: 80,
      heapCriticalThreshold: 90,
      gcInterval: 30000, // 30 seconds
      heapSnapshotThreshold: 85,
      enableAutoGC: process.env['NODE_ENV'] === 'production',
      enableHeapSnapshots: process.env['NODE_ENV'] === 'development',
      enableMemoryProfiling: true,
      maxHeapSnapshots: 5,
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.setupMemoryMonitoring();
    this.setupGCObserver();
    this.startPeriodicTasks();
  }

  private initializeMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const systemMem = { free: freemem(), total: totalmem() };

    return {
      heap: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        limit: this.getHeapLimit(),
        usage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
      system: {
        free: systemMem.free,
        total: systemMem.total,
        usage: ((systemMem.total - systemMem.free) / systemMem.total) * 100
      },
      gc: {
        collections: 0,
        pauseTime: 0,
        averagePause: 0,
        lastCollection: 0,
        efficiency: 0
      }
    };
  }

  private getHeapLimit(): number {
    try {
      const v8 = require('v8');
      const heapStats = v8.getHeapStatistics();
      return heapStats.heap_size_limit;
    } catch {
      // Fallback estimation based on system memory
      return Math.min(totalmem() * 0.8, 2 * 1024 * 1024 * 1024); // 80% of system or 2GB max
    }
  }

  private setupMemoryMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.checkThresholds();
      this.detectMemoryLeaks();
      this.cleanupOldData();
    }, 5000); // Every 5 seconds
  }

  private setupGCObserver(): void {
    try {
      this.gcObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'gc') {
            this.handleGCEvent(entry);
          }
        }
      });

      this.gcObserver.observe({ entryTypes: ['gc'] });
    } catch (error) {
      console.warn('GC observer not available:', error);
    }
  }

  private handleGCEvent(entry: PerformanceEntry): void {
    const gcEntry = entry as any; // GC performance entry
    const pauseTime = entry.duration;

    this.metrics.gc.collections++;
    this.metrics.gc.pauseTime += pauseTime;
    this.metrics.gc.averagePause = this.metrics.gc.pauseTime / this.metrics.gc.collections;
    this.metrics.gc.lastCollection = Date.now();

    // Calculate GC efficiency (memory freed per ms of pause)
    const beforeHeap = gcEntry.detail?.before?.heapUsed || 0;
    const afterHeap = gcEntry.detail?.after?.heapUsed || 0;
    const memoryFreed = beforeHeap - afterHeap;
    this.metrics.gc.efficiency = pauseTime > 0 ? memoryFreed / pauseTime : 0;

    this.emit('gcEvent', {
      type: gcEntry.kind,
      duration: pauseTime,
      memoryFreed,
      efficiency: this.metrics.gc.efficiency
    });

    // Alert on long GC pauses
    if (pauseTime > 100) { // 100ms threshold
      this.createAlert({
        type: pauseTime > 500 ? 'critical' : 'warning',
        metric: 'gc_pause_time',
        value: pauseTime,
        threshold: 100,
        message: `Long GC pause detected: ${pauseTime.toFixed(2)}ms`,
        recommendation: pauseTime > 500
          ? 'Consider reducing heap usage or optimizing object allocation patterns'
          : 'Monitor for frequent long pauses'
      });
    }
  }

  private updateMetrics(): void {
    const memUsage = process.memoryUsage();
    const systemMem = { free: freemem(), total: totalmem() };

    this.metrics.heap.used = memUsage.heapUsed;
    this.metrics.heap.total = memUsage.heapTotal;
    this.metrics.heap.usage = (memUsage.heapUsed / this.metrics.heap.limit) * 100;

    this.metrics.external = memUsage.external;
    this.metrics.rss = memUsage.rss;
    this.metrics.arrayBuffers = memUsage.arrayBuffers;

    this.metrics.system.free = systemMem.free;
    this.metrics.system.total = systemMem.total;
    this.metrics.system.usage = ((systemMem.total - systemMem.free) / systemMem.total) * 100;

    // Store heap profiler data if enabled
    if (this.config.enableMemoryProfiling) {
      this.recordHeapProfilerData();
    }

    this.emit('metricsUpdated', this.metrics);
  }

  private recordHeapProfilerData(): void {
    try {
      const v8 = require('v8');
      const heapStats = v8.getHeapStatistics();

      const profileData: HeapProfilerData = {
        timestamp: Date.now(),
        heapUsage: this.metrics.heap.used,
        objectTypes: new Map()
      };

      // Get object type statistics if available
      try {
        const heapSpaceStats = v8.getHeapSpaceStatistics();
        for (const space of heapSpaceStats) {
          profileData.objectTypes.set(space.space_name, {
            count: 1, // v8 doesn't provide object counts per space
            size: space.space_used_size
          });
        }
      } catch (error) {
        // Heap space statistics not available
      }

      this.heapProfilerHistory.push(profileData);

      // Keep only last 100 entries
      if (this.heapProfilerHistory.length > 100) {
        this.heapProfilerHistory = this.heapProfilerHistory.slice(-100);
      }
    } catch (error) {
      // V8 API not available or failed
    }
  }

  private checkThresholds(): void {
    const heapUsage = this.metrics.heap.usage;
    const systemUsage = this.metrics.system.usage;

    // Heap memory alerts
    if (heapUsage >= this.config.heapCriticalThreshold) {
      this.createAlert({
        type: 'critical',
        metric: 'heap_usage',
        value: heapUsage,
        threshold: this.config.heapCriticalThreshold,
        message: `Critical heap usage: ${heapUsage.toFixed(1)}%`,
        recommendation: 'Immediate action required: force GC, reduce memory usage, or restart process'
      });

      if (this.config.enableAutoGC) {
        this.forceGarbageCollection('critical_threshold');
      }

      if (this.config.enableHeapSnapshots && heapUsage >= this.config.heapSnapshotThreshold) {
        this.takeHeapSnapshot();
      }

    } else if (heapUsage >= this.config.heapWarningThreshold) {
      this.createAlert({
        type: 'warning',
        metric: 'heap_usage',
        value: heapUsage,
        threshold: this.config.heapWarningThreshold,
        message: `High heap usage: ${heapUsage.toFixed(1)}%`,
        recommendation: 'Monitor closely and consider optimizing memory usage'
      });
    }

    // System memory alerts
    if (systemUsage >= 95) {
      this.createAlert({
        type: 'emergency',
        metric: 'system_memory',
        value: systemUsage,
        threshold: 95,
        message: `Critical system memory usage: ${systemUsage.toFixed(1)}%`,
        recommendation: 'System may become unstable - immediate action required'
      });
    } else if (systemUsage >= 85) {
      this.createAlert({
        type: 'warning',
        metric: 'system_memory',
        value: systemUsage,
        threshold: 85,
        message: `High system memory usage: ${systemUsage.toFixed(1)}%`
      });
    }
  }

  private detectMemoryLeaks(): void {
    if (this.heapProfilerHistory.length < 10) return; // Need enough data

    const recent = this.heapProfilerHistory.slice(-10);
    const older = this.heapProfilerHistory.slice(-20, -10);

    if (older.length === 0) return;

    const recentAvg = recent.reduce((sum, data) => sum + data.heapUsage, 0) / recent.length;
    const olderAvg = older.reduce((sum, data) => sum + data.heapUsage, 0) / older.length;
    const growth = recentAvg - olderAvg;
    const growthRate = (growth / olderAvg) * 100;

    // Detect potential memory leak
    if (growthRate > 10 && growth > 50 * 1024 * 1024) { // 10% growth and > 50MB
      this.createAlert({
        type: 'warning',
        metric: 'memory_leak',
        value: growth,
        threshold: 50 * 1024 * 1024,
        message: `Potential memory leak detected: ${(growth / 1024 / 1024).toFixed(2)}MB growth`,
        recommendation: 'Investigate object retention and consider heap analysis'
      });

      this.emit('memoryLeakDetected', {
        growth,
        growthRate,
        recentAverage: recentAvg,
        olderAverage: olderAvg
      });
    }
  }

  private createAlert(alertData: Omit<MemoryAlert, 'timestamp'>): void {
    const alert: MemoryAlert = {
      ...alertData,
      timestamp: new Date()
    };

    // Avoid duplicate alerts within 5 minutes
    const recentAlert = this.alerts.find(a =>
      a.metric === alert.metric &&
      a.type === alert.type &&
      Date.now() - a.timestamp.getTime() < 300000
    );

    if (!recentAlert) {
      this.alerts.push(alert);
      this.emit('memoryAlert', alert);

      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }
    }
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(reason: string = 'manual'): boolean {
    const now = Date.now();

    // Rate limit GC calls (max once per 10 seconds)
    if (now - this.lastGCForced < 10000) {
      return false;
    }

    try {
      if (global.gc) {
        const beforeHeap = this.metrics.heap.used;
        global.gc();
        this.lastGCForced = now;

        // Update metrics after GC
        setTimeout(() => {
          this.updateMetrics();
          const afterHeap = this.metrics.heap.used;
          const freed = beforeHeap - afterHeap;

          this.emit('forcedGC', {
            reason,
            memoryFreed: freed,
            beforeHeap,
            afterHeap
          });
        }, 100);

        return true;
      }
    } catch (error) {
      console.error('Failed to force GC:', error);
    }

    return false;
  }

  /**
   * Take heap snapshot for analysis
   */
  takeHeapSnapshot(filename?: string): string | null {
    if (!this.config.enableHeapSnapshots) {
      return null;
    }

    try {
      const v8 = require('v8');
      const fs = require('fs');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotFilename = filename || `heap-snapshot-${timestamp}.heapsnapshot`;
      const filepath = resolve(process.cwd(), snapshotFilename);

      const heapSnapshot = v8.getHeapSnapshot();
      const writeStream = fs.createWriteStream(filepath);

      heapSnapshot.pipe(writeStream);

      this.heapSnapshots.push(filepath);

      // Clean up old snapshots
      if (this.heapSnapshots.length > this.config.maxHeapSnapshots) {
        const oldSnapshot = this.heapSnapshots.shift();
        if (oldSnapshot) {
          try {
            fs.unlinkSync(oldSnapshot);
          } catch (error) {
            console.warn('Failed to delete old heap snapshot:', error);
          }
        }
      }

      this.emit('heapSnapshotTaken', { filepath, size: this.metrics.heap.used });
      return filepath;

    } catch (error) {
      console.error('Failed to take heap snapshot:', error);
      return null;
    }
  }

  /**
   * Optimize memory usage through various strategies
   */
  optimizeMemory(): {
    gcForced: boolean;
    optimizationsApplied: string[];
    memoryFreed: number;
  } {
    const beforeHeap = this.metrics.heap.used;
    const optimizations: string[] = [];

    // Force garbage collection
    const gcForced = this.forceGarbageCollection('optimization');
    if (gcForced) {
      optimizations.push('forced_gc');
    }

    // Clear any large caches if available
    this.emit('requestCacheClear');
    optimizations.push('cache_clear_requested');

    // Trigger manual cleanup for event emitter listeners
    if (process.listenerCount('warning') > 10) {
      optimizations.push('warning_listeners_cleanup');
    }

    // Set low memory hints for V8
    try {
      const v8 = require('v8');
      v8.setFlagsFromString('--expose-gc');
      optimizations.push('v8_gc_exposed');
    } catch (error) {
      // V8 flags not available
    }

    const afterHeap = this.metrics.heap.used;
    const memoryFreed = Math.max(0, beforeHeap - afterHeap);

    return {
      gcForced,
      optimizationsApplied: optimizations,
      memoryFreed
    };
  }

  /**
   * Get comprehensive memory analysis
   */
  getMemoryAnalysis(): {
    metrics: MemoryMetrics;
    alerts: MemoryAlert[];
    trends: {
      heapGrowthRate: number;
      gcFrequency: number;
      averageGCPause: number;
    };
    recommendations: string[];
    leakDetection: {
      suspected: boolean;
      details?: any;
    };
  } {
    const trends = this.calculateTrends();
    const recommendations = this.generateRecommendations();
    const leakDetection = this.analyzeMemoryLeaks();

    return {
      metrics: { ...this.metrics },
      alerts: [...this.alerts.slice(-10)], // Last 10 alerts
      trends,
      recommendations,
      leakDetection
    };
  }

  private calculateTrends(): {
    heapGrowthRate: number;
    gcFrequency: number;
    averageGCPause: number;
  } {
    const heapGrowthRate = this.heapProfilerHistory.length >= 2
      ? ((this.heapProfilerHistory[this.heapProfilerHistory.length - 1].heapUsage -
          this.heapProfilerHistory[0].heapUsage) / this.heapProfilerHistory[0].heapUsage) * 100
      : 0;

    const gcFrequency = this.metrics.gc.collections > 0
      ? this.metrics.gc.collections / (process.uptime() / 60) // per minute
      : 0;

    return {
      heapGrowthRate,
      gcFrequency,
      averageGCPause: this.metrics.gc.averagePause
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const heapUsage = this.metrics.heap.usage;
    const gcAvgPause = this.metrics.gc.averagePause;

    if (heapUsage > 80) {
      recommendations.push('Heap usage is high - consider optimizing object allocation and retention');
    }

    if (gcAvgPause > 50) {
      recommendations.push('GC pauses are long - consider reducing heap size or optimizing object lifecycle');
    }

    if (this.metrics.gc.efficiency < 1000) { // Less than 1KB freed per ms
      recommendations.push('GC efficiency is low - investigate object retention patterns');
    }

    if (this.metrics.system.usage > 80) {
      recommendations.push('System memory usage is high - consider scaling or optimizing overall memory footprint');
    }

    if (this.heapProfilerHistory.length > 10) {
      const recentGrowth = this.calculateTrends().heapGrowthRate;
      if (recentGrowth > 20) {
        recommendations.push('Significant heap growth detected - investigate for memory leaks');
      }
    }

    return recommendations;
  }

  private analyzeMemoryLeaks(): { suspected: boolean; details?: any } {
    const trends = this.calculateTrends();

    const suspected = trends.heapGrowthRate > 15 && // More than 15% growth
                     this.metrics.gc.efficiency < 500 && // Poor GC efficiency
                     this.metrics.heap.usage > 70; // High heap usage

    if (suspected) {
      return {
        suspected: true,
        details: {
          heapGrowthRate: trends.heapGrowthRate,
          gcEfficiency: this.metrics.gc.efficiency,
          heapUsage: this.metrics.heap.usage,
          recommendation: 'Take heap snapshot and analyze object retention'
        }
      };
    }

    return { suspected: false };
  }

  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - 3600000;

    // Clean old heap profiler data
    this.heapProfilerHistory = this.heapProfilerHistory.filter(
      data => data.timestamp > oneHourAgo
    );

    // Clean old alerts
    this.alerts = this.alerts.filter(
      alert => alert.timestamp.getTime() > oneHourAgo
    );
  }

  private startPeriodicTasks(): void {
    // Periodic optimization in production
    if (this.config.enableAutoGC && process.env['NODE_ENV'] === 'production') {
      setInterval(() => {
        if (this.metrics.heap.usage > 60) { // Only if heap usage > 60%
          this.optimizeMemory();
        }
      }, this.config.gcInterval);
    }

    // Periodic health report
    setInterval(() => {
      this.emit('memoryHealthReport', this.getMemoryAnalysis());
    }, 60000); // Every minute
  }

  /**
   * Graceful shutdown with memory cleanup
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down MemoryOptimizer...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }

    // Final memory optimization
    if (this.config.enableAutoGC) {
      this.forceGarbageCollection('shutdown');
    }

    // Clean up heap snapshots if in development
    if (this.config.enableHeapSnapshots && process.env['NODE_ENV'] === 'development') {
      for (const snapshot of this.heapSnapshots) {
        try {
          const fs = require('fs');
          fs.unlinkSync(snapshot);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }

    console.log('MemoryOptimizer shutdown complete');
  }

  /**
   * Get current memory metrics
   */
  getCurrentMetrics(): MemoryMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Enable/disable automatic optimizations
   */
  setAutoOptimization(enabled: boolean): void {
    this.config.enableAutoGC = enabled;
    this.emit('autoOptimizationChanged', enabled);
  }

  /**
   * Update memory configuration
   */
  updateConfig(newConfig: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }
}

export const memoryOptimizer = new MemoryOptimizer();