import { db } from './connection';
import type { DrizzleConfig } from 'drizzle-orm';

type QueryRow = Record<string, unknown>;
type QueryResult<T extends QueryRow = QueryRow> = T[] | { rows?: T[] };
type RowWith<K extends string> = QueryRow & Partial<Record<K, unknown>>;

const toRows = <T extends QueryRow>(result: QueryResult<T>): T[] => {
  if (Array.isArray(result)) {
    return result;
  }

  if (result.rows && Array.isArray(result.rows)) {
    return result.rows;
  }

  return [];
};

const toInt = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

const toFloat = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

export interface DatabaseMetrics {
  connectionPool: {
    total: number;
    idle: number;
    active: number;
    waiting: number;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
    totalQueries: number;
    cacheHitRatio: number;
  };
  storage: {
    databaseSize: string;
    tablesSizes: Record<string, string>;
    indexSizes: Record<string, string>;
  };
  health: {
    isConnected: boolean;
    uptime: number;
    lastCheck: Date;
    errors: string[];
  };
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: any[];
}

export class DatabaseMonitor {
  private slowQueries: SlowQuery[] = [];
  private queryStats: Map<string, { count: number; totalTime: number }> = new Map();
  private isMonitoring = false;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Monitor query performance every 30 seconds
    setInterval(() => {
      this.collectMetrics().catch(console.error);
    }, 30000);

    // Clean up old slow queries every hour
    setInterval(() => {
      this.cleanupOldQueries();
    }, 3600000);
  }

  async collectMetrics(): Promise<DatabaseMetrics> {
    try {
      const [
        connectionStats,
        performanceStats,
        storageStats,
        healthStats
      ] = await Promise.all([
        this.getConnectionStats(),
        this.getPerformanceStats(),
        this.getStorageStats(),
        this.getHealthStats()
      ]);

      return {
        connectionPool: connectionStats,
        performance: performanceStats,
        storage: storageStats,
        health: healthStats
      };
    } catch (error) {
      console.error('Failed to collect database metrics:', error);
      throw error;
    }
  }

  private async getConnectionStats() {
    try {
      const result = await db.execute<QueryRow>(`
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      const row = toRows<RowWith<'total_connections' | 'idle_connections' | 'active_connections' | 'waiting_connections'>>(result)[0] ?? {};
      return {
        total: toInt(row.total_connections),
        idle: toInt(row.idle_connections),
        active: toInt(row.active_connections),
        waiting: toInt(row.waiting_connections),
      };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return { total: 0, idle: 0, active: 0, waiting: 0 };
    }
  }

  private async getPerformanceStats() {
    try {
      // Get query performance stats
      const queryStatsResult = await db.execute<QueryRow>(`
        SELECT
          calls,
          total_exec_time,
          mean_exec_time,
          query
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY total_exec_time DESC
        LIMIT 100
      `);

      // Get cache hit ratio
      const cacheResult = await db.execute<QueryRow>(`
        SELECT
          CASE
            WHEN blks_hit + blks_read = 0 THEN 0
            ELSE round((blks_hit::numeric / (blks_hit + blks_read)) * 100, 2)
          END as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `);

      const cacheHitRatio = toFloat(toRows<RowWith<'cache_hit_ratio'>>(cacheResult)[0]?.cache_hit_ratio);

      // Calculate aggregated stats
      let totalQueries = 0;
      let totalTime = 0;
      let slowQueries = 0;

      for (const row of toRows<RowWith<'calls' | 'total_exec_time' | 'mean_exec_time'>>(queryStatsResult)) {
        const calls = toInt(row.calls);
        const totalExecTime = toFloat(row.total_exec_time);
        const meanExecTime = toFloat(row.mean_exec_time);

        totalQueries += calls;
        totalTime += totalExecTime;

        // Consider queries slower than 1 second as slow
        if (meanExecTime > 1000) {
          slowQueries += calls;
        }
      }

      const avgQueryTime = totalQueries > 0 ? totalTime / totalQueries : 0;

      return {
        avgQueryTime,
        slowQueries,
        totalQueries,
        cacheHitRatio,
      };
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      return {
        avgQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0,
        cacheHitRatio: 0,
      };
    }
  }

  private async getStorageStats() {
    try {
      // Get database size
      const dbSizeResult = await db.execute<QueryRow>(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
      `);

      // Get table sizes
      const tableSizesResult = await db.execute<QueryRow>(`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      // Get index sizes
      const indexSizesResult = await db.execute<QueryRow>(`
        SELECT
          schemaname,
          indexname,
          pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as size
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC
      `);

  const databaseSize = (toRows<RowWith<'database_size'>>(dbSizeResult)[0]?.database_size as string | undefined) ?? '0 bytes';

      const tablesSizes: Record<string, string> = {};
      for (const row of toRows<RowWith<'tablename' | 'size'>>(tableSizesResult)) {
        const tableName = typeof row.tablename === 'string' ? row.tablename : undefined;
        const size = typeof row.size === 'string' ? row.size : undefined;
        if (tableName && size) {
          tablesSizes[tableName] = size;
        }
      }

      const indexSizes: Record<string, string> = {};
      for (const row of toRows<RowWith<'indexname' | 'size'>>(indexSizesResult)) {
        const indexName = typeof row.indexname === 'string' ? row.indexname : undefined;
        const size = typeof row.size === 'string' ? row.size : undefined;
        if (indexName && size) {
          indexSizes[indexName] = size;
        }
      }

      return {
        databaseSize,
        tablesSizes,
        indexSizes,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        databaseSize: '0 bytes',
        tablesSizes: {},
        indexSizes: {},
      };
    }
  }

  private async getHealthStats() {
    try {
      const startTime = Date.now();
      await db.execute('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Get database uptime
      const uptimeResult = await db.execute<QueryRow>(`
        SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())) as uptime
      `);

  const uptime = toFloat(toRows<RowWith<'uptime'>>(uptimeResult)[0]?.uptime);

      return {
        isConnected: true,
        uptime,
        lastCheck: new Date(),
        errors: [],
      };
    } catch (error) {
      return {
        isConnected: false,
        uptime: 0,
        lastCheck: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private cleanupOldQueries() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.slowQueries = this.slowQueries.filter(query => query.timestamp > cutoff);
  }

  async getSlowQueries(limit = 50): Promise<SlowQuery[]> {
    try {
      const result = await db.execute<QueryRow>(`
        SELECT
          query,
          mean_exec_time as duration,
          last_exec as timestamp
        FROM pg_stat_statements
        WHERE mean_exec_time > 1000  -- Slower than 1 second
        ORDER BY mean_exec_time DESC
        LIMIT ${limit}
      `);

      return toRows<RowWith<'query' | 'duration' | 'timestamp'>>(result).map((row) => {
        const queryText = typeof row.query === 'string' ? row.query : '';
        const duration = toFloat(row.duration);
        const timestampValue = row.timestamp;
        const timestamp = timestampValue instanceof Date
          ? timestampValue
          : new Date(String(timestampValue ?? Date.now()));

        return {
          query: queryText,
          duration,
          timestamp,
        };
      });
    } catch (error) {
      console.error('Failed to get slow queries:', error);
      return [];
    }
  }

  async analyzePerformanceIssues(): Promise<string[]> {
    const issues: string[] = [];

    try {
      const metrics = await this.collectMetrics();

      // Check connection pool utilization
      if (metrics.connectionPool.active / metrics.connectionPool.total > 0.8) {
        issues.push('High connection pool utilization (>80%)');
      }

      // Check cache hit ratio
      if (metrics.performance.cacheHitRatio < 95) {
        issues.push(`Low cache hit ratio: ${metrics.performance.cacheHitRatio}% (should be >95%)`);
      }

      // Check average query time
      if (metrics.performance.avgQueryTime > 100) {
        issues.push(`High average query time: ${metrics.performance.avgQueryTime}ms`);
      }

      // Check for slow queries
      if (metrics.performance.slowQueries > 0) {
        issues.push(`${metrics.performance.slowQueries} slow queries detected`);
      }

      // Check for missing indexes
      const missingIndexes = await this.findMissingIndexes();
      if (missingIndexes.length > 0) {
        issues.push(`Potential missing indexes on: ${missingIndexes.join(', ')}`);
      }

    } catch (error) {
      issues.push(`Failed to analyze performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return issues;
  }

  private async findMissingIndexes(): Promise<string[]> {
    try {
      const result = await db.execute<QueryRow>(`
        SELECT
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname = 'public'
          AND n_distinct > 100  -- High cardinality
          AND correlation < 0.1  -- Low correlation
        ORDER BY n_distinct DESC
      `);

      return toRows<RowWith<'tablename' | 'attname'>>(result)
        .map((row) => ({
          table: typeof row.tablename === 'string' ? row.tablename : null,
          column: typeof row.attname === 'string' ? row.attname : null
        }))
        .filter(({ table, column }) => table && column)
        .map(({ table, column }) => `${table}.${column}`);
    } catch (error) {
      console.error('Failed to find missing indexes:', error);
      return [];
    }
  }

  async optimizeDatabase(): Promise<{ actions: string[]; results: Record<string, any> }> {
    const actions: string[] = [];
    const results: Record<string, any> = {};

    try {
      // Analyze table statistics
      actions.push('Updating table statistics');
      await db.execute('ANALYZE');
      results['analyze'] = 'completed';

      // Reindex if needed
      const indexUsageResult = await db.execute<QueryRow>(`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND schemaname = 'public'
      `);

  const unusedIndexRows = toRows<RowWith<'indexname'>>(indexUsageResult);
      if (unusedIndexRows.length > 0) {
        actions.push('Found unused indexes');
        results['unusedIndexes'] = unusedIndexRows
          .map((row) => (typeof row.indexname === 'string' ? row.indexname : null))
          .filter((name): name is string => Boolean(name));
      }

      // Check for bloated tables
      const bloatResult = await db.execute<QueryRow>(`
        SELECT
          current_database() as database,
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);
      results['largestTables'] = toRows(bloatResult);

    } catch (error) {
      actions.push(`Optimization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { actions, results };
  }
}

// Global monitor instance
export const databaseMonitor = new DatabaseMonitor();

// Health check function for external use
export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details: DatabaseMetrics }> {
  try {
    const metrics = await databaseMonitor.collectMetrics();
    const issues = await databaseMonitor.analyzePerformanceIssues();

    const status = issues.length === 0 && metrics.health.isConnected ? 'healthy' : 'unhealthy';

    return { status, details: metrics };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connectionPool: { total: 0, idle: 0, active: 0, waiting: 0 },
        performance: { avgQueryTime: 0, slowQueries: 0, totalQueries: 0, cacheHitRatio: 0 },
        storage: { databaseSize: '0 bytes', tablesSizes: {}, indexSizes: {} },
        health: {
          isConnected: false,
          uptime: 0,
          lastCheck: new Date(),
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      }
    };
  }
}