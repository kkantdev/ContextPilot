"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommandTools = registerCommandTools;
const child_process_1 = require("child_process");
const registry_1 = require("../commands/registry");
const systemTools_1 = require("./systemTools");
const GROUP_TOOLS = {
    flutter: 'run_flutter_command',
    npm: 'run_npm_command',
    git: 'run_git_command',
    docker: 'run_docker_command',
    python: 'run_python_command',
};
function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
/**
 * Executes a typed command action belonging to a specific tool group.
 * The tool layer only accepts actions from the group's allowlist; the raw
 * shell string is always derived from a CommandDefinition template and never
 * accepted from the phone or LLM.
 */
async function runAction(workspace, group, actionName, args) {
    const toolName = GROUP_TOOLS[group];
    const startTime = Date.now();
    const def = (0, registry_1.getCommandDefinition)(actionName);
    if (!def || def.group !== group) {
        return {
            tool: toolName,
            success: false,
            output: null,
            error: `Action "${actionName}" is not a valid ${group} command for ContextPilot.`,
            durationMs: Date.now() - startTime,
        };
    }
    // ContextPilot layer makes the final decision; a BLOCKED template is never
    // executed even if the phone or LLM requested it.
    const blocked = (0, registry_1.isBlockedCommand)(def, args || {});
    if (blocked.blocked) {
        return {
            tool: toolName,
            success: false,
            output: null,
            error: blocked.reason || 'Blocked by ContextPilot policy.',
            durationMs: Date.now() - startTime,
        };
    }
    if (!(0, systemTools_1.executableAvailable)(def.executable)) {
        return {
            tool: toolName,
            success: false,
            output: null,
            error: `${cap(def.executable)} is not installed or is not available in PATH.`,
            durationMs: Date.now() - startTime,
        };
    }
    const command = def.build(args || {});
    const startedAt = new Date().toISOString();
    return await new Promise((resolve) => {
        (0, child_process_1.exec)(command, { cwd: workspace.getWorkspaceRoot(), timeout: 120_000, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            const durationMs = Date.now() - startTime;
            const success = !error;
            const output = {
                action: def.action,
                status: success ? 'success' : 'failed',
                exitCode: error?.code ?? 0,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                durationMs,
                startedAt,
                completedAt: new Date().toISOString(),
            };
            resolve({
                tool: toolName,
                success,
                output,
                ...(!success ? { error: error?.message || 'Command exited with non-zero status' } : {}),
                durationMs,
            });
        });
    });
}
function registerCommandTools(workspace) {
    return {
        run_flutter_command: async (args) => runAction(workspace, 'flutter', args?.action, args),
        run_npm_command: async (args) => runAction(workspace, 'npm', args?.action, args),
        run_git_command: async (args) => runAction(workspace, 'git', args?.action, args),
        run_docker_command: async (args) => runAction(workspace, 'docker', args?.action, args),
        run_python_command: async (args) => runAction(workspace, 'python', args?.action, args),
    };
}
//# sourceMappingURL=commandTools.js.map