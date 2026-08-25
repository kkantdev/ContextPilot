import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';
export declare function registerTerminalTools(workspace: WorkspaceManager): {
    run_command: (args: {
        command: string;
        timeoutMs?: number;
    }) => Promise<ToolResult>;
};
//# sourceMappingURL=terminalTools.d.ts.map