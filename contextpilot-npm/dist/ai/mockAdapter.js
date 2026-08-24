"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAIAdapter = void 0;
class MockAIAdapter {
    name = 'Mock Local AI Adapter';
    async isAvailable() {
        return true;
    }
    async generatePlan(prompt, context, availableTools) {
        const p = prompt.toLowerCase();
        const planId = `plan-${Date.now()}`;
        if (p.includes('auth') || p.includes('login') || p.includes('feature')) {
            return {
                planId,
                summary: `Create user authentication feature with login service and tests.`,
                steps: [
                    {
                        stepId: 'step-1',
                        description: 'Inspect existing project directory structure',
                        tool: 'list_directory',
                        args: { path: '.' },
                        riskLevel: 'SAFE',
                        requiresApproval: false,
                    },
                    {
                        stepId: 'step-2',
                        description: 'Create authentication service file src/authService.ts',
                        tool: 'create_file',
                        args: {
                            path: 'src/authService.ts',
                            content: `export class AuthService {\n  static login(user: string, pass: string): boolean {\n    return user === 'admin' && pass === 'password123';\n  }\n}\n`,
                        },
                        riskLevel: 'REVIEW',
                        requiresApproval: true,
                    },
                    {
                        stepId: 'step-3',
                        description: 'Run project test suite to verify code compilation and tests',
                        tool: 'run_tests',
                        args: {},
                        riskLevel: 'REVIEW',
                        requiresApproval: true,
                    },
                    {
                        stepId: 'step-4',
                        description: 'Run security scan on project',
                        tool: 'security_scan',
                        args: {},
                        riskLevel: 'REVIEW',
                        requiresApproval: true,
                    },
                ],
            };
        }
        if (p.includes('sec') || p.includes('audit') || p.includes('scan')) {
            return {
                planId,
                summary: `Run automated security scan and check git status.`,
                steps: [
                    {
                        stepId: 'step-1',
                        description: 'Check Git repository status',
                        tool: 'git_status',
                        args: {},
                        riskLevel: 'SAFE',
                        requiresApproval: false,
                    },
                    {
                        stepId: 'step-2',
                        description: 'Run static security analysis',
                        tool: 'security_scan',
                        args: {},
                        riskLevel: 'REVIEW',
                        requiresApproval: true,
                    },
                ],
            };
        }
        // Default generic plan
        return {
            planId,
            summary: `Analyze request "${prompt}" and perform project updates.`,
            steps: [
                {
                    stepId: 'step-1',
                    description: 'Read Git repository status',
                    tool: 'git_status',
                    args: {},
                    riskLevel: 'SAFE',
                    requiresApproval: false,
                },
                {
                    stepId: 'step-2',
                    description: 'Search project files for relevant references',
                    tool: 'search_code',
                    args: { query: 'export' },
                    riskLevel: 'SAFE',
                    requiresApproval: false,
                },
                {
                    stepId: 'step-3',
                    description: 'Execute tests to verify project health',
                    tool: 'run_tests',
                    args: {},
                    riskLevel: 'REVIEW',
                    requiresApproval: true,
                },
            ],
        };
    }
}
exports.MockAIAdapter = MockAIAdapter;
//# sourceMappingURL=mockAdapter.js.map