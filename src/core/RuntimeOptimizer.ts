import cluster, { type Worker } from 'node:cluster';
import { cpus } from 'node:os';
import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface RuntimeConfig {
  clustering: {
    enabled: boolean;
    workers: number;
    respawnDelay: number;
    maxRestarts: number;
  };
  memory: {
    maxOldSpaceSize: number;
    gcInterval: number;
    heapSnapshotInterval: number;
  };
  performance: {
    keepAliveTimeout: number;
    headersTimeout: number;
    maxRequestsPerSocket: number;
    connectionTimeout: number;
  };
  monitoring: {
    healthCheckInterval: number;
    metricsCollection: boolean;
    performanceBaseline: boolean;
  };
}

export class RuntimeOptimizer extends EventEmitter {
  private config: RuntimeConfig;
  private workers = new Map<number, Worker>();
  private restartCounts = new Map<number, number>();
  private healthMetrics = {
    startTime: Date.now(),
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };

  constructor(config?: Partial<RuntimeConfig>) {
    super();
    this.config = this.mergeConfig(config);
    this.setupProcessOptimizations();
    this.setupMonitoring();
  }

  private mergeConfig(userConfig?: Partial<RuntimeConfig>): RuntimeConfig {
    const defaultConfig: RuntimeConfig = {
      clustering: {
  enabled: process.env['NODE_ENV'] === 'production',
        workers: Math.min(cpus().length, 4), // Limit to 4 workers max
        respawnDelay: 2000,
        maxRestarts: 5
      },
      memory: {
  maxOldSpaceSize: parseInt(process.env['NODE_MAX_OLD_SPACE_SIZE'] || '2048'),
        gcInterval: 30000, // 30 seconds
        heapSnapshotInterval: 300000 // 5 minutes
      },
      performance: {
        keepAliveTimeout: 65000, // Slightly higher than typical load balancer timeout
        headersTimeout: 66000,
        maxRequestsPerSocket: 1000,
        connectionTimeout: 10000
      },
      monitoring: {
        healthCheckInterval: 10000, // 10 seconds
        metricsCollection: true,
        performanceBaseline: true
      }
    };

    return this.deepMerge(defaultConfig, userConfig || {});
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Setup Node.js process-level optimizations
   */
  private setupProcessOptimizations(): void {
    // Increase event emitter listeners limit
    EventEmitter.defaultMaxListeners = 20;

    // Optimize V8 flags if not already set
    const v8Flags = [
      '--max-old-space-size=' + this.config.memory.maxOldSpaceSize,
      '--optimize-for-size',
      '--gc-interval=' + this.config.memory.gcInterval,
      '--expose-gc'
    ];

    // Set UV_THREADPOOL_SIZE for better I/O performance
    if (!process.env['UV_THREADPOOL_SIZE']) {
      process.env['UV_THREADPOOL_SIZE'] = Math.min(cpus().length * 2, 16).toString();
    }

    // Handle uncaught exceptions gracefully
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.emit('error', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.emit('error', new Error(`Unhandled Rejection: ${reason}`));
    });

    // Handle memory warnings
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning') {
        console.warn('EventEmitter memory leak detected:', warning.message);
        this.emit('memoryWarning', warning);
      }
    });
  }

  /**
   * Setup clustering for production environments
   */
  public setupClustering(): void {
    if (!this.config.clustering.enabled) {
      console.log('Clustering disabled, running in single process mode');
      return;
    }

    if (cluster.isPrimary) {
      console.log(`Primary process ${process.pid} starting ${this.config.clustering.workers} workers`);

      // Fork workers
      for (let i = 0; i < this.config.clustering.workers; i++) {
        this.forkWorker();
      }

      // Handle worker events
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
        this.handleWorkerExit(worker);
      });

      cluster.on('online', (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
        this.workers.set(worker.id, worker);
      });

      // Setup graceful shutdown for primary
      process.on('SIGTERM', () => this.shutdownCluster('SIGTERM'));
      process.on('SIGINT', () => this.shutdownCluster('SIGINT'));

    } else {
      // Worker process - setup worker-specific optimizations
      this.setupWorkerOptimizations();
    }
  }

  private forkWorker(): Worker {
    const worker = cluster.fork();
    this.workers.set(worker.id, worker);
    this.restartCounts.set(worker.id, 0);
    return worker;
  }

  private handleWorkerExit(worker: Worker): void {
    this.workers.delete(worker.id);

    const restartCount = this.restartCounts.get(worker.id) || 0;
    if (restartCount < this.config.clustering.maxRestarts) {
      console.log(`Restarting worker ${worker.id} (attempt ${restartCount + 1})`);
      this.restartCounts.set(worker.id, restartCount + 1);

      setTimeout(() => {
        this.forkWorker();
      }, this.config.clustering.respawnDelay);
    } else {
      console.error(`Worker ${worker.id} exceeded maximum restart attempts`);
      this.emit('workerExhausted', worker.id);
    }
  }

  private setupWorkerOptimizations(): void {
    // Worker-specific memory monitoring
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      // Force GC if heap usage is high (if available)
      if (global.gc && heapUsedMB > this.config.memory.maxOldSpaceSize * 0.8) {
        console.log(`Worker ${process.pid}: Forcing garbage collection (heap: ${heapUsedMB}MB)`);
        global.gc();
      }

      this.emit('memoryUpdate', { heapUsed: heapUsedMB, heapTotal: heapTotalMB });
    }, this.config.memory.gcInterval);
  }

  /**
   * Optimize Fastify server configuration
   */
  public optimizeFastifyServer(server: FastifyInstance): void {
    // Set server timeouts
    server.server.keepAliveTimeout = this.config.performance.keepAliveTimeout;
    server.server.headersTimeout = this.config.performance.headersTimeout;
    server.server.maxRequestsPerSocket = this.config.performance.maxRequestsPerSocket;
    server.server.timeout = this.config.performance.connectionTimeout;

    // Add connection limits per IP
  const connectionTracker = new Map<string, number>();
  const requestStartTimes = new WeakMap<FastifyRequest, number>();

    server.addHook('onRequest', async (request, reply) => {
      const clientIP = request.ip;
  const connections = connectionTracker.get(clientIP) || 0;

      if (connections > 100) { // Max 100 concurrent connections per IP
        reply.code(429).send({ error: 'Too many connections from this IP' });
        return;
      }

  connectionTracker.set(clientIP, connections + 1);
  requestStartTimes.set(request, performance.now());
      this.healthMetrics.requestCount++;
    });

    server.addHook('onResponse', async (request, reply) => {
      const clientIP = request.ip;
      const connections = connectionTracker.get(clientIP) || 0;
      connectionTracker.set(clientIP, Math.max(0, connections - 1));

      // Track response times
  const startTime = requestStartTimes.get(request);
  const responseTime = startTime ? performance.now() - startTime : 0;
      this.updateAverageResponseTime(responseTime);
    });

    // Add error tracking
    server.addHook('onError', async (request, reply, error) => {
      this.healthMetrics.errorCount++;
      this.emit('requestError', error);
    });

    console.log('Fastify server optimizations applied');
  }

  private updateAverageResponseTime(responseTime: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.healthMetrics.averageResponseTime =
      (1 - alpha) * this.healthMetrics.averageResponseTime + alpha * responseTime;
  }

  /**
   * Setup comprehensive monitoring
   */
  private setupMonitoring(): void {
    if (!this.config.monitoring.metricsCollection) return;

    setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.healthCheckInterval);

    // Periodic heap snapshots in development
  if (process.env['NODE_ENV'] === 'development' && this.config.monitoring.performanceBaseline) {
      setInterval(() => {
        this.takeHeapSnapshot();
      }, this.config.memory.heapSnapshotInterval);
    }
  }

  private collectMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.healthMetrics.cpuUsage);

    this.healthMetrics.memoryUsage = memUsage;
    this.healthMetrics.cpuUsage = cpuUsage;

    const metrics = {
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024)
        },
        cpuUsage: {
          user: cpuUsage.user / 1000, // Convert to milliseconds
          system: cpuUsage.system / 1000
        }
      },
      application: {
        requestCount: this.healthMetrics.requestCount,
        errorCount: this.healthMetrics.errorCount,
        averageResponseTime: Math.round(this.healthMetrics.averageResponseTime),
        errorRate: this.healthMetrics.requestCount > 0
          ? (this.healthMetrics.errorCount / this.healthMetrics.requestCount) * 100
          : 0
      }
    };

    this.emit('metrics', metrics);

    // Check for memory leaks
    if (memUsage.heapUsed > this.config.memory.maxOldSpaceSize * 1024 * 1024 * 0.9) {
      this.emit('memoryWarning', {
        message: 'High memory usage detected',
        heapUsed: memUsage.heapUsed
      });
    }
  }

  private takeHeapSnapshot(): void {
  if (process.env['NODE_ENV'] !== 'development') return;

    try {
      const v8 = require('v8');
      const fs = require('fs');
      const heapSnapshot = v8.getHeapSnapshot();
      const fileName = `heap-${Date.now()}.heapsnapshot`;
      const file = fs.createWriteStream(fileName);
      heapSnapshot.pipe(file);
      console.log(`Heap snapshot saved: ${fileName}`);
    } catch (error) {
      console.error('Failed to take heap snapshot:', error);
    }
  }

  /**
   * Graceful shutdown handling
   */
  private async shutdownCluster(signal: string): Promise<void> {
    console.log(`Received ${signal}, shutting down cluster gracefully`);

    const shutdownPromises = Array.from(this.workers.values()).map(worker =>
      new Promise<void>((resolve) => {
        worker.send('shutdown');
        worker.on('disconnect', resolve);

        // Force kill after timeout
        setTimeout(() => {
          worker.kill('SIGKILL');
          resolve();
        }, 10000); // 10 second timeout
      })
    );

    try {
      await Promise.all(shutdownPromises);
      console.log('All workers shut down gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during cluster shutdown:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(reason: string): Promise<void> {
    console.log(`Initiating graceful shutdown: ${reason}`);

    try {
      // Give the application 30 seconds to clean up
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);

      this.emit('shutdown', reason);

      // In worker process, disconnect from primary
      if (cluster.isWorker) {
        process.disconnect?.();
      }

      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get current runtime metrics
   */
  public getMetrics() {
    return {
      ...this.healthMetrics,
      config: this.config,
      workers: Array.from(this.workers.keys()),
      isClusterPrimary: cluster.isPrimary,
      processId: process.pid
    };
  }

  /**
   * Update runtime configuration
   */
  public updateConfig(newConfig: Partial<RuntimeConfig>): void {
    this.config = this.deepMerge(this.config, newConfig);
    this.emit('configUpdated', this.config);
  }
}

export const runtimeOptimizer = new RuntimeOptimizer();