import { AIAdapter } from './adapter';
import { Plan, ToolDefinition } from '../types/protocol';
export declare class OllamaAdapter implements AIAdapter {
    name: string;
    private baseUrl;
    private modelName;
    constructor(baseUrl?: string, modelName?: string, detectedModel?: string | null);
    isAvailable(): Promise<boolean>;
    generatePlan(prompt: string, context: string, availableTools: ToolDefinition[]): Promise<Plan>;
}
//# sourceMappingURL=ollamaAdapter.d.ts.map