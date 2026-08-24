import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';
export declare function registerGitTools(workspace: WorkspaceManager): {
    git_status: () => Promise<ToolResult>;
    git_diff: (args: {
        path?: string;
    }) => Promise<ToolResult>;
};
//# sourceMappingURL=gitTools.d.ts.map