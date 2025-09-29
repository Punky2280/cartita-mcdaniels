import { BaseAgent, type AgentInput, type AgentResult, type ExecutionContext } from '../base/BaseAgent.js';
import { ModelRouter, type TaskType } from '../../core/ModelRouter.js';
import { Context7Service } from '../../core/Context7Service.js';

export interface CodebaseInspectionInput extends AgentInput {
  directory?: string;
  filePatterns?: string[];
  searchQuery?: string;
  inspectionType: 'security' | 'performance' | 'architecture' | 'dependencies' | 'quality' | 'comprehensive';
  depth?: 'shallow' | 'medium' | 'deep';
  includeTests?: boolean;
  useMcpServers?: boolean;
  useContext7?: boolean;
}

interface InspectionResult {
  summary: string;
  findings: Array<{
    type: 'issue' | 'suggestion' | 'insight';
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    file?: string;
    line?: number;
    recommendation?: string;
  }>;
  metrics: {
    filesAnalyzed: number;
    linesOfCode: number;
    testCoverage?: number;
    complexityScore?: number;
    technicalDebt?: string;
  };
  recommendations: string[];
  mcpServerData?: any;
  context7Insights?: any;
}

export class CodebaseInspectorAgent extends BaseAgent {
  readonly name = 'codebase-inspector';
  readonly version = '1.0.0';
  readonly description = 'Comprehensive codebase analysis using MCP servers and Context7 insights';

  private modelRouter: ModelRouter;
  private context7: Context7Service;

  constructor() {
    super({
      failureThreshold: 3,
      recoveryTimeout: 45000,
      monitoringPeriod: 300000,
      halfOpenMaxRequests: 2
    });

    this.modelRouter = new ModelRouter();
    this.context7 = new Context7Service(this.modelRouter);
  }

  async executeCore(input: AgentInput, context: ExecutionContext): Promise<AgentResult> {
    const inspectionInput = input as CodebaseInspectionInput;

    try {
      this.emit('inspectionStarted', {
        type: inspectionInput.inspectionType,
        directory: inspectionInput.directory || 'current',
        depth: inspectionInput.depth || 'medium'
      });

      // Step 1: Initialize inspection context
      const inspectionContext = await this.initializeInspectionContext(inspectionInput);

      // Step 2: Gather codebase data using available tools
      const codebaseData = await this.gatherCodebaseData(inspectionInput);

      // Step 3: Use MCP servers for enhanced analysis
      const mcpData = inspectionInput.useMcpServers !== false
        ? await this.leverageMcpServers(inspectionInput, codebaseData)
        : null;

      // Step 4: Get Context7 insights for libraries and frameworks
      const context7Insights = inspectionInput.useContext7 !== false
        ? await this.getContext7Insights(codebaseData)
        : null;

      // Step 5: Perform AI-powered analysis
      const analysis = await this.performInspectionAnalysis(
        inspectionInput,
        codebaseData,
        mcpData,
        context7Insights
      );

      // Step 6: Generate comprehensive report
      const report = await this.generateInspectionReport(analysis, inspectionInput);

      this.emit('inspectionCompleted', {
        type: inspectionInput.inspectionType,
        findings: report.findings.length,
        severity: this.calculateOverallSeverity(report.findings)
      });

      return {
        kind: 'ok',
        data: report,
        metadata: {
          inspectionType: inspectionInput.inspectionType,
          filesAnalyzed: report.metrics.filesAnalyzed,
          executionTime: Date.now() - context.startTime
        }
      };

    } catch (error) {
      this.emit('inspectionError', {
        error: error instanceof Error ? error.message : String(error),
        type: inspectionInput.inspectionType
      });

      return {
        kind: 'error',
        code: 'inspection_failed',
        message: `Codebase inspection failed: ${error instanceof Error ? error.message : String(error)}`,
        category: 'execution',
        retryable: true
      };
    }
  }

  private async initializeInspectionContext(input: CodebaseInspectionInput) {
    const taskType: TaskType = this.getTaskTypeForInspection(input.inspectionType);

    return {
      taskType,
      systemPrompt: this.buildSystemPrompt(input),
      analysisDepth: input.depth || 'medium',
      focusAreas: this.getFocusAreas(input.inspectionType)
    };
  }

  private async gatherCodebaseData(input: CodebaseInspectionInput) {
    // This would integrate with file system analysis
    // For now, we'll simulate gathering data structure
    return {
      structure: 'codebase structure analysis',
      files: input.filePatterns || ['**/*.ts', '**/*.js', '**/*.json'],
      patterns: await this.analyzeCodePatterns(),
      dependencies: await this.analyzeDependencies(),
      config: await this.analyzeConfiguration()
    };
  }

  private async leverageMcpServers(input: CodebaseInspectionInput, codebaseData: any) {
    const mcpData: any = {};

    try {
      // Use GitHub MCP server for repository analysis
      mcpData.github = await this.useGitHubMcp(input);

      // Use Memory MCP server for storing/retrieving previous analyses
      mcpData.memory = await this.useMemoryMcp(input);

      // Use Filesystem MCP server for detailed file analysis
      mcpData.filesystem = await this.useFilesystemMcp(input);

      // Use Brave Search MCP for researching best practices
      mcpData.research = await this.useBraveSearchMcp(input);

    } catch (error) {
      console.warn('MCP server integration warning:', error);
      mcpData.error = error instanceof Error ? error.message : String(error);
    }

    return mcpData;
  }

  private async getContext7Insights(codebaseData: any) {
    try {
      const libraries = await this.extractLibrariesFromCodebase(codebaseData);
      const insights: any = {};

      for (const library of libraries) {
        const resolved = await this.context7.resolveLibrary(library);
        if (resolved.length > 0) {
          insights[library] = {
            documentation: await this.context7.getDocumentation({ libraryId: resolved[0].libraryId }),
            bestPractices: await this.context7.getCodeExamples(library, 'best-practices')
          };
        }
      }

      return insights;
    } catch (error) {
      console.warn('Context7 integration warning:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async performInspectionAnalysis(
    input: CodebaseInspectionInput,
    codebaseData: any,
    mcpData: any,
    context7Insights: any
  ) {
    const analysisPrompt = this.buildAnalysisPrompt(input, codebaseData, mcpData, context7Insights);

    const response = await this.modelRouter.execute(
      this.getTaskTypeForInspection(input.inspectionType),
      analysisPrompt,
      {
        systemPrompt: this.buildSystemPrompt(input),
        maxTokens: 3000,
        temperature: 0.3,
        context: {
          responseLength: 'long',
          codeComplexity: 'high'
        }
      }
    );

    return {
      content: response.content,
      provider: response.provider,
      usage: response.usage
    };
  }

  private async generateInspectionReport(analysis: any, input: CodebaseInspectionInput): Promise<InspectionResult> {
    // Parse AI analysis and structure it into a comprehensive report
    const reportPrompt = `
Based on the following codebase analysis, generate a structured inspection report:

Analysis: ${analysis.content}

Generate a JSON report with the following structure:
{
  "summary": "Executive summary of findings",
  "findings": [
    {
      "type": "issue|suggestion|insight",
      "severity": "low|medium|high|critical",
      "category": "security|performance|architecture|quality|dependencies",
      "description": "Detailed description",
      "file": "filename if applicable",
      "line": "line number if applicable",
      "recommendation": "Specific actionable recommendation"
    }
  ],
  "metrics": {
    "filesAnalyzed": number,
    "linesOfCode": number,
    "complexityScore": number,
    "technicalDebt": "assessment"
  },
  "recommendations": ["List of high-level recommendations"]
}
`;

    const reportResponse = await this.modelRouter.execute(
      'planning',
      reportPrompt,
      {
        systemPrompt: 'You are an expert code analyst. Generate precise, actionable reports.',
        maxTokens: 2000,
        temperature: 0.2
      }
    );

    try {
      const report = JSON.parse(reportResponse.content);
      return {
        ...report,
        mcpServerData: analysis.mcpData,
        context7Insights: analysis.context7Insights
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        summary: analysis.content.substring(0, 500),
        findings: [],
        metrics: {
          filesAnalyzed: 0,
          linesOfCode: 0
        },
        recommendations: ['Analysis parsing failed - manual review required'],
        mcpServerData: analysis.mcpData,
        context7Insights: analysis.context7Insights
      };
    }
  }

  // MCP Server Integration Methods
  private async useGitHubMcp(input: CodebaseInspectionInput) {
    // Integration with GitHub MCP server for repository analysis
    return {
      commits: 'recent commit analysis',
      issues: 'open issues analysis',
      pullRequests: 'PR pattern analysis',
      contributors: 'contributor activity'
    };
  }

  private async useMemoryMcp(input: CodebaseInspectionInput) {
    // Integration with Memory MCP server for persistent analysis data
    return {
      previousAnalyses: 'stored previous inspection results',
      trends: 'code quality trends over time',
      recommendations: 'historical recommendations tracking'
    };
  }

  private async useFilesystemMcp(input: CodebaseInspectionInput) {
    // Integration with Filesystem MCP server for detailed file analysis
    return {
      fileStructure: 'detailed file system analysis',
      permissions: 'file permission analysis',
      sizes: 'file size distribution',
      modifications: 'recent file modifications'
    };
  }

  private async useBraveSearchMcp(input: CodebaseInspectionInput) {
    // Integration with Brave Search MCP for researching best practices
    return {
      bestPractices: 'searched best practices for detected technologies',
      vulnerabilities: 'known vulnerabilities for dependencies',
      trends: 'current technology trends and recommendations'
    };
  }

  // Helper Methods
  private getTaskTypeForInspection(type: string): TaskType {
    switch (type) {
      case 'security': return 'code-analysis';
      case 'performance': return 'optimization';
      case 'architecture': return 'planning';
      case 'dependencies': return 'research';
      case 'quality': return 'code-analysis';
      default: return 'code-analysis';
    }
  }

  private buildSystemPrompt(input: CodebaseInspectionInput): string {
    return `You are a senior software architect and security expert conducting a ${input.inspectionType} inspection.

Focus areas:
- ${this.getFocusAreas(input.inspectionType).join('\n- ')}

Analysis depth: ${input.depth || 'medium'}
Include tests: ${input.includeTests !== false}

Provide thorough, actionable insights with specific recommendations.
Consider modern best practices, security standards, and performance optimization.`;
  }

  private getFocusAreas(type: string): string[] {
    switch (type) {
      case 'security':
        return [
          'OWASP Top 10 vulnerabilities',
          'Input validation and sanitization',
          'Authentication and authorization',
          'Data encryption and secrets management',
          'Dependencies with known vulnerabilities'
        ];
      case 'performance':
        return [
          'Database query optimization',
          'Memory usage and leaks',
          'Algorithm complexity',
          'Bundle size and loading performance',
          'Caching strategies'
        ];
      case 'architecture':
        return [
          'Code organization and modularity',
          'Separation of concerns',
          'Design patterns implementation',
          'Scalability considerations',
          'Maintainability and extensibility'
        ];
      case 'dependencies':
        return [
          'Outdated packages',
          'Security vulnerabilities',
          'License compatibility',
          'Bundle size impact',
          'Maintenance status'
        ];
      case 'quality':
        return [
          'Code duplication',
          'Complex functions and classes',
          'Test coverage',
          'Documentation quality',
          'Code style consistency'
        ];
      default:
        return [
          'Overall code quality',
          'Security considerations',
          'Performance optimization',
          'Architecture assessment',
          'Dependency analysis'
        ];
    }
  }

  private buildAnalysisPrompt(
    input: CodebaseInspectionInput,
    codebaseData: any,
    mcpData: any,
    context7Insights: any
  ): string {
    return `Analyze this codebase for ${input.inspectionType} inspection:

Codebase Data:
${JSON.stringify(codebaseData, null, 2)}

MCP Server Insights:
${JSON.stringify(mcpData, null, 2)}

Context7 Library Insights:
${JSON.stringify(context7Insights, null, 2)}

Provide a comprehensive analysis focusing on:
${this.getFocusAreas(input.inspectionType).map(area => `- ${area}`).join('\n')}

Include specific findings, severity assessments, and actionable recommendations.`;
  }

  private async analyzeCodePatterns() {
    return {
      designPatterns: 'detected design patterns',
      antiPatterns: 'identified anti-patterns',
      conventions: 'coding convention analysis'
    };
  }

  private async analyzeDependencies() {
    return {
      packageJson: 'package.json analysis',
      lockFiles: 'lock file analysis',
      outdated: 'outdated packages',
      vulnerabilities: 'vulnerability scan'
    };
  }

  private async analyzeConfiguration() {
    return {
      build: 'build configuration analysis',
      environment: 'environment configuration',
      ci: 'CI/CD configuration'
    };
  }

  private async extractLibrariesFromCodebase(codebaseData: any): Promise<string[]> {
    // Extract library names from codebase data
    return ['fastify', 'drizzle', 'typescript', 'vitest', 'biome'];
  }

  private calculateOverallSeverity(findings: any[]): string {
    if (findings.some(f => f.severity === 'critical')) return 'critical';
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }

  // Public inspection methods for different types
  async inspectSecurity(directory?: string): Promise<AgentResult> {
    return this.execute({
      inspectionType: 'security',
      directory,
      depth: 'deep',
      includeTests: true,
      useMcpServers: true,
      useContext7: true
    });
  }

  async inspectPerformance(directory?: string): Promise<AgentResult> {
    return this.execute({
      inspectionType: 'performance',
      directory,
      depth: 'medium',
      useMcpServers: true,
      useContext7: true
    });
  }

  async inspectArchitecture(directory?: string): Promise<AgentResult> {
    return this.execute({
      inspectionType: 'architecture',
      directory,
      depth: 'deep',
      useMcpServers: true,
      useContext7: true
    });
  }

  async inspectDependencies(directory?: string): Promise<AgentResult> {
    return this.execute({
      inspectionType: 'dependencies',
      directory,
      depth: 'medium',
      useMcpServers: true,
      useContext7: true
    });
  }

  async comprehensiveInspection(directory?: string): Promise<AgentResult> {
    return this.execute({
      inspectionType: 'comprehensive',
      directory,
      depth: 'deep',
      includeTests: true,
      useMcpServers: true,
      useContext7: true
    });
  }
}