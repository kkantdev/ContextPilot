import { ChildProcess } from 'child_process';
import { WorkspaceManager } from '../workspace/manager';
import { CommandResult, ToolResult, CommandOutputChunk } from '../types/protocol';
import { CommandDefinition } from './registry';
export interface CommandExecutionRequest {
    action: string;
    args?: Record<string, any>;
    operationId?: string;
    requestId?: string;
    /** Live output callback: called per chunk as stdout/stderr arrives. */
    onOutput?: (chunk: CommandOutputChunk) => void;
    /** Event broadcast callback: called to emit command.* streaming events. */
    onEvent?: (eventType: string, payload: any) => void;
    /** Cancellation: set to true to terminate the running child process. */
    cancelledRef?: {
        cancelled: boolean;
    };
}
export declare const DEFAULT_TIMEOUT_MS = 120000;
/** Tracks the operating system child process for the given operation. */
export declare class RunningCommand {
    readonly operationId: string;
    readonly requestId?: string | undefined;
    private handle;
    constructor(operationId: string, requestId?: string | undefined);
    setHandle(p: ChildProcess): void;
    kill(): void;
}
/** Registry of live running commands by operationId (for cancellation). */
export declare const runningProcesses: Map<string, RunningCommand>;
/** Structured error for a missing/unknown action. */
export declare function actionNotFound(action: string): CommandResult;
/** Structured result when the underlying executable is missing. */
export declare function unavailableResult(def: CommandDefinition, operationId?: string, requestId?: string): CommandResult;
/**
 * The single controlled entrypoint for running developer commands.
 * - Resolves a typed command template (no raw shell string from phone/LLM).
 * - Blocks/denies disallowed templates at the ContextPilot layer.
 * - Pre-checks the executable exists.
 * - Runs inside the project root with a bounded timeout.
 */
export declare function runCommandTemplate(workspace: WorkspaceManager, template: CommandExecutionRequest): Promise<CommandResult>;
/** Converts a CommandResult to the existing ToolResult shape for the registry. */
export declare function commandResultToToolResult(commandResult: CommandResult, toolName: string): ToolResult;
/** Cancel a running command by operationId. Returns true if found and killed. */
export declare function cancelCommand(operationId: string): boolean;
//# sourceMappingURL=executor.d.ts.map