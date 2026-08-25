import { Plan, ApprovalRequest, OperationState, ToolResult } from '../types/protocol';
import { ToolRegistry } from '../tools/registry';
import { EventManager } from '../events/manager';
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
    constructor(toolRegistry: ToolRegistry, eventManager: EventManager);
    createOperation(prompt: string): ActiveOperation;
    setPlan(operationId: string, plan: Plan): void;
    executeNextStep(operationId: string): Promise<void>;
    handleApprovalResponse(approvalId: string, approved: boolean, reason?: string): Promise<boolean>;
    getOperation(operationId: string): ActiveOperation | undefined;
}
//# sourceMappingURL=manager.d.ts.map