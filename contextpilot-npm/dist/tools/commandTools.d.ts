import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';
export declare function registerCommandTools(workspace: WorkspaceManager): {
    run_flutter_command: (args: any) => Promise<ToolResult>;
    run_npm_command: (args: any) => Promise<ToolResult>;
    run_git_command: (args: any) => Promise<ToolResult>;
    run_docker_command: (args: any) => Promise<ToolResult>;
    run_python_command: (args: any) => Promise<ToolResult>;
};
//# sourceMappingURL=commandTools.d.ts.map