export class Orchestrator {
    agents = new Map();
    registerAgent(agent) {
        this.agents.set(agent.name, agent);
    }
    async delegate(agentName, input) {
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
