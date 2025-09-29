/**
 * Cartrita Interface - Production Logger
 * Comprehensive logging system with multiple levels and output targets
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  enableLocalStorage: boolean;
  maxLocalEntries: number;
}

class Logger {
  private config: LoggerConfig;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      enableLocalStorage: true,
      maxLocalEntries: 1000,
      ...config,
    };

    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `aurora_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
    };
  }

  private getCurrentUserId(): string | undefined {
    // In a real app, this would get the current user from auth context
    return localStorage.getItem('aurora_user_id') || undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    return `[${timestamp}] [${levelName}] ${entry.message}`;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const message = this.formatConsoleMessage(entry);
    const contextData = {
      ...entry.context,
      sessionId: entry.sessionId,
      userId: entry.userId,
    };

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.error || '', contextData);
        break;
      case LogLevel.WARN:
        console.warn(message, contextData);
        break;
      case LogLevel.INFO:
        console.info(message, contextData);
        break;
      case LogLevel.DEBUG:
        console.debug(message, contextData);
        break;
    }
  }

  private logToLocalStorage(entry: LogEntry): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const storageKey = 'aurora_logs';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');

      existingLogs.push({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        } : undefined,
      });

      // Keep only the most recent entries
      if (existingLogs.length > this.config.maxLocalEntries) {
        existingLogs.splice(0, existingLogs.length - this.config.maxLocalEntries);
      }

      localStorage.setItem(storageKey, JSON.stringify(existingLogs));
    } catch (error) {
      console.warn('Failed to save log to localStorage:', error);
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry,
          timestamp: entry.timestamp.toISOString(),
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
          } : undefined,
        }),
      });
    } catch (error) {
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, error);

    this.logToConsole(entry);
    this.logToLocalStorage(entry);

    if (this.config.enableRemote) {
      this.logToRemote(entry).catch(() => {
        // Silent fail for remote logging
      });
    }
  }

  public error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getLogs(): LogEntry[] {
    try {
      const logs = JSON.parse(localStorage.getItem('aurora_logs') || '[]');
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
        error: log.error ? Object.assign(new Error(log.error.message), log.error) : undefined,
      }));
    } catch {
      return [];
    }
  }

  public clearLogs(): void {
    localStorage.removeItem('aurora_logs');
  }
}

// Create singleton logger instance
const loggerConfig: Partial<LoggerConfig> = {
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
  enableRemote: import.meta.env.PROD,
  remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
};

export const logger = new Logger(loggerConfig);

// Global error handler setup
window.addEventListener('error', (event) => {
  logger.error('Global error caught', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason, {
    type: 'unhandledrejection',
  });
});

export default logger;