"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTerminalTools = registerTerminalTools;
const child_process_1 = require("child_process");
function registerTerminalTools(workspace) {
    return {
        run_command: async (args) => {
            const startTime = Date.now();
            const timeout = args.timeoutMs || 30000; // default 30s timeout
            return new Promise((resolve) => {
                (0, child_process_1.exec)(args.command, {
                    cwd: workspace.getWorkspaceRoot(),
                    timeout,
                    maxBuffer: 1024 * 1024 * 5, // 5MB buffer
                }, (error, stdout, stderr) => {
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
                    }
                    else {
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
                });
            });
        },
    };
}
//# sourceMappingURL=terminalTools.js.map