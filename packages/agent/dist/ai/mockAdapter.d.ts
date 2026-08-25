import { AIAdapter } from './adapter';
import { Plan, ToolDefinition } from '../types/protocol';
export declare class MockAIAdapter implements AIAdapter {
    name: string;
    isAvailable(): Promise<boolean>;
    generatePlan(prompt: string, context: string, availableTools: ToolDefinition[]): Promise<Plan>;
}
//# sourceMappingURL=mockAdapter.d.ts.map