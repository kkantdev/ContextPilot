import { exec } from 'child_process';
import { WorkspaceManager } from '../workspace/manager';
import { ToolResult, GitResult } from '../types/protocol';

export function registerGitTools(workspace: WorkspaceManager) {
  const execAsync = (cmd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      exec(cmd, { cwd: workspace.getWorkspaceRoot() }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout.trim());
      });
    });
  };

  return {
    git_status: async (): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const branch = await execAsync('git branch --show-current').catch(() => 'main');
        const statusOutput = await execAsync('git status --porcelain').catch(() => '');

        const lines = statusOutput ? statusOutput.split('\n') : [];
        const modifiedFiles: string[] = [];
        const untrackedFiles: string[] = [];

        for (const line of lines) {
          const status = line.slice(0, 2);
          const file = line.slice(3).trim();
          if (status.includes('?')) {
            untrackedFiles.push(file);
          } else if (file) {
            modifiedFiles.push(file);
          }
        }

        const gitResult: GitResult = {
          branch,
          isClean: modifiedFiles.length === 0 && untrackedFiles.length === 0,
          modifiedFiles,
          untrackedFiles,
        };

        return {
          tool: 'git_status',
          success: true,
          output: gitResult,
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          tool: 'git_status',
          success: false,
          output: null,
          error: `Not a git repository or git error: ${err.message}`,
          durationMs: Date.now() - startTime,
        };
      }
    },

    git_diff: async (args: { path?: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const cmd = args.path ? `git diff -- "${args.path}"` : 'git diff';
        const diffText = await execAsync(cmd).catch(() => '');

        return {
          tool: 'git_diff',
          success: true,
          output: { diff: diffText || 'No diff available' },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          tool: 'git_diff',
          success: false,
          output: null,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },
  };
}
