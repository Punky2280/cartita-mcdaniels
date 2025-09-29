import { EventEmitter } from 'node:events';
import { ModelRouter } from '../core/ModelRouter.js';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface ErrorEntry {
  timestamp: Date;
  component: string;
  errorType: string;
  message: string;
  stack?: string | undefined;
  metadata?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceMetric {
  timestamp: Date;
  component: string;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}



export interface AIInsight {
  type: 'error_pattern' | 'performance_trend' | 'optimization_suggestion' | 'anomaly_detection';
  message: string;
  confidence: number;
  actionable: boolean;
  recommendation?: string;
}

export class IntelligentMonitor extends EventEmitter {
  private modelRouter: ModelRouter;
  private errorHistory: ErrorEntry[] = [];
  private performanceHistory: PerformanceMetric[] = [];
  private insights: AIInsight[] = [];
  private logPath: string;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(logPath: string = './logs') {
    super();
    this.modelRouter = new ModelRouter();
    this.logPath = logPath;
    
    // Run intelligent analysis every 10 minutes
    this.analysisInterval = setInterval(() => {
      this.runIntelligentAnalysis();
    }, 10 * 60 * 1000);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for orchestrator events
    this.on('agentError', (agentName: string, error: Error | unknown) => {
      void this.recordError({
        component: `Agent:${agentName}`,
        errorType: 'agent_execution_error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        severity: 'medium'
      });
    });

    this.on('performanceMetric', (metric: PerformanceMetric) => {
      void this.recordPerformance(metric);
    });
  }

  /**
   * Record error with context and trigger AI analysis if needed
   */
  async recordError(error: Omit<ErrorEntry, 'timestamp'>): Promise<void> {
    const errorContext: ErrorEntry = {
      ...error,
      timestamp: new Date()
    };

    this.errorHistory.push(errorContext);
    
    // Keep only last 1000 errors
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-1000);
    }

    // Log to file
    await this.logToFile('error', errorContext);

    // Trigger immediate analysis for critical errors
    if (error.severity === 'critical') {
      await this.analyzeError(errorContext);
    }

    this.emit('errorRecorded', errorContext);
  }

  /**
   * Record performance metric
   */
  async recordPerformance(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const perfMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    this.performanceHistory.push(perfMetric);
    
    // Keep only last 5000 metrics
    if (this.performanceHistory.length > 5000) {
      this.performanceHistory = this.performanceHistory.slice(-5000);
    }

    // Log to file
    await this.logToFile('performance', perfMetric);

    // Check for performance anomalies
    if (perfMetric.duration > 10000 && !perfMetric.success) { // 10+ seconds failure
      await this.analyzePerformanceAnomaly(perfMetric);
    }

    this.emit('performanceRecorded', perfMetric);
  }

  /**
   * AI-powered error analysis
   */
  private async analyzeError(error: ErrorEntry): Promise<void> {
    try {
      const recentErrors = this.errorHistory
        .filter(e => Date.now() - e.timestamp.getTime() < 60 * 60 * 1000) // Last hour
        .slice(-20); // Last 20 errors

      const analysis = await this.modelRouter.execute(
        'debugging',
        `Analyze this error and recent error patterns:

Current Error:
Component: ${error.component}
Type: ${error.errorType}
Message: ${error.message}
Severity: ${error.severity}
Stack: ${error.stack || 'N/A'}

Recent Errors (last 20):
${recentErrors.map(e => `- ${e.component}: ${e.message}`).join('\n')}

Provide analysis in JSON format:
{
  "rootCause": "Likely root cause of the error",
  "pattern": "Pattern detected in recent errors (if any)",
  "severity": "Updated severity assessment",
  "immediateActions": ["Action 1", "Action 2"],
  "preventiveMeasures": ["Prevention 1", "Prevention 2"],
  "confidence": 0.8
}`,
        {
          systemPrompt: 'You are an expert system administrator and debugger. Provide actionable error analysis.',
          maxTokens: 1500,
          temperature: 0.3
        }
      );

      const parsedAnalysis = JSON.parse(analysis.content);
      
      const insight: AIInsight = {
        type: 'error_pattern',
        message: `Error Analysis: ${parsedAnalysis.rootCause}`,
        confidence: parsedAnalysis.confidence,
        actionable: true,
        recommendation: parsedAnalysis.immediateActions.join('; ')
      };

      this.insights.push(insight);
      this.emit('aiInsight', insight);

      // Log analysis
      await this.logToFile('analysis', {
        error,
        analysis: parsedAnalysis,
        timestamp: new Date()
      });

    } catch (analysisError) {
      console.error('Failed to analyze error:', analysisError);
    }
  }

  /**
   * Analyze performance anomalies
   */
  private async analyzePerformanceAnomaly(metric: PerformanceMetric): Promise<void> {
    try {
      const recentMetrics = this.performanceHistory
        .filter(m => m.component === metric.component && m.operation === metric.operation)
        .slice(-50); // Last 50 similar operations

      if (recentMetrics.length < 5) return; // Need baseline

      const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      const successRate = recentMetrics.filter(m => m.success).length / recentMetrics.length;

      const analysis = await this.modelRouter.execute(
        'optimization',
        `Analyze this performance anomaly:

Current Operation:
Component: ${metric.component}
Operation: ${metric.operation}
Duration: ${metric.duration}ms
Success: ${metric.success}

Historical Performance:
Average Duration: ${avgDuration.toFixed(2)}ms
Success Rate: ${(successRate * 100).toFixed(1)}%
Samples: ${recentMetrics.length}

Deviation: ${((metric.duration - avgDuration) / avgDuration * 100).toFixed(1)}%

Provide optimization suggestions in JSON format:
{
  "isAnomaly": true/false,
  "severity": "low|medium|high",
  "likelyCauses": ["Cause 1", "Cause 2"],
  "optimizations": ["Optimization 1", "Optimization 2"],
  "monitoring": "Additional monitoring recommendations"
}`,
        {
          systemPrompt: 'You are a performance optimization expert. Analyze anomalies and suggest improvements.',
          maxTokens: 1000
        }
      );

      const parsedAnalysis = JSON.parse(analysis.content);
      
      if (parsedAnalysis.isAnomaly) {
        const insight: AIInsight = {
          type: 'performance_trend',
          message: `Performance anomaly detected in ${metric.component}:${metric.operation}`,
          confidence: 0.8,
          actionable: true,
          recommendation: parsedAnalysis.optimizations.join('; ')
        };

        this.insights.push(insight);
        this.emit('aiInsight', insight);
      }

    } catch (error) {
      console.error('Failed to analyze performance anomaly:', error);
    }
  }

  /**
   * Run comprehensive intelligent analysis
   */
  private async runIntelligentAnalysis(): Promise<void> {
    try {
      // Analyze trends over the last 24 hours
      const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
      const recentErrors = this.errorHistory.filter(e => e.timestamp.getTime() > last24Hours);
      const recentMetrics = this.performanceHistory.filter(m => m.timestamp.getTime() > last24Hours);

      if (recentErrors.length === 0 && recentMetrics.length === 0) return;

      // Generate comprehensive system health report
      const healthReport = await this.modelRouter.execute(
        'planning',
        `Generate a system health analysis based on the last 24 hours:

Errors (${recentErrors.length} total):
${recentErrors.slice(-20).map(e => `- ${e.component}: ${e.errorType} (${e.severity})`).join('\n')}

Performance Metrics (${recentMetrics.length} operations):
${this.summarizePerformanceMetrics(recentMetrics)}

Provide analysis in JSON format:
{
  "overallHealth": "excellent|good|warning|critical",
  "keyIssues": ["Issue 1", "Issue 2"],
  "trends": ["Trend 1", "Trend 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "priorityActions": ["Action 1", "Action 2"]
}`,
        {
          systemPrompt: 'You are a system health analyst. Provide comprehensive health assessment.',
          maxTokens: 1500
        }
      );

      const report = JSON.parse(healthReport.content);
      
      const insight: AIInsight = {
        type: 'optimization_suggestion',
        message: `System Health: ${report.overallHealth} - ${report.keyIssues.join(', ')}`,
        confidence: 0.9,
        actionable: true,
        recommendation: report.priorityActions.join('; ')
      };

      this.insights.push(insight);
      this.emit('aiInsight', insight);
      this.emit('healthReport', report);

    } catch (error) {
      console.error('Failed to run intelligent analysis:', error);
    }
  }

  private summarizePerformanceMetrics(metrics: PerformanceMetric[]): string {
    const byComponent = metrics.reduce((acc, metric) => {
      const key = `${metric.component}:${metric.operation}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    return Object.entries(byComponent)
      .map(([key, ops]) => {
        const avgDuration = ops.reduce((sum, op) => sum + op.duration, 0) / ops.length;
        const successRate = ops.filter(op => op.success).length / ops.length;
        return `- ${key}: ${avgDuration.toFixed(0)}ms avg, ${(successRate * 100).toFixed(1)}% success (${ops.length} ops)`;
      })
      .join('\n');
  }

  /**
   * Auto-recovery mechanisms
   */
  async attemptAutoRecovery(error: ErrorEntry): Promise<boolean> {
    try {
      const recoveryPlan = await this.modelRouter.execute(
        'debugging',
        `Suggest automated recovery actions for this error:
        
Component: ${error.component}
Error: ${error.message}
Type: ${error.errorType}

Provide recovery plan in JSON format:
{
  "canAutoRecover": true/false,
  "recoverySteps": ["Step 1", "Step 2"],
  "rollbackRequired": true/false,
  "riskLevel": "low|medium|high"
}`,
        {
          systemPrompt: 'You are an automated recovery system. Suggest safe recovery actions.',
          maxTokens: 800
        }
      );

      const plan = JSON.parse(recoveryPlan.content);
      
      if (plan.canAutoRecover && plan.riskLevel === 'low') {
        // Execute recovery steps (implementation depends on your system)
        this.emit('autoRecoveryAttempted', error, plan);
        return true;
      }

      return false;
    } catch (recoveryError) {
      console.error('Auto-recovery failed:', recoveryError);
      return false;
    }
  }

  /**
   * Get current system insights
   */
  getInsights(limit = 10): AIInsight[] {
    return this.insights.slice(-limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats(hours = 24): {
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    trends: string[];
  } {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const recentErrors = this.errorHistory.filter(e => e.timestamp.getTime() > cutoff);

    const bySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byComponent = recentErrors.reduce((acc, error) => {
      acc[error.component] = (acc[error.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: recentErrors.length,
      bySeverity,
      byComponent,
      trends: [] // Could implement trend analysis here
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(hours = 24): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    slowestOperations: Array<{ component: string; operation: string; avgDuration: number }>;
  } {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const recentMetrics = this.performanceHistory.filter(m => m.timestamp.getTime() > cutoff);

    const totalOperations = recentMetrics.length;
    const averageDuration = totalOperations > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations
      : 0;
    const successRate = totalOperations > 0
      ? recentMetrics.filter(m => m.success).length / totalOperations
      : 0;

    // Find slowest operations
    const byOperation = recentMetrics.reduce((acc, metric) => {
      const key = `${metric.component}:${metric.operation}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(metric.duration);
      return acc;
    }, {} as Record<string, number[]>);

    const slowestOperations = Object.entries(byOperation)
      .map(([key, durations]) => ({
        component: key.split(':')[0],
        operation: key.split(':')[1],
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      totalOperations,
      averageDuration,
      successRate,
      slowestOperations
    };
  }

  private async logToFile(type: string, data: unknown): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} [${type.toUpperCase()}] ${JSON.stringify(data)}\n`;
      const filePath = join(this.logPath, `${type}.log`);
      
      await appendFile(filePath, logEntry, 'utf-8');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const intelligentMonitor = new IntelligentMonitor();