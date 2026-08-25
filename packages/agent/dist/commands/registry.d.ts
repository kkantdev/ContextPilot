import { RiskLevel } from '../types/protocol';
export type CommandGroup = 'flutter' | 'npm' | 'git' | 'docker' | 'python';
export interface CommandDefinition {
    action: string;
    group: CommandGroup;
    /** Human readable description shown in phone approvals. */
    description: string;
    /** The executable to validate presence of before running. */
    executable: string;
    build: (args: Record<string, any>) => string;
    risk: RiskLevel;
    longRunning?: boolean;
}
declare function gitIsBlocked(args: Record<string, any>): boolean;
export declare const COMMAND_REGISTRY: CommandDefinition[];
export declare function getCommandDefinition(action: string): CommandDefinition | undefined;
export declare function isBlockedCommand(def: CommandDefinition, args: Record<string, any>): {
    blocked: boolean;
    reason?: string;
};
export declare function listCommandActions(): string[];
export { gitIsBlocked };
//# sourceMappingURL=registry.d.ts.map