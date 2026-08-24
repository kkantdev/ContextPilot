"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEOUT_MS = void 0;
exports.actionNotFound = actionNotFound;
exports.unavailableResult = unavailableResult;
exports.runCommandTemplate = runCommandTemplate;
exports.commandResultToToolResult = commandResultToToolResult;
const child_process_1 = require("child_process");
const registry_1 = require("./registry");
const systemTools_1 = require("../tools/systemTools");
exports.DEFAULT_TIMEOUT_MS = 120_000;
/** Structured error for a missing/unknown action. */
function actionNotFound(action) {
    return {
        action,
        status: 'failed',
        exitCode: null,
        stdout: '',
        stderr: '',
        durationMs: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: `Action "${action}" is not a supported ContextPilot command.`,
    };
}
/** Structured result when the underlying executable is missing. */
function unavailableResult(def, operationId) {
    return {
        action: def.action,
        operationId,
        tool: def.executable,
        status: 'unavailable',
        exitCode: null,
        stdout: '',
        stderr: '',
        durationMs: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: `${cap(def.executable)} is not installed or is not available in PATH. ` +
            `Install it and try again. (Requested action: ${def.action})`,
    };
}
function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
/**
 * The single controlled entrypoint for running developer commands.
 * - Resolves a typed command template (no raw shell string from phone/LLM).
 * - Blocks/denies disallowed templates at the ContextPilot layer.
 * - Pre-checks the executable exists.
 * - Runs inside the project root with a bounded timeout.
 */
async function runCommandTemplate(workspace, template) {
    const def = (0, registry_1.getCommandDefinition)(template.action);
    if (!def)
        return actionNotFound(template.action);
    const blocked = (0, registry_1.isBlockedCommand)(def, template.args || {});
    if (blocked.blocked) {
        return {
            action: def.action,
            operationId: template.operationId,
            tool: def.executable,
            status: 'blocked',
            exitCode: null,
            stdout: '',
            stderr: '',
            durationMs: 0,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            error: blocked.reason || 'Blocked by ContextPilot policy.',
        };
    }
    if (!(0, systemTools_1.executableAvailable)(def.executable)) {
        return unavailableResult(def, template.operationId);
    }
    const command = def.build(template.args || {});
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    return await new Promise((resolve) => {
        (0, child_process_1.exec)(command, {
            cwd: workspace.getWorkspaceRoot(),
            timeout: exports.DEFAULT_TIMEOUT_MS,
            maxBuffer: 1024 * 1024 * 5,
        }, (error, stdout, stderr) => {
            const durationMs = Date.now() - startTime;
            const exitCode = error?.code ?? 0;
            const completedAt = new Date().toISOString();
            const failure = Boolean(error);
            resolve({
                action: def.action,
                operationId: template.operationId,
                tool: def.executable,
                status: failure ? 'failed' : 'success',
                exitCode,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                durationMs,
                startedAt,
                completedAt,
                ...(failure ? { error: error?.message || 'Command exited with non-zero status' } : {}),
            });
        });
    });
}
/** Converts a CommandResult to the existing ToolResult shape for the registry. */
function commandResultToToolResult(commandResult, toolName) {
    return {
        tool: toolName,
        success: commandResult.status === 'success',
        output: commandResult,
        ...(commandResult.error ? { error: commandResult.error } : {}),
        durationMs: commandResult.durationMs,
    };
}
//# sourceMappingURL=executor.js.map