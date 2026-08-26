"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommandTools = registerCommandTools;
const registry_1 = require("../commands/registry");
const systemTools_1 = require("./systemTools");
const executor_1 = require("../commands/executor");
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
    // Delegate to streaming executor
    const request = {
        action: actionName,
        args: args || {},
        // Note: No operationId here as this is direct tool execution, not operation-based
    };
    try {
        const commandResult = await (0, executor_1.runCommandTemplate)(workspace, request);
        return (0, executor_1.commandResultToToolResult)(commandResult, toolName);
    }
    catch (error) {
        return {
            tool: toolName,
            success: false,
            output: null,
            error: error?.message || 'Command execution failed',
            durationMs: Date.now() - startTime,
        };
    }
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