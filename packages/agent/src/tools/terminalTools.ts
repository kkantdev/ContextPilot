import { exec } from 'child_process';
import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';

export function registerTerminalTools(workspace: WorkspaceManager) {
  return {
    run_command: async (args: { command: string; timeoutMs?: number }): Promise<ToolResult> => {
      const startTime = Date.now();
      const timeout = args.timeoutMs || 30000; // default 30s timeout

      return new Promise((resolve) => {
        exec(
          args.command,
          {
            cwd: workspace.getWorkspaceRoot(),
            timeout,
            maxBuffer: 1024 * 1024 * 5, // 5MB buffer
          },
          (error, stdout, stderr) => {
            const durationMs = Date.now() - startTime;
            if (error) {
              resolve({
                tool: 'run_command',
                success: false,
                output: {
                  command: args.command,
                  exitCode: error.code || 1,
                  stdout: stdout.trim(),
                  stderr: stderr.trim(),
                },
                error: error.message,
                durationMs,
              });
            } else {
              resolve({
                tool: 'run_command',
                success: true,
                output: {
                  command: args.command,
                  exitCode: 0,
                  stdout: stdout.trim(),
                  stderr: stderr.trim(),
                },
                durationMs,
              });
            }
          }
        );
      });
    },
  };
}
