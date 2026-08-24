import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';
export declare function registerTestTools(workspace: WorkspaceManager): {
    run_tests: (args: {
        command?: string;
    }) => Promise<ToolResult>;
};
//# sourceMappingURL=testTools.d.ts.map