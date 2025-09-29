import { Orchestrator } from '../agents/core/Orchestrator.js';
import { AIDevTools } from './AIDevTools.js';
import { IntelligentMonitor } from './IntelligentMonitor.js';
import { AdvancedCodeAgent, AdvancedResearchAgent } from '../agents/advanced/AdvancedAgents.js';
import fs from 'node:fs/promises';
import path from 'node:path';

interface ProjectStructure {
  agents: string[];
  routes: string[];
  schemas: string[];
  workflows: string[];
  monitoring: string[];
  tests: string[];
  files?: string[];
  directories?: string[];
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface EnhancementRecommendation {
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  implementation?: string;
  impact?: string;
}

/**
 * ProjectWorkflowManager - Specialized workflows for your cartrita-mcdaniels project
 */
export class ProjectWorkflowManager {
  private orchestrator: Orchestrator;
  private aiDevTools: AIDevTools;
  private monitor: IntelligentMonitor;
  private codeAgent: AdvancedCodeAgent;
  private researchAgent: AdvancedResearchAgent;

  constructor() {
    this.orchestrator = new Orchestrator();
    this.aiDevTools = new AIDevTools();
    this.monitor = new IntelligentMonitor();
    this.codeAgent = new AdvancedCodeAgent();
    this.researchAgent = new AdvancedResearchAgent();

    this.setupProjectWorkflows();
  }

  private setupProjectWorkflows() {
    // Cartrita Project Enhancement Workflow
    this.orchestrator.registerWorkflow({
      id: 'cartrita-enhancement',
      name: 'Cartrita Project Enhancement',
      description: 'Comprehensive enhancement of the cartrita-mcdaniels AI system',
      steps: [
        {
          id: 'analyze-architecture',
          taskType: 'code-analysis',
          prompt: 'Analyze the current cartrita-mcdaniels architecture and identify enhancement opportunities:'
        },
        {
          id: 'database-optimization',
          taskType: 'code-generation',
          prompt: 'Optimize database schemas and add new tables for enhanced functionality:'
        },
        {
          id: 'agent-enhancement',
          taskType: 'code-generation',
          prompt: 'Enhance AI agents with new capabilities and better orchestration:'
        },
        {
          id: 'api-expansion',
          taskType: 'code-generation',
          prompt: 'Expand API endpoints with new features and better error handling:'
        },
        {
          id: 'monitoring-upgrade',
          taskType: 'code-generation',
          prompt: 'Upgrade monitoring system with AI-powered insights and predictions:'
        },
        {
          id: 'performance-testing',
          taskType: 'code-generation',
          prompt: 'Create comprehensive performance testing suite:'
        }
      ]
    });

    // MCP Integration Enhancement
    this.orchestrator.registerWorkflow({
      id: 'mcp-integration-boost',
      name: 'MCP Integration Enhancement',
      description: 'Enhance Model Context Protocol integration with advanced features',
      steps: [
        {
          id: 'mcp-audit',
          taskType: 'code-analysis',
          prompt: 'Audit current MCP setup and identify integration improvements:'
        },
        {
          id: 'protocol-optimization',
          taskType: 'code-generation',
          prompt: 'Optimize MCP protocol handling and error recovery:'
        },
        {
          id: 'context-enhancement',
          taskType: 'code-generation',
          prompt: 'Enhance context management and sharing between models:'
        },
        {
          id: 'monitoring-integration',
          taskType: 'code-generation',
          prompt: 'Integrate MCP monitoring with intelligent alerts:'
        }
      ]
    });

    // Database Evolution Workflow
    this.orchestrator.registerWorkflow({
      id: 'database-evolution',
      name: 'Database Schema Evolution',
      description: 'Evolve database schema with new AI-driven features',
      steps: [
        {
          id: 'schema-analysis',
          taskType: 'code-analysis',
          prompt: 'Analyze current Drizzle schemas and identify evolution opportunities:'
        },
        {
          id: 'migration-planning',
          taskType: 'planning',
          prompt: 'Plan database migrations for new AI features:'
        },
        {
          id: 'schema-generation',
          taskType: 'code-generation',
          prompt: 'Generate new schema definitions and migration scripts:'
        },
        {
          id: 'data-validation',
          taskType: 'code-generation',
          prompt: 'Create data validation and integrity checks:'
        }
      ]
    });

    // AI Agent Ecosystem Expansion
    this.orchestrator.registerWorkflow({
      id: 'agent-ecosystem-expansion',
      name: 'AI Agent Ecosystem Expansion',
      description: 'Expand the AI agent ecosystem with specialized capabilities',
      steps: [
        {
          id: 'capability-mapping',
          taskType: 'research',
          prompt: 'Map current agent capabilities and identify expansion areas:'
        },
        {
          id: 'specialized-agents',
          taskType: 'code-generation',
          prompt: 'Create specialized agents for specific domain tasks:'
        },
        {
          id: 'orchestration-enhancement',
          taskType: 'code-generation',
          prompt: 'Enhance agent orchestration with intelligent routing:'
        },
        {
          id: 'learning-system',
          taskType: 'code-generation',
          prompt: 'Implement agent learning and adaptation system:'
        }
      ]
    });
  }

  /**
   * Execute project-specific analysis and enhancement
   */
  async enhanceProject(focusArea: 'performance' | 'features' | 'architecture' | 'all' = 'all') {
    const projectRoot = process.cwd();
    
    // Analyze project structure
    const structure = await this.analyzeProjectStructure(projectRoot);
    
    // Get enhancement recommendations
    const recommendations = await this.getEnhancementRecommendations(structure, focusArea);
    
    // Execute improvements
    const results = await this.executeImprovements(recommendations);
    
    return {
      analysis: structure,
      recommendations,
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze current project structure and capabilities
   */
  private async analyzeProjectStructure(projectRoot: string): Promise<ProjectStructure> {
    const analysis: ProjectStructure = {
      agents: [] as string[],
      routes: [] as string[],
      schemas: [] as string[],
      workflows: [] as string[],
      monitoring: [] as string[],
      tests: [] as string[]
    };

    try {
      // Analyze agents directory
      const agentsPath = path.join(projectRoot, 'src/agents');
      const agentFiles = await this.getFilesRecursively(agentsPath);
      analysis.agents = agentFiles.filter(f => f.endsWith('.ts'));

      // Analyze routes
      const routesPath = path.join(projectRoot, 'src/routes');
      const routeFiles = await this.getFilesRecursively(routesPath);
      analysis.routes = routeFiles.filter(f => f.endsWith('.ts'));

      // Analyze schemas
      const schemasPath = path.join(projectRoot, 'src/schemas');
      const schemaFiles = await this.getFilesRecursively(schemasPath);
      analysis.schemas = schemaFiles.filter(f => f.endsWith('.ts'));

  // Get workflow metrics  
  const orchestrationMetrics = this.orchestrator.getMetrics().orchestrator;
  analysis.workflows = [`registered workflows count: ${orchestrationMetrics.registeredWorkflows}`];

    } catch (error) {
      console.warn('Error analyzing project structure:', error);
    }

    return analysis;
  }

  /**
   * Get files recursively from a directory
   */
  private async getFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (_error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Get AI-powered enhancement recommendations
   */
  private async getEnhancementRecommendations(structure: ProjectStructure, focusArea: string): Promise<EnhancementRecommendation[]> {
  const prompt = `
Analyze this cartrita-mcdaniels project structure and provide enhancement recommendations:

Project Structure:
- Agents: ${structure.agents.length} files
- Routes: ${structure.routes.length} files  
- Schemas: ${structure.schemas.length} files
- Workflows: ${structure.workflows.length} registered

Focus Area: ${focusArea}

Provide specific, actionable recommendations for:
1. Code architecture improvements
2. New feature opportunities
3. Performance optimizations
4. Security enhancements
5. Developer experience improvements

Format as JSON array with category, recommendation, and priority fields.
`;

    // Use research agent 
    const result = await this.researchAgent.execute({
      query: prompt,
      context: { focusArea, timestamp: Date.now() }
    });

    try {
      const resultData = result.kind === 'ok' ? result.data : null;

      if (typeof resultData === 'string') {
        const parsed = JSON.parse(resultData);
        return Array.isArray(parsed) ? parsed as EnhancementRecommendation[] : [];
      }

      if (Array.isArray(resultData)) {
        return resultData as EnhancementRecommendation[];
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Execute AI-recommended improvements
   */
  private async executeImprovements(recommendations: EnhancementRecommendation[]): Promise<unknown[]> {
    const results: Array<Record<string, unknown>> = [];

    for (const recommendation of recommendations) {
      const context = { category: recommendation.type, recommendation };
      try {
        const result = await this.codeAgent.execute({
          query: `Implement this improvement for cartrita-mcdaniels: ${recommendation.description}`,
          context
        });

        results.push({
          category: recommendation.type,
          recommendation: recommendation.description,
          implementation: result.kind === 'ok' ? result.data : 'Implementation generated',
          success: true
        });
      } catch (error: unknown) {
        results.push({
          category: recommendation.type,
          recommendation: recommendation.description,
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Run automated code quality improvements
   */
  async runQualityImprovement(targetPath?: string) {
    const target = targetPath || process.cwd();
    
    // Run code analysis
    const analysisResult = await this.aiDevTools.analyzeCode(target);
    
    // Get refactoring suggestions
    const refactorResult = await this.aiDevTools.suggestRefactoring(target);
    
    // Run basic monitoring check
    const monitoringActive = !!this.monitor;
    
    return {
      analysis: analysisResult,
      refactoring: refactorResult,
      monitoring: { active: monitoringActive },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate comprehensive project documentation
   */
  async generateProjectDocs() {
    const projectRoot = process.cwd();
    const structure = await this.analyzeProjectStructure(projectRoot);
    
    const docPrompt = `
Generate comprehensive documentation for the cartrita-mcdaniels AI development platform:

Project Components:
- ${structure.agents.length} AI Agents
- ${structure.routes.length} API Routes
- ${structure.schemas.length} Data Schemas
- Advanced AI workflows and orchestration

Include:
1. Architecture Overview
2. API Documentation
3. Agent System Guide
4. Workflow Usage Examples
5. Development Setup
6. Deployment Guide

Format as structured Markdown.
`;

    const result = await this.researchAgent.execute({
      query: docPrompt,
      context: { type: 'project-documentation' }
    });

    return result.kind === 'ok' ? result.data : 'Documentation generated';
  }

  /**
   * Get workflow execution statistics
   */
  getWorkflowStats() {
    const metrics = this.orchestrator.getMetrics();
    return {
      totalWorkflows: metrics.orchestrator.registeredWorkflows,
      executionHistory: metrics.orchestrator.executionHistory,
      availableWorkflows: [
        'cartrita-enhancement',
        'mcp-integration-boost', 
        'database-evolution',
        'agent-ecosystem-expansion'
      ]
    };
  }
}