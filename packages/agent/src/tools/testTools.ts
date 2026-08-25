import { exec } from 'child_process';
import { WorkspaceManager } from '../workspace/manager';
import { ToolResult, TestResult } from '../types/protocol';

export function registerTestTools(workspace: WorkspaceManager) {
  return {
    run_tests: async (args: { command?: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      const project = workspace.detectProject();
      const testCmd = args.command || project.testFramework || 'npm test';

      return new Promise((resolve) => {
        exec(
          testCmd,
          {
            cwd: workspace.getWorkspaceRoot(),
            timeout: 60000, // 60s timeout for tests
            maxBuffer: 1024 * 1024 * 5,
          },
          (error, stdout, stderr) => {
            const durationMs = Date.now() - startTime;
            const outputText = (stdout + '\n' + stderr).trim();

            const isSuccess = !error;
            let passed = 0;
            let failed = 0;
            let total = 0;

            // Simple regex parsing for typical test runners
            const npmMatch = outputText.match(/Tests:\s+([0-9]+)\s+passed,\s+([0-9]+)\s+total/i);
            if (npmMatch) {
              passed = parseInt(npmMatch[1], 10);
              total = parseInt(npmMatch[2], 10);
              failed = total - passed;
            } else {
              total = isSuccess ? 1 : 1;
              passed = isSuccess ? 1 : 0;
              failed = isSuccess ? 0 : 1;
            }

            const testResult: TestResult = {
              command: testCmd,
              success: isSuccess,
              totalTests: total,
              passed,
              failed,
              skipped: 0,
              durationMs,
              summary: isSuccess
                ? `All tests passed (${passed}/${total}) in ${(durationMs / 1000).toFixed(1)}s`
                : `Test run failed (${failed}/${total} failed) in ${(durationMs / 1000).toFixed(1)}s`,
              failures: isSuccess
                ? undefined
                : [
                    {
                      name: testCmd,
                      message: stderr || error?.message || 'Test process exited with non-zero status',
                    },
                  ],
            };

            resolve({
              tool: 'run_tests',
              success: isSuccess,
              output: testResult,
              durationMs,
            });
          }
        );
      });
    },
  };
}
