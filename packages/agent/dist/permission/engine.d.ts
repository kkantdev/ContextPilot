import { RiskLevel } from '../types/protocol';
import { WorkspaceManager } from '../workspace/manager';
export interface PermissionCheckResult {
    allowed: boolean;
    requiresApproval: boolean;
    riskLevel: RiskLevel;
    reason?: string;
}
export declare class PermissionEngine {
    private workspace;
    constructor(workspace: WorkspaceManager);
    classifyRisk(toolName: string, args: Record<string, any>): RiskLevel;
    checkPermission(toolName: string, args: Record<string, any>): PermissionCheckResult;
}
//# sourceMappingURL=engine.d.ts.map