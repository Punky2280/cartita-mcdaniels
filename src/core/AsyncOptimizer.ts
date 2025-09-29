import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';

export interface AsyncTask<T = unknown> {
  id: string;
  fn: () => Promise<T>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retries?: number;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  createdAt: number;
}

export interface TaskResult<T = unknown> {
  id: string;
  success: boolean;
  result?: T;
  error?: Error;
  executionTime: number;
  retryCount: number;
  priority: AsyncTask['priority'];
}

export interface QueueMetrics {
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  queueWaitTime: number;
  throughput: number; // tasks per second
}

interface WorkerMessage {
  type: 'task' | 'result' | 'error' | 'health';
  taskId?: string;
  data?: unknown;
  error?: string;
}

interface ConcurrencyLimits {
  maxConcurrentTasks: number;
  maxTasksPerWorker: number;
  maxCpuTasks: number;
  maxIOTasks: number;
}

export class AsyncOptimizer extends EventEmitter {
  private taskQueue: Map<string, AsyncTask<any>> = new Map();
  private runningTasks: Map<string, AsyncTask<any>> = new Map();
  private completedTasks: Map<string, TaskResult<any>> = new Map();
  private priorityQueues: Map<AsyncTask['priority'], string[]> = new Map([
    ['critical', []],
    ['high', []],
    ['normal', []],
    ['low', []]
  ]);

  private workers: Worker[] = [];
  private workerPool: Map<number, { worker: Worker; activeTasks: number; lastUsed: number }> = new Map();
  private concurrencyLimits: ConcurrencyLimits;
  private isProcessing = false;

  private metrics: QueueMetrics = {
    totalTasks: 0,
    pendingTasks: 0,
    runningTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    queueWaitTime: 0,
    throughput: 0
  };

  private throughputWindow: Array<{ timestamp: number; count: number }> = [];
  private readonly throughputWindowSize = 60000; // 1 minute window

  constructor(options: {
    maxWorkers?: number;
    maxConcurrentTasks?: number;
    maxTasksPerWorker?: number;
    enableWorkerThreads?: boolean;
  } = {}) {
    super();

    const maxWorkers = options.maxWorkers || Math.min(cpus().length, 4);
    this.concurrencyLimits = {
      maxConcurrentTasks: options.maxConcurrentTasks || maxWorkers * 2,
      maxTasksPerWorker: options.maxTasksPerWorker || 5,
      maxCpuTasks: Math.floor(maxWorkers * 0.8), // Reserve some workers for I/O
      maxIOTasks: maxWorkers * 3 // I/O can handle more concurrency
    };

    if (options.enableWorkerThreads && isMainThread) {
      this.initializeWorkerPool(maxWorkers);
    }

    this.startMetricsCollection();
    this.setupGracefulShutdown();
  }

  private initializeWorkerPool(maxWorkers: number): void {
    for (let i = 0; i < maxWorkers; i++) {
      try {
        const worker = new Worker(__filename, {
          workerData: { isWorker: true }
        });

        worker.on('message', (message: WorkerMessage) => {
          this.handleWorkerMessage(worker, message);
        });

        worker.on('error', (error) => {
          console.error(`Worker ${worker.threadId} error:`, error);
          this.replaceWorker(worker);
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            console.error(`Worker ${worker.threadId} stopped with exit code ${code}`);
            this.replaceWorker(worker);
          }
        });

        this.workerPool.set(worker.threadId, {
          worker,
          activeTasks: 0,
          lastUsed: Date.now()
        });

        this.workers.push(worker);
      } catch (error) {
        console.error('Failed to create worker:', error);
      }
    }

    console.log(`Initialized ${this.workers.length} worker threads for async optimization`);
  }

  private handleWorkerMessage(worker: Worker, message: WorkerMessage): void {
    const workerInfo = this.workerPool.get(worker.threadId);
    if (!workerInfo) return;

    switch (message.type) {
      case 'result':
        if (message.taskId) {
          this.handleTaskCompletion(message.taskId, message.data, null);
          workerInfo.activeTasks = Math.max(0, workerInfo.activeTasks - 1);
        }
        break;

      case 'error':
        if (message.taskId) {
          this.handleTaskCompletion(message.taskId, null, new Error(message.error || 'Worker error'));
          workerInfo.activeTasks = Math.max(0, workerInfo.activeTasks - 1);
        }
        break;

      case 'health':
        workerInfo.lastUsed = Date.now();
        break;
    }
  }

  private replaceWorker(failedWorker: Worker): void {
    try {
      this.workerPool.delete(failedWorker.threadId);
      const index = this.workers.indexOf(failedWorker);
      if (index > -1) {
        this.workers.splice(index, 1);
      }

      // Create replacement worker
      const newWorker = new Worker(__filename, {
        workerData: { isWorker: true }
      });

      newWorker.on('message', (message: WorkerMessage) => {
        this.handleWorkerMessage(newWorker, message);
      });

      this.workerPool.set(newWorker.threadId, {
        worker: newWorker,
        activeTasks: 0,
        lastUsed: Date.now()
      });

      this.workers.push(newWorker);
    } catch (error) {
      console.error('Failed to replace worker:', error);
    }
  }

  /**
   * Add task to the optimized execution queue
   */
  async enqueue<T>(task: Omit<AsyncTask<T>, 'id' | 'createdAt'>): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullTask: AsyncTask<T> = {
      ...task,
      id: taskId,
      createdAt: Date.now()
    };

    this.taskQueue.set(taskId, fullTask);
    this.priorityQueues.get(task.priority)?.push(taskId);
    this.metrics.totalTasks++;
    this.metrics.pendingTasks++;

    this.emit('taskEnqueued', { taskId, priority: task.priority });

    // Start processing if not already running
    if (!this.isProcessing) {
      setImmediate(() => this.processQueue());
    }

    return taskId;
  }

  /**
   * Process tasks with intelligent scheduling and resource optimization
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.hasTasksToProcess() && this.canProcessMoreTasks()) {
        const nextTask = this.getNextTask();
        if (!nextTask) break;

        await this.executeTask(nextTask);
      }
    } finally {
      this.isProcessing = false;

      // Schedule next processing cycle if there are pending tasks
      if (this.hasTasksToProcess()) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  private hasTasksToProcess(): boolean {
    return Array.from(this.priorityQueues.values()).some(queue => queue.length > 0);
  }

  private canProcessMoreTasks(): boolean {
    return this.metrics.runningTasks < this.concurrencyLimits.maxConcurrentTasks;
  }

  private getNextTask(): AsyncTask<any> | null {
    // Process by priority: critical -> high -> normal -> low
    for (const priority of ['critical', 'high', 'normal', 'low'] as const) {
      const queue = this.priorityQueues.get(priority);
      if (queue && queue.length > 0) {
        const taskId = queue.shift()!;
        const task = this.taskQueue.get(taskId);
        if (task) {
          this.taskQueue.delete(taskId);
          return task;
        }
      }
    }
    return null;
  }

  private async executeTask(task: AsyncTask<any>): Promise<void> {
    const startTime = performance.now();
    const queueWaitTime = startTime - task.createdAt;

    this.runningTasks.set(task.id, task);
    this.metrics.runningTasks++;
    this.metrics.pendingTasks--;

    // Update queue wait time metrics
    this.updateQueueWaitTime(queueWaitTime);

    this.emit('taskStarted', {
      taskId: task.id,
      priority: task.priority,
      queueWaitTime
    });

    let retryCount = 0;
    const maxRetries = task.retries || 0;

    while (retryCount <= maxRetries) {
      try {
  let result: unknown;

        if (this.shouldUseWorkerThread(task)) {
          result = await this.executeInWorkerThread(task);
        } else {
          result = await this.executeInMainThread(task);
        }

  this.handleTaskCompletion(task.id, result, null, performance.now() - startTime, retryCount);
        return;

      } catch (error) {
        retryCount++;

        if (retryCount <= maxRetries) {
          const delay = this.calculateRetryDelay(retryCount);
          await this.sleep(delay);
          this.emit('taskRetry', { taskId: task.id, retryCount, error });
        } else {
          this.handleTaskCompletion(task.id, null, error as Error, performance.now() - startTime, retryCount);
          return;
        }
      }
    }
  }

  private shouldUseWorkerThread<T>(task: AsyncTask<T>): boolean {
    // Use worker threads for CPU-intensive tasks or when main thread is busy
    return this.workers.length > 0 &&
           (task.priority === 'critical' || this.getAvailableWorker() !== null);
  }

  private getAvailableWorker(): Worker | null {
    let bestWorker: Worker | null = null;
    let lowestLoad = Infinity;

    for (const [threadId, workerInfo] of this.workerPool) {
      if (workerInfo.activeTasks < this.concurrencyLimits.maxTasksPerWorker) {
        if (workerInfo.activeTasks < lowestLoad) {
          lowestLoad = workerInfo.activeTasks;
          bestWorker = workerInfo.worker;
        }
      }
    }

    return bestWorker;
  }

  private async executeInWorkerThread<T>(task: AsyncTask<T>): Promise<T> {
    const worker = this.getAvailableWorker();
    if (!worker) {
      throw new Error('No available worker threads');
    }

    const workerInfo = this.workerPool.get(worker.threadId)!;
    workerInfo.activeTasks++;

    return new Promise((resolve, reject) => {
      const timeout = task.timeout ? setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
      }, task.timeout) : null;

      const messageHandler = (message: WorkerMessage) => {
        if (message.taskId === task.id) {
          if (timeout) clearTimeout(timeout);
          worker.off('message', messageHandler);

          if (message.type === 'result') {
            resolve(message.data as T);
          } else if (message.type === 'error') {
            reject(new Error(message.error));
          }
        }
      };

      worker.on('message', messageHandler);
      worker.postMessage({
        type: 'task',
        taskId: task.id,
        data: task.fn.toString()
      });
    });
  }

  private async executeInMainThread<T>(task: AsyncTask<T>): Promise<T> {
    if (task.timeout) {
      return Promise.race([
        task.fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
          }, task.timeout);
        })
      ]);
    }

    return task.fn();
  }

  private handleTaskCompletion(
    taskId: string,
    result: unknown,
    error: Error | null,
    executionTime?: number,
    retryCount: number = 0
  ): void {
    const task = this.runningTasks.get(taskId);
    if (!task) return;

    this.runningTasks.delete(taskId);
    this.metrics.runningTasks--;

    const taskResult: TaskResult<any> = {
      id: taskId,
      success: error === null,
      executionTime: executionTime ?? 0,
      retryCount,
      priority: task.priority
    };

    if (result !== null && result !== undefined) {
      taskResult.result = result as TaskResult<any>['result'];
    }

    if (error) {
      taskResult.error = error;
    }

    this.completedTasks.set(taskId, taskResult);

    if (error) {
      this.metrics.failedTasks++;
      if (error) {
        task.onError?.(error);
      }
      this.emit('taskFailed', { taskId, error, retryCount });
    } else {
      this.metrics.completedTasks++;
      task.onSuccess?.(result);
      this.emit('taskCompleted', { taskId, result, executionTime });
    }

    // Update metrics
    this.updateExecutionTimeMetrics(taskResult.executionTime);
    this.updateThroughputMetrics();

    // Clean up old completed tasks (keep last 1000)
    if (this.completedTasks.size > 1000) {
      const oldestTasks = Array.from(this.completedTasks.keys()).slice(0, 100);
      for (const oldTaskId of oldestTasks) {
        this.completedTasks.delete(oldTaskId);
      }
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
    const jitter = Math.random() * 0.1 * baseDelay;
    return baseDelay + jitter;
  }

  private updateExecutionTimeMetrics(executionTime: number): void {
    const totalCompletedAndFailed = this.metrics.completedTasks + this.metrics.failedTasks;
    if (totalCompletedAndFailed > 0) {
      this.metrics.averageExecutionTime =
        (this.metrics.averageExecutionTime * (totalCompletedAndFailed - 1) + executionTime) / totalCompletedAndFailed;
    }
  }

  private updateQueueWaitTime(waitTime: number): void {
    // Exponential moving average for queue wait time
    const alpha = 0.1;
    this.metrics.queueWaitTime =
      (1 - alpha) * this.metrics.queueWaitTime + alpha * waitTime;
  }

  private updateThroughputMetrics(): void {
    const now = Date.now();
    this.throughputWindow.push({ timestamp: now, count: 1 });

    // Remove old entries outside the window
    this.throughputWindow = this.throughputWindow.filter(
      entry => now - entry.timestamp < this.throughputWindowSize
    );

    // Calculate throughput (tasks per second)
    const totalTasks = this.throughputWindow.reduce((sum, entry) => sum + entry.count, 0);
    this.metrics.throughput = totalTasks / (this.throughputWindowSize / 1000);
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.emit('metricsUpdate', this.getMetrics());
    }, 10000); // Every 10 seconds
  }

  /**
   * Batch execute multiple tasks with optimal resource allocation
   */
  async executeBatch<T>(
    tasks: Array<Omit<AsyncTask<T>, 'id' | 'createdAt'>>,
    options: {
      maxConcurrency?: number;
      failFast?: boolean;
      returnPartialResults?: boolean;
    } = {}
  ): Promise<Array<TaskResult<T>>> {
    const { maxConcurrency = this.concurrencyLimits.maxConcurrentTasks, failFast = false } = options;

    const taskIds = await Promise.all(
      tasks.map(task => this.enqueue(task))
    );

    return new Promise((resolve, reject) => {
      const results: Array<TaskResult<T>> = [];
      let completedCount = 0;
      let hasError = false;

      const checkCompletion = () => {
        if (failFast && hasError) {
          reject(new Error('Batch execution failed fast'));
          return;
        }

        if (completedCount === taskIds.length) {
          resolve(results);
        }
      };

      const handleTaskCompletion = (data: { taskId: string }) => {
        const result = this.completedTasks.get(data.taskId);
        if (result) {
          results.push(result as TaskResult<T>);
          completedCount++;
          checkCompletion();
        }
      };

      const handleTaskFailure = (data: { taskId: string }) => {
        const result = this.completedTasks.get(data.taskId);
        if (result) {
          results.push(result as TaskResult<T>);
          hasError = true;
          completedCount++;
          checkCompletion();
        }
      };

      this.on('taskCompleted', handleTaskCompletion);
      this.on('taskFailed', handleTaskFailure);

      // Set up cleanup after completion
      const cleanup = () => {
        this.off('taskCompleted', handleTaskCompletion);
        this.off('taskFailed', handleTaskFailure);
      };

      // Timeout for the entire batch
      setTimeout(() => {
        cleanup();
        if (options.returnPartialResults) {
          resolve(results);
        } else {
          reject(new Error('Batch execution timed out'));
        }
      }, 300000); // 5 minutes timeout
    });
  }

  /**
   * Cancel a pending or running task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    // Check if task is pending
    for (const [priority, queue] of this.priorityQueues) {
      const index = queue.indexOf(taskId);
      if (index > -1) {
        queue.splice(index, 1);
        this.taskQueue.delete(taskId);
        this.metrics.pendingTasks--;
        this.emit('taskCancelled', { taskId, reason: 'pending' });
        return true;
      }
    }

    // Check if task is running (harder to cancel, but we can mark it)
    if (this.runningTasks.has(taskId)) {
      this.emit('taskCancelled', { taskId, reason: 'running' });
      return true;
    }

    return false;
  }

  /**
   * Get current queue and performance metrics
   */
  getMetrics(): QueueMetrics & {
    workerThreads: {
      total: number;
      active: number;
      totalActiveTasks: number;
    };
    priorityQueues: Record<string, number>;
  } {
    const workerStats = {
      total: this.workers.length,
      active: Array.from(this.workerPool.values()).filter(w => w.activeTasks > 0).length,
      totalActiveTasks: Array.from(this.workerPool.values()).reduce((sum, w) => sum + w.activeTasks, 0)
    };

    const priorityQueues = Object.fromEntries(
      Array.from(this.priorityQueues.entries()).map(([priority, queue]) => [priority, queue.length])
    );

    return {
      ...this.metrics,
      workerThreads: workerStats,
      priorityQueues
    };
  }

  /**
   * Graceful shutdown with task completion
   */
  async shutdown(options: { timeout?: number; forceKill?: boolean } = {}): Promise<void> {
    const { timeout = 30000, forceKill = false } = options;

    console.log('Initiating AsyncOptimizer graceful shutdown...');

    // Stop accepting new tasks
    this.isProcessing = false;

    // Wait for running tasks to complete or timeout
    const shutdownPromise = new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.metrics.runningTasks === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    try {
      await Promise.race([
        shutdownPromise,
        this.sleep(timeout)
      ]);
    } catch (error) {
      console.warn('Some tasks may not have completed during graceful shutdown');
    }

    // Terminate worker threads
    for (const worker of this.workers) {
      try {
        if (forceKill) {
          await worker.terminate();
        } else {
          worker.postMessage({ type: 'shutdown' });
          await worker.terminate();
        }
      } catch (error) {
        console.error(`Error terminating worker ${worker.threadId}:`, error);
      }
    }

    this.workers = [];
    this.workerPool.clear();

    console.log('AsyncOptimizer shutdown complete');
  }

  private setupGracefulShutdown(): void {
    const shutdownHandler = () => {
      this.shutdown({ timeout: 10000, forceKill: true }).finally(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Worker thread implementation
if (!isMainThread && workerData?.isWorker) {
  parentPort?.on('message', async (message: WorkerMessage) => {
    if (message.type === 'task' && message.taskId && message.data) {
      try {
        // Reconstruct and execute the function
        const taskFunction = new Function('return ' + message.data)();
        const result = await taskFunction();

        parentPort?.postMessage({
          type: 'result',
          taskId: message.taskId,
          data: result
        });
      } catch (error) {
        parentPort?.postMessage({
          type: 'error',
          taskId: message.taskId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  // Send health check periodically
  setInterval(() => {
    parentPort?.postMessage({ type: 'health' });
  }, 30000);
}

export const asyncOptimizer = new AsyncOptimizer({
  maxWorkers: Math.min(cpus().length, 4),
  maxConcurrentTasks: 20,
  enableWorkerThreads: true
});