"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runningProcesses = exports.RunningCommand = exports.DEFAULT_TIMEOUT_MS = void 0;
exports.actionNotFound = actionNotFound;
exports.unavailableResult = unavailableResult;
exports.runCommandTemplate = runCommandTemplate;
exports.commandResultToToolResult = commandResultToToolResult;
exports.cancelCommand = cancelCommand;
const child_process_1 = require("child_process");
const registry_1 = require("./registry");
const systemTools_1 = require("../tools/systemTools");
exports.DEFAULT_TIMEOUT_MS = 120_000;
/** Check if an executable needs Windows ComSpec shell for .cmd/.bat shims */
function needsWindowsShell(executable) {
    if (process.platform !== 'win32' || !process.env.ComSpec) {
        return false;
    }
    // These executables are typically .cmd shims on Windows
    const windowsShimExecutables = ['npm', 'flutter', 'yarn', 'pnpm'];
    return windowsShimExecutables.includes(executable.toLowerCase());
}
/** Tracks the operating system child process for the given operation. */
class RunningCommand {
    operationId;
    requestId;
    handle = null;
    constructor(operationId, requestId) {
        this.operationId = operationId;
        this.requestId = requestId;
    }
    setHandle(p) {
        this.handle = p;
    }
    kill() {
        try {
            this.handle?.kill();
        }
        catch {
            /* already exited */
        }
    }
}
exports.RunningCommand = RunningCommand;
/** Registry of live running commands by operationId (for cancellation). */
exports.runningProcesses = new Map();
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
function unavailableResult(def, operationId, requestId) {
    return {
        action: def.action,
        operationId,
        requestId,
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
function emitChunk(template, stream, data) {
    // Emit legacy output chunk
    template.onOutput?.({ operationId: template.operationId || '', requestId: template.requestId, stream, data });
    // Emit new command.output streaming event
    template.onEvent?.('command.output', {
        requestId: template.requestId || template.operationId || '',
        stream,
        data,
    });
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
        return unavailableResult(def, template.operationId, template.requestId);
    }
    const command = def.build(template.args || {});
    const projectDir = workspace.getWorkspaceRoot();
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const stdoutParts = [];
    const stderrParts = [];
    // Emit command.start event
    template.onEvent?.('command.start', {
        requestId: template.requestId || template.operationId || '',
        action: def.action,
        projectDir,
    });
    // Exposed so a caller (OperationManager) can kill the specific child process.
    let activeProcess = null;
    const finalize = (status, exitCode, error) => {
        const durationMs = Date.now() - startTime;
        const result = {
            action: def.action,
            operationId: template.operationId,
            requestId: template.requestId,
            projectDir,
            command,
            tool: def.executable,
            status,
            exitCode,
            stdout: stdoutParts.join('').trim(),
            stderr: stderrParts.join('').trim(),
            durationMs,
            startedAt,
            completedAt: new Date().toISOString(),
            ...(error ? { error } : {}),
        };
        // Emit appropriate command.* completion event
        const requestId = template.requestId || template.operationId || '';
        if (status === 'cancelled') {
            template.onEvent?.('command.cancelled', { requestId });
        }
        else if (status === 'failed' || status === 'blocked' || status === 'unavailable') {
            template.onEvent?.('command.error', {
                requestId,
                error: error || 'Command failed',
                exitCode,
            });
        }
        else if (status === 'success') {
            template.onEvent?.('command.completed', {
                requestId,
                exitCode,
            });
        }
        return result;
    };
    // Check if we need Windows shell but ComSpec is not available
    if (process.platform === 'win32' && needsWindowsShell(def.executable) && !process.env.ComSpec) {
        return finalize('failed', null, `Windows ComSpec not available for executing ${def.executable} command`);
    }
    const runWith = (exe, args) => new Promise((resolve) => {
        let proc;
        try {
            proc = (0, child_process_1.spawn)(exe, args, { cwd: projectDir });
        }
        catch (e) {
            resolve(finalize('failed', null, e?.message || 'Failed to spawn command'));
            return;
        }
        activeProcess = proc;
        // Register process for cancellation if operationId is provided
        if (template.operationId) {
            const runningCmd = new RunningCommand(template.operationId, template.requestId);
            runningCmd.setHandle(proc);
            exports.runningProcesses.set(template.operationId, runningCmd);
        }
        const onStdout = (data) => {
            const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
            stdoutParts.push(text);
            if (template.onOutput)
                emitChunk(template, 'stdout', text);
        };
        const onStderr = (data) => {
            const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
            stderrParts.push(text);
            if (template.onOutput)
                emitChunk(template, 'stderr', text);
        };
        proc.stdout.on('data', onStdout);
        proc.stderr.on('data', onStderr);
        // Timeout guard: hard-kills this specific child if it runs too long.
        const timer = setTimeout(() => {
            try {
                proc.kill();
            }
            catch {
                /* already exited */
            }
        }, exports.DEFAULT_TIMEOUT_MS);
        proc.on('exit', (code) => {
            clearTimeout(timer);
            activeProcess = null;
            // Cleanup from running processes registry
            if (template.operationId) {
                exports.runningProcesses.delete(template.operationId);
            }
            if (template.cancelledRef && template.cancelledRef.cancelled) {
                resolve(finalize('cancelled', code === null ? null : code));
            }
            else {
                resolve(finalize(code === 0 ? 'success' : 'failed', code));
            }
        });
    });
    // On Windows, `.cmd`/`.bat` shims (npm, flutter) cannot be spawned directly
    // by spawn(), so route the fully-resolved template command through cmd.exe.
    if (needsWindowsShell(def.executable)) {
        // Use /d to disable execution of AutoRun commands from registry
        // Use /s to modify the treatment of string after /c
        // Use /c to execute the command and terminate
        return await runWith(process.env.ComSpec, ['/d', '/s', '/c', command]);
    }
    // For non-Windows or non-shim executables, spawn directly
    const parts = command.split(' ');
    const executable = parts[0];
    const cmdArgs = parts.slice(1);
    return await runWith(executable, cmdArgs);
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
/** Cancel a running command by operationId. Returns true if found and killed. */
function cancelCommand(operationId) {
    const runningCmd = exports.runningProcesses.get(operationId);
    if (runningCmd) {
        runningCmd.kill();
        exports.runningProcesses.delete(operationId);
        return true;
    }
    return false;
}
//# sourceMappingURL=executor.js.map