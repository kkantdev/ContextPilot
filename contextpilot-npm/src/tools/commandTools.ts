import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';
import { getCommandDefinition, CommandDefinition, isBlockedCommand } from '../commands/registry';
import { executableAvailable } from './systemTools';
import { runCommandTemplate, commandResultToToolResult, CommandExecutionRequest } from '../commands/executor';

type Group = 'flutter' | 'npm' | 'git' | 'docker' | 'python';

const GROUP_TOOLS: Record<Group, string> = {
  flutter: 'run_flutter_command',
  npm: 'run_npm_command',
  git: 'run_git_command',
  docker: 'run_docker_command',
  python: 'run_python_command',
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Executes a typed command action belonging to a specific tool group.
 * The tool layer only accepts actions from the group's allowlist; the raw
 * shell string is always derived from a CommandDefinition template and never
 * accepted from the phone or LLM.
 */
async function runAction(
  workspace: WorkspaceManager,
  group: Group,
  actionName: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const toolName = GROUP_TOOLS[group];
  const startTime = Date.now();

  const def: CommandDefinition | undefined = getCommandDefinition(actionName);
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
  const blocked = isBlockedCommand(def, args || {});
  if (blocked.blocked) {
    return {
      tool: toolName,
      success: false,
      output: null,
      error: blocked.reason || 'Blocked by ContextPilot policy.',
      durationMs: Date.now() - startTime,
    };
  }

  if (!executableAvailable(def.executable)) {
    return {
      tool: toolName,
      success: false,
      output: null,
      error: `${cap(def.executable)} is not installed or is not available in PATH.`,
      durationMs: Date.now() - startTime,
    };
  }

  // Delegate to streaming executor
  const request: CommandExecutionRequest = {
    action: actionName,
    args: args || {},
    // Note: No operationId here as this is direct tool execution, not operation-based
  };

  try {
    const commandResult = await runCommandTemplate(workspace, request);
    return commandResultToToolResult(commandResult, toolName);
  } catch (error: any) {
    return {
      tool: toolName,
      success: false,
      output: null,
      error: error?.message || 'Command execution failed',
      durationMs: Date.now() - startTime,
    };
  }
}

export function registerCommandTools(workspace: WorkspaceManager) {
  return {
    run_flutter_command: async (args: any) => runAction(workspace, 'flutter', args?.action, args),
    run_npm_command: async (args: any) => runAction(workspace, 'npm', args?.action, args),
    run_git_command: async (args: any) => runAction(workspace, 'git', args?.action, args),
    run_docker_command: async (args: any) => runAction(workspace, 'docker', args?.action, args),
    run_python_command: async (args: any) => runAction(workspace, 'python', args?.action, args),
  };
}