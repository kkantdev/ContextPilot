import { Plan, ApprovalRequest, OperationState, ToolResult } from '../types/protocol';
import { ToolRegistry } from '../tools/registry';
import { EventManager } from '../events/manager';
import { WorkspaceManager } from '../workspace/manager';
export interface ActiveOperation {
    operationId: string;
    userPrompt: string;
    state: OperationState;
    plan?: Plan;
    currentStepIndex: number;
    results: ToolResult[];
    pendingApproval?: ApprovalRequest;
}
export declare class OperationManager {
    private activeOperations;
    private toolRegistry;
    private eventManager;
    private workspaceManager;
    constructor(toolRegistry: ToolRegistry, eventManager: EventManager, workspaceManager: WorkspaceManager);
    createOperation(prompt: string): ActiveOperation;
    setPlan(operationId: string, plan: Plan): void;
    executeNextStep(operationId: string): Promise<void>;
    handleApprovalResponse(approvalId: string, approved: boolean, reason?: string): Promise<boolean>;
    getOperation(operationId: string): ActiveOperation | undefined;
    cancelOperation(operationId: string): boolean;
}
//# sourceMappingURL=manager.d.ts.map