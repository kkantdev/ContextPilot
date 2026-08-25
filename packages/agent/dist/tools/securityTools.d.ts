import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';
export declare function registerSecurityTools(workspace: WorkspaceManager): {
    security_scan: () => Promise<ToolResult>;
};
//# sourceMappingURL=securityTools.d.ts.map