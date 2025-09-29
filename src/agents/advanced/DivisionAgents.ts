import { BaseAgent, type AgentInput, type AgentResult, type ExecutionContext } from '../base/BaseAgent.js';
import { ModelRouter, type ModelProvider } from '../../core/ModelRouter.js';

interface DivisionAgentConfig {
  divisionName: string;
  mission: string;
  keyResponsibilities: string[];
  collaborationPartners: string[];
  successMetrics: string[];
  defaultFocusAreas: string[];
  defaultConstraints: string[];
  deliverableSections: string[];
  defaultDeliverableFormat: string;
  specializedGuidance: string[];
}

type ProviderPreference = 'openai' | 'anthropic' | 'balanced';

interface NormalizedDivisionInput {
  objective: string;
  context?: string;
  focusAreas: string[];
  constraints: string[];
  deliverableFormat: string;
  preferProvider: ProviderPreference;
}

abstract class AbstractDivisionAgent extends BaseAgent {
  protected readonly modelRouter: ModelRouter;

  constructor() {
    super(
      {
        failureThreshold: 4,
        recoveryTimeout: 45000,
        monitoringPeriod: 180000,
        halfOpenMaxRequests: 2
      },
      90000,
      {
        maxRetries: 2,
        initialDelay: 1500,
        backoffMultiplier: 2,
        maxDelay: 10000,
        retryableErrors: ['timeout', 'network', 'rate-limit', 'temporary']
      }
    );
    this.modelRouter = new ModelRouter();
  }

  protected abstract getDivisionConfig(): DivisionAgentConfig;

  async executeCore(input: AgentInput, _context: ExecutionContext): Promise<AgentResult> {
    const config = this.getDivisionConfig();
    const normalized = this.normalizeInput(input, config);

    if (!normalized) {
      return {
        kind: 'error',
        code: 'invalid_objective',
        message: 'Division agents require an "objective" string describing the desired outcome.',
        category: 'validation',
        retryable: false
      };
    }

    try {
      const research = await this.modelRouter.execute('research', this.buildResearchPrompt(config, normalized), {
        systemPrompt: 'You are a principal systems strategist who blends rigorous research with architectural insight. Reference the latest OpenAI and Anthropic documentation explicitly in your findings.',
        maxTokens: 1600,
        temperature: 0.2
      });

      const planning = await this.modelRouter.execute('planning', this.buildPlanningPrompt(config, normalized, research.content), {
        systemPrompt: 'You are an elite AI program director. Convert research into phased execution strategies with clear ownership, dependencies, and measurable outcomes.',
        maxTokens: 1800,
        temperature: 0.25
      });

      const deliverable = await this.modelRouter.execute('documentation', this.buildDeliverablePrompt(config, normalized, research.content, planning.content), {
        systemPrompt: 'You are a senior staff technologist producing executive-ready deliverables. Structure content cleanly with numbered sections, tables when useful, and crisp summaries.',
        maxTokens: 2200,
        temperature: 0.2
      });

      const modelStrategy = await this.modelRouter.execute('planning', this.buildModelStrategyPrompt(config, normalized, research.provider, planning.provider, deliverable.provider, planning.content), {
        systemPrompt: 'Provide a concise decision playbook outlining when to leverage OpenAI versus Anthropic capabilities for this division.',
        maxTokens: 900,
        temperature: 0.15
      });

      const providers: ModelProvider[] = [research.provider, planning.provider, deliverable.provider, modelStrategy.provider];
      const uniqueProviders = Array.from(new Set(providers));

      const totalTokens = [research, planning, deliverable, modelStrategy].reduce((sum, response) => {
        const inputTokens = response.usage?.inputTokens ?? 0;
        const outputTokens = response.usage?.outputTokens ?? 0;
        return sum + inputTokens + outputTokens;
      }, 0);

      const totalExecutionTime = [research, planning, deliverable, modelStrategy].reduce((sum, response) => sum + (response.executionTime ?? 0), 0);

      return {
        kind: 'ok',
        data: {
          division: config.divisionName,
          mission: config.mission,
          objective: normalized.objective,
          focusAreas: normalized.focusAreas,
          constraints: normalized.constraints,
          deliverableFormat: normalized.deliverableFormat,
          successMetrics: config.successMetrics,
          collaborationPartners: config.collaborationPartners,
          deliverableSections: config.deliverableSections,
          research: {
            provider: research.provider,
            summary: research.content
          },
          executionPlan: {
            provider: planning.provider,
            content: planning.content
          },
          deliverable: {
            provider: deliverable.provider,
            content: deliverable.content
          },
          modelStrategy: {
            provider: modelStrategy.provider,
            content: modelStrategy.content,
            preference: normalized.preferProvider
          },
          metadata: {
            providersUsed: uniqueProviders,
            totalTokens,
            totalExecutionTime
          }
        }
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private normalizeInput(input: AgentInput, config: DivisionAgentConfig): NormalizedDivisionInput | null {
    const raw = input as Record<string, unknown>;
    const objectiveRaw = raw['objective'];
    if (typeof objectiveRaw !== 'string' || objectiveRaw.trim().length === 0) {
      return null;
    }

    const focusAreasRaw = raw['focusAreas'];
    const constraintsRaw = raw['constraints'];
    const deliverableRaw = raw['deliverableFormat'];
    const providerRaw = raw['preferProvider'];
    const contextRaw = raw['context'];

    const focusAreas = Array.isArray(focusAreasRaw)
      ? focusAreasRaw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim())
      : config.defaultFocusAreas;

    const constraints = Array.isArray(constraintsRaw)
      ? constraintsRaw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim())
      : config.defaultConstraints;

    const deliverableFormat = typeof deliverableRaw === 'string' && deliverableRaw.trim().length > 0
      ? deliverableRaw.trim().toLowerCase()
      : config.defaultDeliverableFormat;

    const preferProvider: ProviderPreference = providerRaw === 'openai' || providerRaw === 'anthropic' || providerRaw === 'balanced'
      ? providerRaw
      : 'balanced';

    let context: string | undefined;
    if (typeof contextRaw === 'string') {
      context = contextRaw.trim();
    } else if (contextRaw && typeof contextRaw === 'object') {
      try {
        context = JSON.stringify(contextRaw);
      } catch {
        context = undefined;
      }
    }

    const normalized: NormalizedDivisionInput = {
      objective: objectiveRaw.trim(),
      focusAreas,
      constraints,
      deliverableFormat,
      preferProvider
    };

    if (context) {
      normalized.context = context;
    }

    return normalized;
  }

  private buildResearchPrompt(config: DivisionAgentConfig, input: NormalizedDivisionInput): string {
    return `You lead the ${config.divisionName}. Mission: ${config.mission}.

Objective: ${input.objective}
Context: ${input.context ?? 'No additional context provided.'}
Preferred provider balance: ${input.preferProvider}.

Key responsibilities:
${config.keyResponsibilities.map((item) => `- ${item}`).join('\n')}

Focus areas:
${input.focusAreas.map((item) => `- ${item}`).join('\n')}

Constraints:
${input.constraints.map((item) => `- ${item}`).join('\n')}

Specialized directives:
${config.specializedGuidance.map((item) => `- ${item}`).join('\n')}

Research requirements:
1. Reference at least three relevant sections from the most recent OpenAI documentation (e.g., GPT-4.1, GPT-4o, o1, function calling, Realtime API) that support the objective.
2. Reference at least three relevant sections from the most recent Anthropic Claude documentation (e.g., Claude 3.5 Sonnet, Tool Use API, Workbench guides).
3. Summarize opportunities, trade-offs, and integration touchpoints specific to the ${config.divisionName}.
4. Highlight any compliance, observability, or security considerations tied to the constraints.

Return a structured summary with headings: Provider Insights, Integration Opportunities, Risks & Mitigations, Open Questions.`;
  }

  private buildPlanningPrompt(config: DivisionAgentConfig, input: NormalizedDivisionInput, researchSummary: string): string {
    return `You are converting research into an actionable plan for the ${config.divisionName}.

Objective: ${input.objective}
Focus Areas: ${input.focusAreas.join(', ')}
Constraints: ${input.constraints.join(', ')}
Preferred provider balance: ${input.preferProvider}

Research findings:
${researchSummary}

Create a phased execution plan with the following structure:
- Phase Overview (with goals, entry criteria, exit criteria)
- Cross-team Collaborations (explicitly outline dependencies with: ${config.collaborationPartners.join(', ') || 'None'})
- OpenAI Feature Usage (tie features to focus areas)
- Anthropic Feature Usage (tie features to focus areas)
- Risk Management aligned to success metrics (${config.successMetrics.join(', ')})

Ensure each phase maps to at least one success metric and explicitly calls out measurable outcomes.`;
  }

  private buildDeliverablePrompt(config: DivisionAgentConfig, input: NormalizedDivisionInput, researchSummary: string, planSummary: string): string {
    return `Compose a ${input.deliverableFormat} for the ${config.divisionName}.

Mission reminder: ${config.mission}
Objective: ${input.objective}
Preferred provider balance: ${input.preferProvider}

Include the following sections in order:
${config.deliverableSections.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Incorporate:
- Key insights from research:
${researchSummary}
- Execution highlights:
${planSummary}
- Explicit recommendations on documentation hand-offs, instrumentation, and readiness signals.

Use executive-friendly tone with bullet lists, tables where helpful, and concise call-to-action notes.`;
  }

  private buildModelStrategyPrompt(
    config: DivisionAgentConfig,
    input: NormalizedDivisionInput,
    researchProvider: ModelProvider,
    planningProvider: ModelProvider,
    deliverableProvider: ModelProvider,
    planSummary: string
  ): string {
    return `Create a decision playbook for the ${config.divisionName} indicating how to balance OpenAI and Anthropic usage.

Inputs:
- Preferred provider balance requested: ${input.preferProvider}
- Provider utilized during research: ${researchProvider}
- Provider utilized during planning: ${planningProvider}
- Provider utilized during deliverable authoring: ${deliverableProvider}

Execution plan context:
${planSummary}

Deliver:
1. Provider selection matrix (OpenAI vs Anthropic) across lifecycle stages (Discovery, Design, Implementation, Verification, Continuous Improvement).
2. Situations where co-execution or hand-off between providers is advantageous.
3. Guardrails for compliance, cost, and latency that align with success metrics (${config.successMetrics.join(', ')}).
4. Monitoring signals to validate the strategy over time.`;
  }
}

export class ExternalInterfacesDivisionAgent extends AbstractDivisionAgent {
  readonly name = 'ExternalInterfacesDivisionAgent';
  readonly version = '1.0.0';
  readonly description = 'Guides CLI, REST, WebSocket, and dashboard experiences with cohesive developer and user workflows.';

  protected getDivisionConfig(): DivisionAgentConfig {
    return {
      divisionName: 'External Interfaces Division',
      mission: 'Deliver cohesive, secure, and discoverable interfaces across CLI, REST, WebSocket, and web dashboard surfaces.',
      keyResponsibilities: [
        'Architect consistent contracts and versioning across all external entry points',
        'Ensure authentication, rate limiting, and observability are uniform across interfaces',
        'Champion developer onboarding, documentation alignment, and feedback loops',
        'Design real-time interaction patterns and streaming experiences that feel native',
        'Balance DX polish with operational resilience and accessibility requirements'
      ],
      collaborationPartners: [
        'Core System Division for orchestrator and gateway alignment',
        'Agent Ecosystem Division for capability exposure',
        'Documentation Division for interface guidelines',
        'Security & Infrastructure teams for policy compliance'
      ],
      successMetrics: [
        'Time-to-first-success for new developers',
        'Latency budgets for interactive flows',
        'Interface adoption and satisfaction scores',
        'Documentation completeness and accuracy',
        'Accessibility and compliance adherence'
      ],
      defaultFocusAreas: [
        'CLI ergonomics and automation hooks',
        'REST and WebSocket contract governance',
        'Web dashboard UX and real-time telemetry',
        'Authentication flows and permission models',
        'Progressive rollout and version compatibility'
      ],
      defaultConstraints: [
        'Must remain backward compatible with current clients',
        'Respect enterprise authentication and auditing requirements',
        'Support low-bandwidth environments gracefully',
        'Instrument interfaces for detailed usage analytics'
      ],
      deliverableSections: [
        'Executive Summary',
        'Interface Portfolio Overview',
        'Provider Capability Mapping',
        'Operational & Security Considerations',
        'Action Plan & Readiness Checklist'
      ],
      defaultDeliverableFormat: 'interface-integration-brief',
      specializedGuidance: [
        'Leverage OpenAI Realtime API and Anthropic streaming responses to craft responsive developer tooling experiences',
        'Account for documentation-driven development workflows and changelog automation',
        'Highlight mechanisms for interface discoverability and SDK alignment'
      ]
    };
  }
}

export class CoreSystemDivisionAgent extends AbstractDivisionAgent {
  readonly name = 'CoreSystemDivisionAgent';
  readonly version = '1.0.0';
  readonly description = 'Oversees orchestrator, model routing, monitoring, and dev tooling cohesion within the core system layer.';

  protected getDivisionConfig(): DivisionAgentConfig {
    return {
      divisionName: 'Core System Division',
      mission: 'Maintain resilient orchestrator, routing, monitoring, and tooling foundations that empower every other division.',
      keyResponsibilities: [
        'Optimize orchestrator workflow execution, resilience, and observability',
        'Tune model routing, fallbacks, and provider cost/performance balances',
        'Advance monitoring instrumentation, alerting, and feedback loops',
        'Evolve developer tooling integrations such as AIDevTools and Context7',
        'Enable safe experimentation with new provider capabilities and features'
      ],
      collaborationPartners: [
        'External Interfaces Division for consistent gateway behaviors',
        'Agent Ecosystem Division for capability requirements',
        'Infrastructure Division for runtime and deployment readiness',
        'Security & Compliance teams for policy enforcement'
      ],
      successMetrics: [
        'Workflow execution success rate and latency',
        'Model routing efficiency and fallback efficacy',
        'Mean time to detect and resolve system anomalies',
        'Developer satisfaction with tooling diagnostics',
        'Cost efficiency across providers without degrading quality'
      ],
      defaultFocusAreas: [
        'Orchestrator scalability and workflow orchestration',
        'Circuit breaker and retry policy optimization',
        'Model performance telemetry and adaptive routing',
        'Monitoring dashboards and automated remediation',
        'Context7 research pipelines and knowledge caches'
      ],
      defaultConstraints: [
        'Zero downtime for critical workflows',
        'Must provide auditable decision trails',
        'Support staged rollout of new models and features',
        'Align with budget guardrails for provider usage'
      ],
      deliverableSections: [
        'Executive Overview',
        'System Architecture Health',
        'Provider Capability Alignment',
        'Operations & Observability Enhancements',
        'Roadmap & Experimentation Backlog'
      ],
      defaultDeliverableFormat: 'core-systems-operating-brief',
      specializedGuidance: [
        'Map OpenAI function calling and batch inference capabilities to orchestrator needs',
        'Incorporate Anthropic Claude Workflows and tool-use guardrails for analysis tasks',
        'Surface opportunities for automated regression detection and rollout safety'
      ]
    };
  }
}

export class AgentEcosystemDivisionAgent extends AbstractDivisionAgent {
  readonly name = 'AgentEcosystemDivisionAgent';
  readonly version = '1.0.0';
  readonly description = 'Shapes the portfolio of specialized agents, ensuring interoperability, knowledge sharing, and continuous improvement.';

  protected getDivisionConfig(): DivisionAgentConfig {
    return {
      divisionName: 'Agent Ecosystem Division',
      mission: 'Grow and curate a network of specialized agents that collaborate effectively and evolve with the platform.',
      keyResponsibilities: [
        'Design agent capabilities, prompts, and upgrade paths aligned with division missions',
        'Orchestrate inter-agent workflows and knowledge sharing primitives',
        'Codify advanced prompt engineering, tool use, and safety best practices',
        'Evaluate provider strengths to pair agents with optimal reasoning modalities',
        'Establish telemetry for agent performance, drift, and retraining triggers'
      ],
      collaborationPartners: [
        'Core System Division for orchestrator integrations',
        'Documentation Division for behavior playbooks',
        'External Interfaces Division for surface alignment',
        'Infrastructure Division for deployment automation'
      ],
      successMetrics: [
        'Agent success and adoption rates across workflows',
        'Coverage of domain responsibilities and reduction in gaps',
        'Prompt quality improvements and hallucination reduction',
        'Cross-agent collaboration efficiency',
        'Turnaround time for deploying upgraded agent capabilities'
      ],
      defaultFocusAreas: [
        'Agent lifecycle management and capability matrices',
        'Advanced prompt engineering patterns and reusable templates',
        'Tool use orchestration and shared memory channels',
        'Evaluation harnesses and regression suites',
        'Safety, alignment, and governance mechanisms'
      ],
      defaultConstraints: [
        'Ensure prompts remain source-of-truth documented',
        'Avoid capability overlap that introduces ambiguity',
        'Maintain clear escalation and fallback pathways',
        'Meet compliance standards for AI governance'
      ],
      deliverableSections: [
        'Strategic Summary',
        'Capability Portfolio Map',
        'Prompt & Tooling Innovations',
        'Evaluation & Quality Framework',
        'Execution Timeline & Collaboration Calls'
      ],
      defaultDeliverableFormat: 'agent-ecosystem-strategy-brief',
      specializedGuidance: [
        'Leverage OpenAI prompt engineering guides and tool-calling blueprints for rapid agent iteration',
        'Use Anthropic Claude Workbench and beta features for deep reasoning enhancements',
        'Codify knowledge distillation between agents using shared context or embeddings'
      ]
    };
  }
}

export class DataAccessDivisionAgent extends AbstractDivisionAgent {
  readonly name = 'DataAccessDivisionAgent';
  readonly version = '1.0.0';
  readonly description = 'Secures and optimizes the database, caching, external API, and storage layers that feed the platform.';

  protected getDivisionConfig(): DivisionAgentConfig {
    return {
      divisionName: 'Data Access Division',
      mission: 'Provide reliable, performant, and secure data access across databases, caches, external APIs, and storage layers.',
      keyResponsibilities: [
        'Design schema evolution strategies and data governance rules',
        'Optimize query performance, caching, and replication topologies',
        'Manage integrations with external APIs and data sources',
        'Implement observability for data pipelines and failure recovery',
        'Ensure compliance, encryption, and retention policies are enforced'
      ],
      collaborationPartners: [
        'Core System Division for telemetry and orchestration hooks',
        'Infrastructure Division for deployment and scaling',
        'Security teams for compliance and auditing',
        'Agent Ecosystem Division for data contract requirements'
      ],
      successMetrics: [
        'Query performance and cache hit ratios',
        'Data freshness and availability SLA adherence',
        'Incident rate related to data integrity or access',
        'Compliance audit pass rates',
        'Cost efficiency for storage and data transfer'
      ],
      defaultFocusAreas: [
        'PostgreSQL schema evolution, migrations, and partitioning',
        'Caching (Redis) strategies and invalidation policies',
        'External API rate limits and data contract governance',
        'Backup, recovery, and disaster readiness',
        'Data observability and lineage tracking'
      ],
      defaultConstraints: [
        'Zero data loss tolerance for critical domains',
        'Encrypt data at rest and in transit',
        'Respect data residency and retention requirements',
        'Support blue/green or canary deployment patterns for data changes'
      ],
      deliverableSections: [
        'Mission & Context Overview',
        'Data Architecture Status',
        'Provider Capability Utilization',
        'Risk & Compliance Posture',
        'Execution Roadmap & KPIs'
      ],
      defaultDeliverableFormat: 'data-access-operating-plan',
      specializedGuidance: [
        'Map OpenAI structured output and embeddings to data quality automation',
        'Use Anthropic analysis strengths for anomaly detection and policy validation',
        'Detail cross-region and multi-tenant considerations for scaling'
      ]
    };
  }
}

export class InfrastructureDivisionAgent extends AbstractDivisionAgent {
  readonly name = 'InfrastructureDivisionAgent';
  readonly version = '1.0.0';
  readonly description = 'Owns deployment, security, observability, and reliability across environments.';

  protected getDivisionConfig(): DivisionAgentConfig {
    return {
      divisionName: 'Infrastructure & Security Division',
      mission: 'Operate secure, observable, and scalable infrastructure across development, staging, and production environments.',
      keyResponsibilities: [
        'Manage CI/CD pipelines, deployment strategies, and environment parity',
        'Implement security controls, secrets management, and threat detection',
        'Own infrastructure-as-code, container orchestration, and runtime optimization',
        'Coordinate incident response and game-day exercises',
        'Ensure compliance with organizational and industry standards'
      ],
      collaborationPartners: [
        'Data Access Division for storage and replication considerations',
        'Core System Division for runtime requirements',
        'Security leadership for compliance and audits',
        'External Interfaces Division for edge delivery and latency improvements'
      ],
      successMetrics: [
        'Deployment success rate and rollback frequency',
        'Mean time to detect and recover from incidents',
        'Security incident rate and resolution time',
        'Cost efficiency across environments',
        'Coverage of observability and alerting playbooks'
      ],
      defaultFocusAreas: [
        'Docker and orchestration pipelines',
        'Secrets management and zero-trust enforcement',
        'Observability stacks and SLO management',
        'Incident response automation and runbooks',
        'Infrastructure cost governance and autoscaling'
      ],
      defaultConstraints: [
        'Enforce least privilege and immutable infrastructure principles',
        'Maintain auditable deployment trails and approvals',
        'Support multi-environment rollout safety',
        'Meet compliance frameworks relevant to the organization'
      ],
      deliverableSections: [
        'Strategic Overview',
        'Environment & Deployment Readiness',
        'Security & Compliance Controls',
        'Observability & Reliability Enhancements',
        'Action Plan & Incident Preparedness'
      ],
      defaultDeliverableFormat: 'infrastructure-operational-brief',
      specializedGuidance: [
        'Reference OpenAI and Anthropic deployment hardening practices for secure API usage',
        'Incorporate model monitoring and drift detection into infrastructure observability',
        'Plan blue/green and canary strategies leveraging provider-specific rollout controls'
      ]
    };
  }
}
