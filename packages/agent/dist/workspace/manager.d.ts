import { ProjectInfo } from '../types/protocol';
export declare class WorkspaceManager {
    private rootPath;
    constructor(workspacePath?: string);
    getWorkspaceRoot(): string;
    getProjectName(): string;
    /**
     * Resolves a target path relative to workspace root.
     * Throws an error if the path escapes the workspace root (path traversal attempt).
     */
    resolvePath(relativePath: string): string;
    /**
     * Validates if a path is inside the workspace without throwing.
     */
    isPathInWorkspace(targetPath: string): boolean;
    /**
     * Detects project metadata based on root files.
     */
    detectProject(): ProjectInfo;
    /**
     * Generates a structural summary tree of the project (up to depth 2, excluding node_modules, .git, build, dist).
     */
    generateProjectTreeSummary(maxDepth?: number): string;
}
//# sourceMappingURL=manager.d.ts.map