import { WorkspaceManager } from '../workspace/manager';
import { PermissionEngine } from '../permission/engine';
import { ToolDefinition, ToolResult, RiskLevel } from '../types/protocol';
import { registerFileTools } from './fileTools';
import { registerTerminalTools } from './terminalTools';
import { registerGitTools } from './gitTools';
import { registerTestTools } from './testTools';
import { registerSecurityTools } from './securityTools';
import { registerCommandTools } from './commandTools';

export type ToolExecutor = (args: any) => Promise<ToolResult>;

export interface RegisteredTool {
  definition: ToolDefinition;
  executor: ToolExecutor;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private permissionEngine: PermissionEngine;

  constructor(workspace: WorkspaceManager, permissionEngine: PermissionEngine) {
    this.permissionEngine = permissionEngine;

    const fileTools = registerFileTools(workspace);
    const terminalTools = registerTerminalTools(workspace);
    const gitTools = registerGitTools(workspace);
    const testTools = registerTestTools(workspace);
    const securityTools = registerSecurityTools(workspace);
    const commandTools = registerCommandTools(workspace);

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

  public register(
    name: string,
    riskLevel: RiskLevel,
    description: string,
    inputSchema: Record<string, any>,
    executor: ToolExecutor
  ) {
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

  public getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  public getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  public async executeTool(name: string, args: Record<string, any> = {}): Promise<ToolResult> {
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
