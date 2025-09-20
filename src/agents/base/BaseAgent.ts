export interface AgentInput {
  [key: string]: unknown;
}

export type AgentResult = 
  | { kind: 'ok'; data: unknown }
  | { kind: 'error'; code: string; message: string };

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract execute(input: AgentInput): Promise<AgentResult>;
}
