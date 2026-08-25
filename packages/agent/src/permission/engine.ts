import { RiskLevel } from '../types/protocol';
import { WorkspaceManager } from '../workspace/manager';
import { getCommandDefinition } from '../commands/registry';

export interface PermissionCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  reason?: string;
}

export class PermissionEngine {
  private workspace: WorkspaceManager;

  constructor(workspace: WorkspaceManager) {
    this.workspace = workspace;
  }

  public classifyRisk(toolName: string, args: Record<string, any>): RiskLevel {
    // Command tools resolve their risk from the command template (not the LLM).
    // Deliberately exclude the legacy `run_command` (unrestricted shell) so its
    // own free-text command analysis below still runs.
    if (toolName !== 'run_command' && toolName.startsWith('run_') && toolName.endsWith('_command')) {
      const actionName = args?.action;
      const def = actionName ? getCommandDefinition(actionName) : undefined;
      return def ? def.risk : 'REVIEW';
    }

    switch (toolName) {
      case 'read_file':
      case 'search_code':
      case 'list_directory':
      case 'git_status':
      case 'git_diff':
        return 'SAFE';

      case 'create_file':
      case 'create_folder':
      case 'edit_file':
      case 'delete_file':
      case 'run_tests':
      case 'security_scan':
        return 'REVIEW';

      case 'run_command': {
        const cmd = (args.command || '').trim().toLowerCase();
        // Safe read-only inspection commands
        if (
          cmd.startsWith('node -v') ||
          cmd.startsWith('npm -v') ||
          cmd.startsWith('flutter --version') ||
          cmd.startsWith('git status') ||
          cmd.startsWith('git diff') ||
          cmd.startsWith('git log') ||
          cmd.startsWith('pwd') ||
          cmd.startsWith('ls')
        ) {
          return 'SAFE';
        }

        // Dangerous system destruction patterns
        if (
          cmd.includes('rm -rf /') ||
          cmd.includes('rm -rf ~') ||
          cmd.includes('mkfs') ||
          cmd.includes('dd if=') ||
          cmd.includes('format') ||
          cmd.includes('sudo') ||
          cmd.includes('git reset --hard') ||
          cmd.includes('git push --force')
        ) {
          return 'DANGEROUS';
        }

        return 'REVIEW';
      }

      default:
        return 'REVIEW';
    }
  }

  public checkPermission(toolName: string, args: Record<string, any>): PermissionCheckResult {
    const riskLevel = this.classifyRisk(toolName, args);

    // Path sandbox check for file operations
    if (args.path || args.filePath || args.dirPath) {
      const pathToCheck = args.path || args.filePath || args.dirPath;
      if (!this.workspace.isPathInWorkspace(pathToCheck)) {
        return {
          allowed: false,
          requiresApproval: false,
          riskLevel,
          reason: `Path "${pathToCheck}" is outside the workspace boundary`,
        };
      }
    }

    if (riskLevel === 'DANGEROUS') {
      return {
        allowed: false,
        requiresApproval: true,
        riskLevel,
        reason: 'Dangerous operation requires explicit manual user approval and heightened caution',
      };
    }

    if (riskLevel === 'BLOCKED') {
      return {
        allowed: false,
        requiresApproval: false,
        riskLevel,
        reason: 'Operation is classified BLOCKED by ContextPilot security policy and cannot be approved.',
      };
    }

    if (riskLevel === 'REVIEW') {
      return {
        allowed: true,
        requiresApproval: true,
        riskLevel,
        reason: 'Action modifies files or executes commands; requires user review',
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
      riskLevel: 'SAFE',
    };
  }
}
