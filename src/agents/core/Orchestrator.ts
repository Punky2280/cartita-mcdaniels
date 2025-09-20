import { BaseAgent, AgentInput, AgentResult } from '../base/BaseAgent';

export class Orchestrator {
  private agents: Map<string, BaseAgent> = new Map();

  registerAgent(agent: BaseAgent) {
    this.agents.set(agent.name, agent);
  }

  async delegate(agentName: string, input: AgentInput): Promise<AgentResult> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      return { 
        kind: 'error', 
        code: 'agent_not_found', 
        message: `Agent '${agentName}' is not registered.`
      };
    }
    // TODO: Add tracing, policy enforcement, etc.
    return agent.execute(input);
  }
}
