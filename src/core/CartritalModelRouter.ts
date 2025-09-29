/**
 * Cartrita Model Router - Intelligent model selection and routing
 * Assigns specific models to agents based on their capabilities and requirements
 */

import OpenAI from 'openai';
import type { Logger } from 'pino';

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'anthropic';
  maxTokens: number;
  costPer1k: number;
  capabilities: string[];
  performance: 'fast' | 'balanced' | 'premium';
}

export interface AgentModelAssignment {
  agentId: string;
  agentName: string;
  primaryModel: string;
  fallbackModel?: string;
  description: string;
  performance: 'fast' | 'balanced' | 'premium';
}

export class CartritalModelRouter {
  private openai: OpenAI;
  private logger?: Logger;

  // Model configurations
  private models: Record<string, ModelConfig> = {
    'gpt-4.1': {
      name: 'gpt-4.1',
      provider: 'openai',
      maxTokens: 128000,
      costPer1k: 30.0,
      capabilities: ['reasoning', 'planning', 'coordination', 'complex-analysis'],
      performance: 'premium'
    },
    'gpt-5-codex-preview': {
      name: 'gpt-5-codex-preview',
      provider: 'openai',
      maxTokens: 200000,
      costPer1k: 50.0,
      capabilities: ['code-generation', 'debugging', 'refactoring', 'architecture'],
      performance: 'premium'
    },
    'gpt-4o': {
      name: 'gpt-4o',
      provider: 'openai',
      maxTokens: 128000,
      costPer1k: 15.0,
      capabilities: ['analysis', 'research', 'documentation', 'general-tasks'],
      performance: 'balanced'
    },
    'gpt-4o-mini': {
      name: 'gpt-4o-mini',
      provider: 'openai',
      maxTokens: 128000,
      costPer1k: 0.6,
      capabilities: ['simple-tasks', 'formatting', 'basic-analysis'],
      performance: 'fast'
    }
  };

  // Agent-to-model assignments
  private agentAssignments: Record<string, AgentModelAssignment> = {
    'cartrita-orchestrator': {
      agentId: 'cartrita-orchestrator',
      agentName: 'Cartrita Orchestrator',
      primaryModel: 'gpt-4.1',
      fallbackModel: 'gpt-4o',
      description: 'Main orchestrator using GPT-4.1 for intelligent coordination',
      performance: 'premium'
    },
    'code-engineer': {
      agentId: 'code-engineer',
      agentName: 'Code Engineer',
      primaryModel: 'gpt-5-codex-preview',
      fallbackModel: 'gpt-4o',
      description: 'Advanced code generation with GPT-5 Codex Preview',
      performance: 'premium'
    },
    'frontend-agent': {
      agentId: 'frontend-agent',
      agentName: 'Frontend Specialist',
      primaryModel: 'gpt-4o-mini',
      fallbackModel: 'gpt-4o',
      description: 'React/TypeScript specialist using fast model',
      performance: 'fast'
    },
    'api-agent': {
      agentId: 'api-agent',
      agentName: 'API Engineer',
      primaryModel: 'gpt-4o',
      fallbackModel: 'gpt-4o-mini',
      description: 'Backend API development with balanced performance',
      performance: 'balanced'
    },
    'codebase-inspector': {
      agentId: 'codebase-inspector',
      agentName: 'Codebase Inspector',
      primaryModel: 'gpt-4o',
      fallbackModel: 'gpt-4o-mini',
      description: 'Security and performance analysis',
      performance: 'balanced'
    },
    'mcp-integration': {
      agentId: 'mcp-integration',
      agentName: 'MCP Integration Agent',
      primaryModel: 'gpt-4o-mini',
      fallbackModel: 'gpt-4o',
      description: 'MCP server integration with fast processing',
      performance: 'fast'
    }
  };

  constructor(logger?: Logger) {
    this.logger = logger;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Get the appropriate model for an agent
   */
  getModelForAgent(agentId: string): string {
    const assignment = this.agentAssignments[agentId];
    if (!assignment) {
      this.logger?.warn({ agentId }, 'No model assignment found, using default');
      return 'gpt-4o-mini'; // Default fallback
    }
    return assignment.primaryModel;
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelName: string): ModelConfig | undefined {
    return this.models[modelName];
  }

  /**
   * Execute a prompt with the appropriate model for an agent
   */
  async executeForAgent(
    agentId: string,
    prompt: string,
    options: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<{
    content: string;
    model: string;
    tokens: number;
    responseTime: number;
  }> {
    const startTime = Date.now();
    const modelName = this.getModelForAgent(agentId);
    const modelConfig = this.getModelConfig(modelName);

    if (!modelConfig) {
      throw new Error(`Model configuration not found for ${modelName}`);
    }

    this.logger?.info({
      agentId,
      model: modelName,
      performance: modelConfig.performance
    }, 'Executing prompt with assigned model');

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (options.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      }

      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages,
        max_tokens: options.maxTokens || Math.min(4000, modelConfig.maxTokens),
        temperature: options.temperature || 0.7,
        stream: options.stream || false
      });

      const responseTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';
      const tokens = response.usage?.total_tokens || 0;

      this.logger?.info({
        agentId,
        model: modelName,
        tokens,
        responseTime,
        cost: (tokens / 1000) * modelConfig.costPer1k
      }, 'Model execution completed');

      return {
        content,
        model: modelName,
        tokens,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger?.error({
        error,
        agentId,
        model: modelName,
        responseTime
      }, 'Model execution failed');

      // Try fallback model if available
      const assignment = this.agentAssignments[agentId];
      if (assignment?.fallbackModel && assignment.fallbackModel !== modelName) {
        this.logger?.info({
          agentId,
          originalModel: modelName,
          fallbackModel: assignment.fallbackModel
        }, 'Attempting fallback model');

        // Recursively try with fallback model
        const originalAssignment = { ...assignment };
        this.agentAssignments[agentId] = {
          ...assignment,
          primaryModel: assignment.fallbackModel
        };

        try {
          const result = await this.executeForAgent(agentId, prompt, options);
          // Restore original assignment
          this.agentAssignments[agentId] = originalAssignment;
          return result;
        } catch (fallbackError) {
          // Restore original assignment
          this.agentAssignments[agentId] = originalAssignment;
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  /**
   * Get all agent assignments
   */
  getAgentAssignments(): Record<string, AgentModelAssignment> {
    return { ...this.agentAssignments };
  }

  /**
   * Get performance metrics for models
   */
  getModelMetrics(): {
    models: Record<string, ModelConfig>;
    assignments: Record<string, AgentModelAssignment>;
    totalModels: number;
    totalAgents: number;
  } {
    return {
      models: { ...this.models },
      assignments: { ...this.agentAssignments },
      totalModels: Object.keys(this.models).length,
      totalAgents: Object.keys(this.agentAssignments).length
    };
  }

  /**
   * Estimate cost for a prompt
   */
  estimateCost(agentId: string, promptTokens: number, maxTokens: number = 4000): number {
    const modelName = this.getModelForAgent(agentId);
    const modelConfig = this.getModelConfig(modelName);

    if (!modelConfig) {
      return 0;
    }

    const estimatedTotalTokens = promptTokens + maxTokens;
    return (estimatedTotalTokens / 1000) * modelConfig.costPer1k;
  }
}

export default CartritalModelRouter;