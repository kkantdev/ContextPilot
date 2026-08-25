import { WorkspaceManager } from '../workspace/manager';
import { ToolRegistry } from '../tools/registry';
import { Plan } from '../types/protocol';
import { AgentConfig } from '../config';
export declare class AIOrchestrator {
    private primaryAdapter;
    private fallbackAdapter;
    private workspace;
    private toolRegistry;
    private useMock;
    constructor(config: AgentConfig, workspace: WorkspaceManager, toolRegistry: ToolRegistry);
    planUserRequest(userPrompt: string): Promise<Plan>;
}
//# sourceMappingURL=orchestrator.d.ts.map