import { spawn, ChildProcess } from 'child_process';
import { WorkspaceManager } from '../workspace/manager';
import { CommandResult, ToolResult, CommandOutputChunk } from '../types/protocol';
import {
  CommandDefinition,
  getCommandDefinition,
  isBlockedCommand,
} from './registry';
import { executableAvailable } from '../tools/systemTools';

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
  cancelledRef?: { cancelled: boolean };
}

export const DEFAULT_TIMEOUT_MS = 120_000;

/** Check if an executable needs Windows ComSpec shell for .cmd/.bat shims */
function needsWindowsShell(executable: string): boolean {
  if (process.platform !== 'win32' || !process.env.ComSpec) {
    return false;
  }
  // These executables are typically .cmd shims on Windows
  const windowsShimExecutables = ['npm', 'flutter', 'yarn', 'pnpm'];
  return windowsShimExecutables.includes(executable.toLowerCase());
}

/** Tracks the operating system child process for the given operation. */
export class RunningCommand {
  private handle: ChildProcess | null = null;
  constructor(public readonly operationId: string, public readonly requestId?: string) {}
  setHandle(p: ChildProcess): void {
    this.handle = p;
  }
  kill(): void {
    try {
      this.handle?.kill();
    } catch {
      /* already exited */
    }
  }
}

/** Registry of live running commands by operationId (for cancellation). */
export const runningProcesses: Map<string, RunningCommand> = new Map();

/** Structured error for a missing/unknown action. */
export function actionNotFound(action: string): CommandResult {
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
export function unavailableResult(def: CommandDefinition, operationId?: string, requestId?: string): CommandResult {
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
    error:
      `${cap(def.executable)} is not installed or is not available in PATH. ` +
      `Install it and try again. (Requested action: ${def.action})`,
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function emitChunk(template: CommandExecutionRequest, stream: 'stdout' | 'stderr', data: string): void {
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
export async function runCommandTemplate(
  workspace: WorkspaceManager,
  template: CommandExecutionRequest
): Promise<CommandResult> {
  const def = getCommandDefinition(template.action);
  if (!def) return actionNotFound(template.action);

  const blocked = isBlockedCommand(def, template.args || {});
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

  if (!executableAvailable(def.executable)) {
    return unavailableResult(def, template.operationId, template.requestId);
  }

  const command = def.build(template.args || {});
  const projectDir = workspace.getWorkspaceRoot();
  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const stdoutParts: string[] = [];
  const stderrParts: string[] = [];
  
  // Emit command.start event
  template.onEvent?.('command.start', {
    requestId: template.requestId || template.operationId || '',
    action: def.action,
    projectDir,
  });
  
  // Exposed so a caller (OperationManager) can kill the specific child process.
  let activeProcess: ChildProcess | null = null;

  const finalize = (
    status: CommandResult['status'],
    exitCode: number | null,
    error?: string
  ): CommandResult => {
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
    } else if (status === 'failed' || status === 'blocked' || status === 'unavailable') {
      template.onEvent?.('command.error', {
        requestId,
        error: error || 'Command failed',
        exitCode,
      });
    } else if (status === 'success') {
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

  const runWith = (exe: string, args: string[]): Promise<CommandResult> =>
    new Promise((resolve) => {
      let proc;
      try {
        proc = spawn(exe, args, { cwd: projectDir });
      } catch (e: any) {
        resolve(finalize('failed', null, e?.message || 'Failed to spawn command'));
        return;
      }
      activeProcess = proc;
      
      // Register process for cancellation if operationId is provided
      if (template.operationId) {
        const runningCmd = new RunningCommand(template.operationId, template.requestId);
        runningCmd.setHandle(proc);
        runningProcesses.set(template.operationId, runningCmd);
      }

      const onStdout = (data: Uint8Array | string) => {
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
        stdoutParts.push(text);
        if (template.onOutput) emitChunk(template, 'stdout', text);
      };
      const onStderr = (data: Uint8Array | string) => {
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
        stderrParts.push(text);
        if (template.onOutput) emitChunk(template, 'stderr', text);
      };
      proc.stdout.on('data', onStdout);
      proc.stderr.on('data', onStderr);

      // Timeout guard: hard-kills this specific child if it runs too long.
      const timer = setTimeout(() => {
        try {
          proc.kill();
        } catch {
          /* already exited */
        }
      }, DEFAULT_TIMEOUT_MS);

      proc.on('exit', (code) => {
        clearTimeout(timer);
        activeProcess = null;
        
        // Cleanup from running processes registry
        if (template.operationId) {
          runningProcesses.delete(template.operationId);
        }
        
        if (template.cancelledRef && template.cancelledRef.cancelled) {
          resolve(finalize('cancelled', code === null ? null : code));
        } else {
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
    return await runWith(process.env.ComSpec!, ['/d', '/s', '/c', command]);
  }
  
  // For non-Windows or non-shim executables, spawn directly
  const parts = command.split(' ');
  const executable = parts[0];
  const cmdArgs = parts.slice(1);
  return await runWith(executable, cmdArgs);
}

/** Converts a CommandResult to the existing ToolResult shape for the registry. */
export function commandResultToToolResult(commandResult: CommandResult, toolName: string): ToolResult {
  return {
    tool: toolName,
    success: commandResult.status === 'success',
    output: commandResult,
    ...(commandResult.error ? { error: commandResult.error } : {}),
    durationMs: commandResult.durationMs,
  };
}

/** Cancel a running command by operationId. Returns true if found and killed. */
export function cancelCommand(operationId: string): boolean {
  const runningCmd = runningProcesses.get(operationId);
  if (runningCmd) {
    runningCmd.kill();
    runningProcesses.delete(operationId);
    return true;
  }
  return false;
}