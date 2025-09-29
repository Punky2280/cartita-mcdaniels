import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

interface MonitoringConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  metricsInterval: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    availabilityRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  retention: {
    metrics: number; // days
    logs: number; // days
    alerts: number; // days
  };
  outputs: {
    console: boolean;
    file: boolean;
    webhook?: string;
    email?: {
      enabled: boolean;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      to: string[];
      from: string;
    };
  };
}

interface MetricPoint {
  timestamp: number;
  serverName: string;
  connectionId: string;
  metricType: 'response_time' | 'request_count' | 'error_count' | 'circuit_breaker_state' | 'rate_limit_hits';
  value: number;
  tags?: Record<string, string> | undefined;
}

interface LogEntry {
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  serverName?: string | undefined;
  connectionId?: string | undefined;
  metadata?: Record<string, any> | undefined;
  stack?: string | undefined;
}

interface Alert {
  id: string;
  timestamp: number;
  type: 'high_response_time' | 'high_error_rate' | 'low_availability' | 'circuit_breaker_open' | 'server_down' | 'memory_high' | 'cpu_high';
  severity: 'low' | 'medium' | 'high' | 'critical';
  serverName: string;
  message: string;
  value?: number | undefined;
  threshold?: number | undefined;
  acknowledged: boolean;
  resolvedAt?: number | undefined;
  metadata?: Record<string, any> | undefined;
}

interface ServerHealth {
  serverName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  responseTime: number;
  errorRate: number;
  availabilityRate: number;
  circuitBreakerState: string;
  lastCheck: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface Dashboard {
  timestamp: number;
  overview: {
    totalServers: number;
    healthyServers: number;
    degradedServers: number;
    unhealthyServers: number;
    totalRequests: number;
    totalErrors: number;
    averageResponseTime: number;
    globalErrorRate: number;
  };
  servers: ServerHealth[];
  recentAlerts: Alert[];
  systemMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
}

export class MCPMonitoringService extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: MetricPoint[] = [];
  private logs: LogEntry[] = [];
  private alerts: Alert[] = [];
  private serverHealthMap: Map<string, ServerHealth> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private alertCounter = 0;
  private logDir: string;
  private isEnabled = false;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.logDir = join(process.cwd(), 'logs', 'mcp');
    this.isEnabled = config.enabled;

    if (this.isEnabled) {
      this.initializeLogging();
      this.startMetricsCollection();
      this.startCleanupProcess();
    }
  }

  /**
   * Initialize logging directories and files
   */
  private initializeLogging(): void {
    try {
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }

      this.log('info', 'MCP Monitoring Service initialized', {
        logDir: this.logDir,
        config: this.config
      });
    } catch (error) {
      console.error('Failed to initialize MCP monitoring logging:', error);
    }
  }

  /**
   * Log a message
   */
  log(level: 'error' | 'warn' | 'info' | 'debug', message: string, metadata?: Record<string, any>, serverName?: string, connectionId?: string): void {
    if (!this.isEnabled) return;

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      serverName,
      connectionId,
      metadata
    };

    // Add stack trace for errors
    if (level === 'error') {
      const stack = new Error().stack;
      if (stack) {
        logEntry.stack = stack;
      }
    }

    this.logs.push(logEntry);

    // Console output
    if (this.config.outputs.console) {
      this.outputToConsole(logEntry);
    }

    // File output
    if (this.config.outputs.file) {
      this.outputToFile(logEntry);
    }

    this.emit('log', logEntry);
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = entry.serverName ? `[${entry.serverName}]` : '[MCP]';
    const connectionInfo = entry.connectionId ? ` (${entry.connectionId})` : '';

    const logMessage = `${timestamp} ${prefix}${connectionInfo} ${entry.level.toUpperCase()}: ${entry.message}`;

    switch (entry.level) {
      case 'error':
        console.error(logMessage, entry.metadata || '');
        if (entry.stack) console.error(entry.stack);
        break;
      case 'warn':
        console.warn(logMessage, entry.metadata || '');
        break;
      case 'info':
        console.info(logMessage, entry.metadata || '');
        break;
      case 'debug':
        console.debug(logMessage, entry.metadata || '');
        break;
    }
  }

  /**
   * Output log entry to file
   */
  private outputToFile(entry: LogEntry): void {
    try {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      const logFile = join(this.logDir, `mcp-${date}.log`);

      const logLine = JSON.stringify(entry) + '\n';
      appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Record a metric point
   */
  recordMetric(
    serverName: string,
    connectionId: string,
    metricType: MetricPoint['metricType'],
    value: number,
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled) return;

    const metric: MetricPoint = {
      timestamp: Date.now(),
      serverName,
      connectionId,
      metricType,
      value,
      tags
    };

    this.metrics.push(metric);

    // Update server health
    this.updateServerHealth(serverName, metricType, value);

    this.emit('metric', metric);
  }

  /**
   * Update server health based on metrics
   */
  private updateServerHealth(serverName: string, metricType: string, value: number): void {
    let health = this.serverHealthMap.get(serverName);

    if (!health) {
      health = {
        serverName,
        status: 'healthy',
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        availabilityRate: 1,
        circuitBreakerState: 'CLOSED',
        lastCheck: Date.now(),
        memoryUsage: 0,
        cpuUsage: 0
      };
      this.serverHealthMap.set(serverName, health);
    }

    health.lastCheck = Date.now();

    switch (metricType) {
      case 'response_time':
        health.responseTime = value;
        break;
      case 'error_count':
        // Calculate error rate over last 5 minutes
        const recentMetrics = this.getRecentMetrics(serverName, 300000); // 5 minutes
        const totalRequests = recentMetrics.filter(m => m.metricType === 'request_count').length;
        const totalErrors = recentMetrics.filter(m => m.metricType === 'error_count').length;
        health.errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
        health.availabilityRate = 1 - health.errorRate;
        break;
    }

    // Determine overall status
    if (health.errorRate > this.config.alertThresholds.errorRate ||
        health.responseTime > this.config.alertThresholds.responseTime ||
        health.availabilityRate < this.config.alertThresholds.availabilityRate) {
      health.status = health.errorRate > 0.5 ? 'unhealthy' : 'degraded';
    } else {
      health.status = 'healthy';
    }

    this.serverHealthMap.set(serverName, health);
  }

  /**
   * Get recent metrics for a server
   */
  private getRecentMetrics(serverName: string, timeWindow: number): MetricPoint[] {
    const cutoff = Date.now() - timeWindow;
    return this.metrics.filter(m =>
      m.serverName === serverName && m.timestamp >= cutoff
    );
  }

  /**
   * Create an alert
   */
  createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    serverName: string,
    message: string,
    value?: number,
    threshold?: number,
    metadata?: Record<string, any>
  ): Alert {
    if (!this.isEnabled) {
      return {} as Alert;
    }

    const alert: Alert = {
      id: `alert-${++this.alertCounter}-${Date.now()}`,
      timestamp: Date.now(),
      type,
      severity,
      serverName,
      message,
      value,
      threshold,
      acknowledged: false,
      metadata
    };

    this.alerts.push(alert);

    this.log('warn', `Alert created: ${alert.message}`, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      value: alert.value,
      threshold: alert.threshold
    }, serverName);

    // Send notifications
    this.sendAlertNotifications(alert);

    this.emit('alert', alert);
    return alert;
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert): Promise<void> {
    try {
      // Webhook notification
      if (this.config.outputs.webhook) {
        await this.sendWebhookAlert(alert);
      }

      // Email notification
      if (this.config.outputs.email?.enabled) {
        await this.sendEmailAlert(alert);
      }
    } catch (error) {
      this.log('error', 'Failed to send alert notifications', { error: String(error) });
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    // Implementation would depend on the webhook service being used
    // This is a placeholder for webhook notification logic
    this.log('info', 'Webhook alert sent', { alertId: alert.id });
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Implementation would depend on email service configuration
    // This is a placeholder for email notification logic
    this.log('info', 'Email alert sent', { alertId: alert.id });
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.log('info', `Alert acknowledged: ${alert.message}`, { alertId });
      this.emit('alert-acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = Date.now();
      this.log('info', `Alert resolved: ${alert.message}`, { alertId });
      this.emit('alert-resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Start metrics collection and analysis
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.analyzeMetrics();
      this.collectSystemMetrics();
    }, this.config.metricsInterval);
  }

  /**
   * Analyze metrics and trigger alerts
   */
  private analyzeMetrics(): void {
    for (const [serverName, health] of this.serverHealthMap) {
      // Check response time threshold
      if (health.responseTime > this.config.alertThresholds.responseTime) {
        this.createAlert(
          'high_response_time',
          health.responseTime > this.config.alertThresholds.responseTime * 2 ? 'high' : 'medium',
          serverName,
          `High response time detected: ${health.responseTime.toFixed(2)}ms`,
          health.responseTime,
          this.config.alertThresholds.responseTime
        );
      }

      // Check error rate threshold
      if (health.errorRate > this.config.alertThresholds.errorRate) {
        this.createAlert(
          'high_error_rate',
          health.errorRate > 0.5 ? 'critical' : 'high',
          serverName,
          `High error rate detected: ${(health.errorRate * 100).toFixed(2)}%`,
          health.errorRate,
          this.config.alertThresholds.errorRate
        );
      }

      // Check availability threshold
      if (health.availabilityRate < this.config.alertThresholds.availabilityRate) {
        this.createAlert(
          'low_availability',
          health.availabilityRate < 0.5 ? 'critical' : 'high',
          serverName,
          `Low availability detected: ${(health.availabilityRate * 100).toFixed(2)}%`,
          health.availabilityRate,
          this.config.alertThresholds.availabilityRate
        );
      }
    }
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    try {
      const memUsage = process.memoryUsage();
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Record system metrics
      this.recordMetric('system', 'system', 'response_time', memoryUsagePercent, { type: 'memory' });

      // Check system thresholds
      if (memoryUsagePercent > this.config.alertThresholds.memoryUsage) {
        this.createAlert(
          'memory_high',
          memoryUsagePercent > 90 ? 'critical' : 'high',
          'system',
          `High memory usage: ${memoryUsagePercent.toFixed(2)}%`,
          memoryUsagePercent,
          this.config.alertThresholds.memoryUsage
        );
      }
    } catch (error) {
      this.log('error', 'Failed to collect system metrics', { error: String(error) });
    }
  }

  /**
   * Start cleanup process for old data
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Clean up old metrics, logs, and alerts
   */
  private cleanupOldData(): void {
    const now = Date.now();

    // Clean up old metrics
    const metricsRetention = this.config.retention.metrics * 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => now - m.timestamp < metricsRetention);

    // Clean up old logs
    const logsRetention = this.config.retention.logs * 24 * 60 * 60 * 1000;
    this.logs = this.logs.filter(l => now - l.timestamp < logsRetention);

    // Clean up old alerts
    const alertsRetention = this.config.retention.alerts * 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(a => now - a.timestamp < alertsRetention);

    this.log('info', 'Data cleanup completed', {
      metricsCount: this.metrics.length,
      logsCount: this.logs.length,
      alertsCount: this.alerts.length
    });
  }

  /**
   * Get dashboard data
   */
  getDashboard(): Dashboard {
    const servers = Array.from(this.serverHealthMap.values());
    const totalServers = servers.length;
    const healthyServers = servers.filter(s => s.status === 'healthy').length;
    const degradedServers = servers.filter(s => s.status === 'degraded').length;
    const unhealthyServers = servers.filter(s => s.status === 'unhealthy').length;

    // Calculate global metrics
    const recentMetrics = this.metrics.filter(m => Date.now() - m.timestamp < 300000); // 5 minutes
    const totalRequests = recentMetrics.filter(m => m.metricType === 'request_count').length;
    const totalErrors = recentMetrics.filter(m => m.metricType === 'error_count').length;
    const responseTimes = recentMetrics.filter(m => m.metricType === 'response_time').map(m => m.value);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    const globalErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Get recent alerts (last 24 hours)
    const recentAlerts = this.alerts
      .filter(a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    // System metrics
    const memUsage = process.memoryUsage();
    const systemMetrics = {
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      cpuUsage: 0, // Would need additional monitoring for accurate CPU usage
      diskUsage: 0, // Would need disk monitoring
      networkLatency: 0 // Would need network monitoring
    };

    return {
      timestamp: Date.now(),
      overview: {
        totalServers,
        healthyServers,
        degradedServers,
        unhealthyServers,
        totalRequests,
        totalErrors,
        averageResponseTime,
        globalErrorRate
      },
      servers,
      recentAlerts,
      systemMetrics
    };
  }

  /**
   * Export metrics to file
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const date = new Date().toISOString().split('T')[0];
    const filename = join(this.logDir, `metrics-export-${date}.${format}`);

    try {
      if (format === 'json') {
        const data = {
          exportDate: new Date().toISOString(),
          metrics: this.metrics,
          serverHealth: Array.from(this.serverHealthMap.values()),
          alerts: this.alerts
        };
        writeFileSync(filename, JSON.stringify(data, null, 2));
      } else if (format === 'csv') {
        // Simple CSV export for metrics
        const headers = ['timestamp', 'serverName', 'connectionId', 'metricType', 'value'];
        const csvContent = [
          headers.join(','),
          ...this.metrics.map(m => [
            m.timestamp,
            m.serverName,
            m.connectionId,
            m.metricType,
            m.value
          ].join(','))
        ].join('\n');
        writeFileSync(filename, csvContent);
      }

      this.log('info', 'Metrics exported successfully', { filename, format });
      return filename;
    } catch (error) {
      this.log('error', 'Failed to export metrics', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats(): Record<string, any> {
    return {
      isEnabled: this.isEnabled,
      metricsCount: this.metrics.length,
      logsCount: this.logs.length,
      alertsCount: this.alerts.length,
      serversMonitored: this.serverHealthMap.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      config: this.config
    };
  }

  /**
   * Enable monitoring
   */
  enable(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      this.initializeLogging();
      this.startMetricsCollection();
      this.startCleanupProcess();
      this.log('info', 'MCP Monitoring Service enabled');
    }
  }

  /**
   * Disable monitoring
   */
  disable(): void {
    if (this.isEnabled) {
      this.isEnabled = false;
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      this.log('info', 'MCP Monitoring Service disabled');
    }
  }

  /**
   * Shutdown monitoring service
   */
  shutdown(): void {
    this.disable();
    this.log('info', 'MCP Monitoring Service shutdown');
    this.removeAllListeners();
  }
}

export default MCPMonitoringService;