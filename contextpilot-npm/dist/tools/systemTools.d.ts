export interface EnvironmentTools {
    node: boolean;
    npm: boolean;
    git: boolean;
    flutter: boolean;
    docker: boolean;
    python: boolean;
    ollama: boolean;
    versions: Record<string, string>;
}
export declare function executableAvailable(executable: string): boolean;
/** Runs an executable's --version and returns the trimmed first line. */
export declare function getExecutableVersion(executable: string, args?: string[]): string | undefined;
export declare function detectEnvironment(): EnvironmentTools;
//# sourceMappingURL=systemTools.d.ts.map