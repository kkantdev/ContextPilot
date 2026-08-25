import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';
export declare function registerFileTools(workspace: WorkspaceManager): {
    list_directory: (args: {
        path?: string;
    }) => Promise<ToolResult>;
    read_file: (args: {
        path: string;
    }) => Promise<ToolResult>;
    search_code: (args: {
        query: string;
        path?: string;
    }) => Promise<ToolResult>;
    create_file: (args: {
        path: string;
        content?: string;
    }) => Promise<ToolResult>;
    create_folder: (args: {
        path: string;
    }) => Promise<ToolResult>;
    edit_file: (args: {
        path: string;
        content: string;
    }) => Promise<ToolResult>;
    delete_file: (args: {
        path: string;
    }) => Promise<ToolResult>;
};
//# sourceMappingURL=fileTools.d.ts.map