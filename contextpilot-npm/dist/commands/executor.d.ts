import { WorkspaceManager } from '../workspace/manager';
import { CommandResult, ToolResult } from '../types/protocol';
import { CommandDefinition } from './registry';
export interface CommandExecutionRequest {
    action: string;
    args?: Record<string, any>;
    operationId?: string;
}
export declare const DEFAULT_TIMEOUT_MS = 120000;
/** Structured error for a missing/unknown action. */
export declare function actionNotFound(action: string): CommandResult;
/** Structured result when the underlying executable is missing. */
export declare function unavailableResult(def: CommandDefinition, operationId?: string): CommandResult;
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
//# sourceMappingURL=executor.d.ts.map