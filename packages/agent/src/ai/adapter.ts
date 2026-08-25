import { Plan, ToolDefinition } from '../types/protocol';

export interface AIAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  generatePlan(prompt: string, context: string, availableTools: ToolDefinition[]): Promise<Plan>;
}
