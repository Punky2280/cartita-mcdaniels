import { db } from './connection';
import {
  agentExecutions,
  auditLogs,
  workflowExecutions,
  workflowStepExecutions,
  messages,
  documentChunks,
  userSessions
} from './schema';
import { and, lt, sql, eq, gte } from 'drizzle-orm';

type RawQueryResult<T extends Record<string, unknown>> = T[] | { rows?: T[]; rowCount?: number };

const extractRows = <T extends Record<string, unknown>>(result: RawQueryResult<T>): T[] => {
  if (Array.isArray(result)) {
    return result;
  }

  if (result.rows && Array.isArray(result.rows)) {
    return result.rows;
  }

  return [];
};

const extractRowCount = (result: RawQueryResult<Record<string, unknown>>): number => {
  if (Array.isArray(result)) {
    return result.length;
  }

  return typeof result.rowCount === 'number' ? result.rowCount : 0;
};

export interface ArchiveConfig {
  tableName: string;
  retentionDays: number;
  archiveEnabled: boolean;
  compressionEnabled: boolean;
  partitioningEnabled: boolean;
  batchSize: number;
}

export interface ArchiveMetrics {
  totalRecords: number;
  archivedRecords: number;
  deletedRecords: number;
  savedSpaceGB: number;
  executionTimeMs: number;
}

export class DataArchiveManager {
  private archiveConfigs: Map<string, ArchiveConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    // Configure default retention policies
    const defaultConfigs: ArchiveConfig[] = [
      {
        tableName: 'agent_executions',
        retentionDays: 90,
        archiveEnabled: true,
        compressionEnabled: true,
        partitioningEnabled: true,
        batchSize: 1000,
      },
      {
        tableName: 'audit_logs',
        retentionDays: 365, // Keep audit logs for 1 year
        archiveEnabled: true,
        compressionEnabled: true,
        partitioningEnabled: true,
        batchSize: 5000,
      },
      {
        tableName: 'workflow_executions',
        retentionDays: 180,
        archiveEnabled: true,
        compressionEnabled: true,
        partitioningEnabled: true,
        batchSize: 500,
      },
      {
        tableName: 'workflow_step_executions',
        retentionDays: 180,
        archiveEnabled: true,
        compressionEnabled: true,
        partitioningEnabled: true,
        batchSize: 2000,
      },
      {
        tableName: 'messages',
        retentionDays: 730, // Keep messages for 2 years
        archiveEnabled: true,
        compressionEnabled: true,
        partitioningEnabled: true,
        batchSize: 1000,
      },
      {
        tableName: 'document_chunks',
        retentionDays: 365,
        archiveEnabled: true,
        compressionEnabled: true,
        partitioningEnabled: true,
        batchSize: 5000,
      },
      {
        tableName: 'user_sessions',
        retentionDays: 30,
        archiveEnabled: true,
        compressionEnabled: false,
        partitioningEnabled: false,
        batchSize: 10000,
      },
    ];

    for (const config of defaultConfigs) {
      this.archiveConfigs.set(config.tableName, config);
    }
  }

  async setupPartitioning(): Promise<void> {
    console.log('Setting up table partitioning for archival...');

    try {
      // Create partitioned tables for high-volume data
      await this.createPartitionedTable('agent_executions_partitioned', `
        CREATE TABLE IF NOT EXISTS agent_executions_partitioned (
          LIKE agent_executions INCLUDING ALL
        ) PARTITION BY RANGE (started_at);
      `);

      await this.createPartitionedTable('audit_logs_partitioned', `
        CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
          LIKE audit_logs INCLUDING ALL
        ) PARTITION BY RANGE (timestamp);
      `);

      await this.createPartitionedTable('workflow_executions_partitioned', `
        CREATE TABLE IF NOT EXISTS workflow_executions_partitioned (
          LIKE workflow_executions INCLUDING ALL
        ) PARTITION BY RANGE (started_at);
      `);

      await this.createPartitionedTable('messages_partitioned', `
        CREATE TABLE IF NOT EXISTS messages_partitioned (
          LIKE messages INCLUDING ALL
        ) PARTITION BY RANGE (created_at);
      `);

      // Create monthly partitions for the next year
      await this.createMonthlyPartitions();

      console.log('✅ Partitioning setup completed');
    } catch (error) {
      console.error('❌ Failed to setup partitioning:', error);
      throw error;
    }
  }

  private async createPartitionedTable(tableName: string, sql: string): Promise<void> {
    try {
      await db.execute(sql);
      console.log(`✅ Created partitioned table: ${tableName}`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`ℹ️  Partitioned table already exists: ${tableName}`);
      } else {
        throw error;
      }
    }
  }

  private async createMonthlyPartitions(): Promise<void> {
    const tables = [
      'agent_executions_partitioned',
      'audit_logs_partitioned',
      'workflow_executions_partitioned',
      'messages_partitioned'
    ];

    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const startDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);

      const partitionSuffix = `${startDate.getFullYear()}_${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;

      for (const table of tables) {
        const partitionName = `${table}_${partitionSuffix}`;

        try {
          await db.execute(`
            CREATE TABLE IF NOT EXISTS ${partitionName}
            PARTITION OF ${table}
            FOR VALUES FROM ('${startDate.toISOString()}') TO ('${endDate.toISOString()}')
          `);

          console.log(`✅ Created partition: ${partitionName}`);
        } catch (error: any) {
          if (!error.message?.includes('already exists')) {
            console.error(`❌ Failed to create partition ${partitionName}:`, error);
          }
        }
      }
    }
  }

  async archiveOldData(tableName?: string): Promise<Map<string, ArchiveMetrics>> {
    const results = new Map<string, ArchiveMetrics>();
    const tablesToArchive = tableName ? [tableName] : Array.from(this.archiveConfigs.keys());

    console.log(`Starting archival process for ${tablesToArchive.length} tables...`);

    for (const table of tablesToArchive) {
      const config = this.archiveConfigs.get(table);
      if (!config || !config.archiveEnabled) {
        console.log(`⏭️  Skipping ${table} (archiving disabled)`);
        continue;
      }

      try {
        const metrics = await this.archiveTable(table, config);
        results.set(table, metrics);
        console.log(`✅ Archived ${table}: ${metrics.archivedRecords} records, ${metrics.savedSpaceGB}GB saved`);
      } catch (error) {
        console.error(`❌ Failed to archive ${table}:`, error);
        results.set(table, {
          totalRecords: 0,
          archivedRecords: 0,
          deletedRecords: 0,
          savedSpaceGB: 0,
          executionTimeMs: 0,
        });
      }
    }

    return results;
  }

  private async archiveTable(tableName: string, config: ArchiveConfig): Promise<ArchiveMetrics> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

    // Get table size before archiving
    const sizeBeforeResult = await db.execute<Record<'size_bytes', unknown>>(`
      SELECT pg_total_relation_size('${tableName}') as size_bytes
    `);
    const sizeBeforeRow = extractRows(sizeBeforeResult)[0];
    const sizeBefore = Number.parseInt((sizeBeforeRow?.size_bytes as string | undefined) ?? '0', 10);

    // Count total records to be archived
    const countResult = await this.getOldRecordsCount(tableName, cutoffDate);
    const totalRecords = countResult;

    if (totalRecords === 0) {
      return {
        totalRecords: 0,
        archivedRecords: 0,
        deletedRecords: 0,
        savedSpaceGB: 0,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Create archive table if it doesn't exist
    await this.createArchiveTable(tableName);

    // Archive data in batches
    let archivedRecords = 0;
    let processedBatches = 0;

    while (archivedRecords < totalRecords) {
      const batchResult = await this.archiveBatch(tableName, cutoffDate, config.batchSize);
      archivedRecords += batchResult;
      processedBatches++;

      if (batchResult === 0) break; // No more records to archive

      // Log progress every 10 batches
      if (processedBatches % 10 === 0) {
        console.log(`📊 ${tableName}: Archived ${archivedRecords}/${totalRecords} records (${processedBatches} batches)`);
      }

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Vacuum table to reclaim space
    await db.execute(`VACUUM ANALYZE ${tableName}`);

    // Get table size after archiving
    const sizeAfterResult = await db.execute<Record<'size_bytes', unknown>>(`
      SELECT pg_total_relation_size('${tableName}') as size_bytes
    `);
    const sizeAfterRow = extractRows(sizeAfterResult)[0];
    const sizeAfter = Number.parseInt((sizeAfterRow?.size_bytes as string | undefined) ?? '0', 10);

    const savedSpaceGB = (sizeBefore - sizeAfter) / (1024 * 1024 * 1024);

    return {
      totalRecords,
      archivedRecords,
      deletedRecords: archivedRecords, // For this implementation, we delete after archiving
      savedSpaceGB,
      executionTimeMs: Date.now() - startTime,
    };
  }

  private async getOldRecordsCount(tableName: string, cutoffDate: Date): Promise<number> {
    const dateColumn = this.getDateColumnForTable(tableName);

    const result = await db.execute<Record<'count', unknown>>(sql`
      SELECT COUNT(*) as count
      FROM ${sql.raw(tableName)}
      WHERE ${sql.raw(dateColumn)} < ${cutoffDate.toISOString()}
    `);

    const rows = extractRows(result);
    const countValue = rows[0]?.count;
    return Number.parseInt((typeof countValue === 'string' ? countValue : String(countValue ?? '0')), 10) || 0;
  }

  private async createArchiveTable(tableName: string): Promise<void> {
    const archiveTableName = `${tableName}_archive`;

    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS ${archiveTableName} (
          LIKE ${tableName} INCLUDING ALL,
          archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Add compression if enabled
      const config = this.archiveConfigs.get(tableName);
      if (config?.compressionEnabled) {
        await db.execute(`
          ALTER TABLE ${archiveTableName} SET (toast_compression = 'lz4')
        `);
      }

      console.log(`✅ Archive table ready: ${archiveTableName}`);
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }

  private async archiveBatch(tableName: string, cutoffDate: Date, batchSize: number): Promise<number> {
    const archiveTableName = `${tableName}_archive`;
    const dateColumn = this.getDateColumnForTable(tableName);

    try {
      // Move data to archive table
      const result = await db.execute<Record<string, unknown>>(sql`
        WITH archived_data AS (
          DELETE FROM ${sql.raw(tableName)}
          WHERE ${sql.raw(dateColumn)} < ${cutoffDate.toISOString()}
          RETURNING *
        )
        INSERT INTO ${sql.raw(archiveTableName)}
        SELECT * FROM archived_data
        LIMIT ${batchSize}
      `);

      return extractRowCount(result);
    } catch (error) {
      console.error(`Failed to archive batch for ${tableName}:`, error);
      return 0;
    }
  }

  private getDateColumnForTable(tableName: string): string {
    const dateColumns: Record<string, string> = {
      'agent_executions': 'started_at',
      'audit_logs': 'timestamp',
      'workflow_executions': 'started_at',
      'workflow_step_executions': 'started_at',
      'messages': 'created_at',
      'document_chunks': 'created_at',
      'user_sessions': 'created_at',
    };

    return dateColumns[tableName] || 'created_at';
  }

  async getArchiveStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [tableName, config] of this.archiveConfigs) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

        const recordsToArchive = await this.getOldRecordsCount(tableName, cutoffDate);

        const tableSizeResult = await db.execute<Record<'table_size', unknown>>(`
          SELECT pg_size_pretty(pg_total_relation_size('${tableName}')) as table_size
        `);

        const archiveTableExists = await this.checkTableExists(`${tableName}_archive`);
        let archiveSize = '0 bytes';

        if (archiveTableExists) {
          const archiveSizeResult = await db.execute<Record<'archive_size', unknown>>(`
            SELECT pg_size_pretty(pg_total_relation_size('${tableName}_archive')) as archive_size
          `);
          const archiveSizeRow = extractRows(archiveSizeResult)[0];
          archiveSize = (archiveSizeRow?.archive_size as string | undefined) ?? '0 bytes';
        }

        status[tableName] = {
          retentionDays: config.retentionDays,
          recordsToArchive,
          tableSize: (extractRows(tableSizeResult)[0]?.table_size as string | undefined) ?? '0 bytes',
          archiveSize,
          archiveEnabled: config.archiveEnabled,
          lastArchive: await this.getLastArchiveTime(tableName),
        };
      } catch (error) {
        status[tableName] = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return status;
  }

  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await db.execute<Record<'exists', unknown>>(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ) as exists
      `);

      const existsValue = extractRows(result)[0]?.exists;
      return Boolean(existsValue);
    } catch {
      return false;
    }
  }

  private async getLastArchiveTime(tableName: string): Promise<Date | null> {
    try {
      const archiveTableName = `${tableName}_archive`;
      const exists = await this.checkTableExists(archiveTableName);

      if (!exists) return null;

      const result = await db.execute<Record<'last_archive', unknown>>(sql`
        SELECT MAX(archived_at) as last_archive
        FROM ${sql.raw(archiveTableName)}
      `);

      const lastArchiveValue = extractRows(result)[0]?.last_archive;
      if (lastArchiveValue instanceof Date) {
        return lastArchiveValue;
      }

      if (typeof lastArchiveValue === 'string' || typeof lastArchiveValue === 'number') {
        const parsedDate = new Date(lastArchiveValue);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
      }

      return null;
    } catch {
      return null;
    }
  }

  updateRetentionPolicy(tableName: string, retentionDays: number): void {
    const config = this.archiveConfigs.get(tableName);
    if (config) {
      config.retentionDays = retentionDays;
      this.archiveConfigs.set(tableName, config);
    }
  }

  async scheduleArchiving(): Promise<void> {
    console.log('📅 Scheduling automatic archiving...');

    // Run archiving daily at 2 AM
    const scheduleArchiving = () => {
      const now = new Date();
      const nextRun = new Date(now);
      nextRun.setHours(2, 0, 0, 0);

      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      const msUntilNextRun = nextRun.getTime() - now.getTime();

      setTimeout(async () => {
        console.log('🗄️  Starting scheduled archiving...');
        try {
          await this.archiveOldData();
          console.log('✅ Scheduled archiving completed');
        } catch (error) {
          console.error('❌ Scheduled archiving failed:', error);
        }

        // Schedule next run
        scheduleArchiving();
      }, msUntilNextRun);

      console.log(`📅 Next archiving scheduled for: ${nextRun.toISOString()}`);
    };

    scheduleArchiving();
  }
}

// Global instance
export const dataArchiveManager = new DataArchiveManager();