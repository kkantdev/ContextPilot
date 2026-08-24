import { WorkspaceManager } from '../workspace/manager';
import { PermissionEngine } from '../permission/engine';
import { ToolDefinition, ToolResult, RiskLevel } from '../types/protocol';
export type ToolExecutor = (args: any) => Promise<ToolResult>;
export interface RegisteredTool {
    definition: ToolDefinition;
    executor: ToolExecutor;
}
export declare class ToolRegistry {
    private tools;
    private permissionEngine;
    constructor(workspace: WorkspaceManager, permissionEngine: PermissionEngine);
    register(name: string, riskLevel: RiskLevel, description: string, inputSchema: Record<string, any>, executor: ToolExecutor): void;
    getToolDefinitions(): ToolDefinition[];
    getTool(name: string): RegisteredTool | undefined;
    executeTool(name: string, args?: Record<string, any>): Promise<ToolResult>;
}
//# sourceMappingURL=registry.d.ts.map