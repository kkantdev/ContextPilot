"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
const fileTools_1 = require("./fileTools");
const terminalTools_1 = require("./terminalTools");
const gitTools_1 = require("./gitTools");
const testTools_1 = require("./testTools");
const securityTools_1 = require("./securityTools");
const commandTools_1 = require("./commandTools");
class ToolRegistry {
    tools = new Map();
    permissionEngine;
    constructor(workspace, permissionEngine) {
        this.permissionEngine = permissionEngine;
        const fileTools = (0, fileTools_1.registerFileTools)(workspace);
        const terminalTools = (0, terminalTools_1.registerTerminalTools)(workspace);
        const gitTools = (0, gitTools_1.registerGitTools)(workspace);
        const testTools = (0, testTools_1.registerTestTools)(workspace);
        const securityTools = (0, securityTools_1.registerSecurityTools)(workspace);
        const commandTools = (0, commandTools_1.registerCommandTools)(workspace);
        this.register('list_directory', 'SAFE', 'List files and folders in a workspace directory.', { path: { type: 'string' } }, fileTools.list_directory);
        this.register('read_file', 'SAFE', 'Read UTF-8 contents of a file.', { path: { type: 'string', required: true } }, fileTools.read_file);
        this.register('search_code', 'SAFE', 'Search project code for a substring query.', { query: { type: 'string', required: true }, path: { type: 'string' } }, fileTools.search_code);
        this.register('create_file', 'REVIEW', 'Create a new file in the workspace.', { path: { type: 'string', required: true }, content: { type: 'string' } }, fileTools.create_file);
        this.register('create_folder', 'REVIEW', 'Create a new folder in the workspace.', { path: { type: 'string', required: true } }, fileTools.create_folder);
        this.register('edit_file', 'REVIEW', 'Edit or replace contents of an existing workspace file.', { path: { type: 'string', required: true }, content: { type: 'string', required: true } }, fileTools.edit_file);
        this.register('delete_file', 'REVIEW', 'Delete a file or directory in the workspace.', { path: { type: 'string', required: true } }, fileTools.delete_file);
        this.register('run_tests', 'REVIEW', 'Execute project unit or integration test suite.', { command: { type: 'string' } }, testTools.run_tests);
        this.register('git_status', 'SAFE', 'Get current Git repository branch and modified file status.', {}, gitTools.git_status);
        this.register('git_diff', 'SAFE', 'Get current Git diff for workspace or specific file.', { path: { type: 'string' } }, gitTools.git_diff);
        this.register('security_scan', 'REVIEW', 'Perform local security scan for exposed secrets or issues.', {}, securityTools.security_scan);
        // Typed developer command tools. Their risk is resolved from the command
        // template by the PermissionEngine (not by the LLM). Only allowlisted
        // actions within each group are accepted.
        const commandToolSchema = { action: { type: 'string', required: true } };
        this.register('run_flutter_command', 'REVIEW', 'Run an allowlisted Flutter developer command (doctor, analyze, test, pub, build).', commandToolSchema, commandTools.run_flutter_command);
        this.register('run_npm_command', 'REVIEW', 'Run an allowlisted npm developer command (install, test, build, lint, audit).', commandToolSchema, commandTools.run_npm_command);
        this.register('run_git_command', 'REVIEW', 'Run an allowlisted Git command (status, diff, branch, log, checkout, commit).', commandToolSchema, commandTools.run_git_command);
        this.register('run_docker_command', 'REVIEW', 'Run an allowlisted Docker command (version, ps, images, compose).', commandToolSchema, commandTools.run_docker_command);
        this.register('run_python_command', 'REVIEW', 'Run an allowlisted Python command (version, pytest).', commandToolSchema, commandTools.run_python_command);
        // Legacy unrestricted command runner is no longer surfaced to the LLM and
        // remains permission + approval gated for backward compatibility only.
        this.register('run_command', 'REVIEW', 'Execute a terminal shell command in the project root (legacy, permission-gated).', { command: { type: 'string', required: true } }, terminalTools.run_command);
    }
    register(name, riskLevel, description, inputSchema, executor) {
        this.tools.set(name, {
            definition: {
                name,
                description,
                riskLevel,
                inputSchema,
            },
            executor,
        });
    }
    getToolDefinitions() {
        return Array.from(this.tools.values()).map((t) => t.definition);
    }
    getTool(name) {
        return this.tools.get(name);
    }
    async executeTool(name, args = {}) {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                tool: name,
                success: false,
                output: null,
                error: `Tool "${name}" is not registered in ContextPilot Tool Registry.`,
                durationMs: 0,
            };
        }
        const check = this.permissionEngine.checkPermission(name, args);
        if (!check.allowed) {
            return {
                tool: name,
                success: false,
                output: null,
                error: check.reason || `Execution denied by Permission Engine.`,
                durationMs: 0,
            };
        }
        return await tool.executor(args);
    }
}
exports.ToolRegistry = ToolRegistry;
//# sourceMappingURL=registry.js.map