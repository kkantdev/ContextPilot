import {
  Plan,
  PlanStep,
  ApprovalRequest,
  OperationState,
  ToolResult,
} from '../types/protocol';
import { ToolRegistry } from '../tools/registry';
import { EventManager } from '../events/manager';
import { WorkspaceManager } from '../workspace/manager';
import { logger } from '../utils/logger';
import { getCommandDefinition } from '../commands/registry';
import { cancelCommand } from '../commands/executor';

export interface ActiveOperation {
  operationId: string;
  userPrompt: string;
  state: OperationState;
  plan?: Plan;
  currentStepIndex: number;
  results: ToolResult[];
  pendingApproval?: ApprovalRequest;
}

const GROUP_TOOL_BY_ACTION: Record<string, string> = {
  flutter_doctor: 'run_flutter_command', flutter_analyze: 'run_flutter_command', flutter_test: 'run_flutter_command', flutter_pub_get: 'run_flutter_command', flutter_pub_outdated: 'run_flutter_command', flutter_build_apk: 'run_flutter_command', flutter_run: 'run_flutter_command',
  npm_install: 'run_npm_command', npm_test: 'run_npm_command', npm_run_build: 'run_npm_command', npm_run_lint: 'run_npm_command', npm_audit: 'run_npm_command', npm_audit_high: 'run_npm_command',
  git_status: 'run_git_command', git_diff: 'run_git_command', git_branch: 'run_git_command', git_log: 'run_git_command', git_checkout: 'run_git_command', git_commit: 'run_git_command', git_reset_hard: 'run_git_command', git_clean_fd: 'run_git_command',
  docker_version: 'run_docker_command', docker_ps: 'run_docker_command', docker_images: 'run_docker_command', docker_compose_ps: 'run_docker_command', docker_compose_up: 'run_docker_command', docker_compose_down: 'run_docker_command', docker_compose_logs: 'run_docker_command',
  python_version: 'run_python_command', python_pytest: 'run_python_command',
};

function groupToolForAction(action: string): string | undefined {
  return GROUP_TOOL_BY_ACTION[action];
}

export class OperationManager {
  private activeOperations: Map<string, ActiveOperation> = new Map();
  private toolRegistry: ToolRegistry;
  private eventManager: EventManager;
  private workspaceManager: WorkspaceManager;

  constructor(toolRegistry: ToolRegistry, eventManager: EventManager, workspaceManager: WorkspaceManager) {
    this.toolRegistry = toolRegistry;
    this.eventManager = eventManager;
    this.workspaceManager = workspaceManager;
  }

  public createOperation(prompt: string): ActiveOperation {
    const operationId = `op-${Date.now()}`;
    const op: ActiveOperation = {
      operationId,
      userPrompt: prompt,
      state: 'queued',
      currentStepIndex: 0,
      results: [],
    };
    this.activeOperations.set(operationId, op);
    this.eventManager.broadcast('operation_started', { operationId, userPrompt: prompt }, undefined, operationId);
    return op;
  }

  public setPlan(operationId: string, plan: Plan) {
    const op = this.activeOperations.get(operationId);
    if (!op) return;

    op.plan = plan;
    op.state = 'planning';
    this.eventManager.broadcast('plan_created', { operationId, plan }, undefined, operationId);
  }

  public async executeNextStep(operationId: string): Promise<void> {
    const op = this.activeOperations.get(operationId);
    if (!op || !op.plan) return;

    if (op.currentStepIndex >= op.plan.steps.length) {
      op.state = 'completed';
      this.eventManager.broadcast('operation_completed', { operationId, results: op.results }, undefined, operationId);
      return;
    }

    const step: PlanStep = op.plan.steps[op.currentStepIndex];

    if (step.requiresApproval && op.state !== 'approved') {
      op.state = 'awaiting_approval';
      const approvalRequest: ApprovalRequest = {
        approvalId: `appr-${Date.now()}-${op.currentStepIndex}`,
        operationId,
        stepId: step.stepId,
        tool: step.tool,
        args: step.args,
        riskLevel: step.riskLevel,
        description: step.description,
      };

      op.pendingApproval = approvalRequest;
      this.eventManager.broadcast('approval_required', approvalRequest, undefined, operationId);
      return;
    }

    // Step approved or SAFE -> Execute
    op.state = 'running';
    op.pendingApproval = undefined;

    this.eventManager.broadcast(
      'tool_started',
      { operationId, stepId: step.stepId, tool: step.tool, description: step.description },
      undefined,
      operationId
    );

    // Check if this is a command action that should use streaming executor
    const isCommandAction = step.args && step.args.action && getCommandDefinition(step.args.action);
    
    let result: ToolResult;
    
    if (isCommandAction) {
      // Use streaming executor for command actions with operation context
      const { runCommandTemplate } = await import('../commands/executor');
      
      try {
        const commandResult = await runCommandTemplate(
          this.workspaceManager,
          {
            action: step.args.action,
            args: step.args,
            operationId,
            onEvent: (eventType: string, payload: any) => {
              // Emit command.* streaming events
              this.eventManager.broadcast(eventType, payload);
            },
          }
        );
        
        result = {
          tool: step.tool,
          success: commandResult.status === 'success',
          output: commandResult,
          error: commandResult.error,
          durationMs: commandResult.durationMs,
        };
      } catch (error: any) {
        result = {
          tool: step.tool,
          success: false,
          output: null,
          error: error.message,
          durationMs: 0,
        };
      }
    } else {
      // Use standard tool execution for non-command actions
      result = await this.toolRegistry.executeTool(step.tool, step.args);
    }
    
    op.results.push(result);

    this.eventManager.broadcast(
      'tool_completed',
      { operationId, stepId: step.stepId, tool: step.tool, result },
      undefined,
      operationId
    );

    if (!result.success) {
      op.state = 'failed';
      this.eventManager.broadcast(
        'operation_failed',
        { operationId, error: result.error, failedStep: step },
        undefined,
        operationId
      );
      return;
    }

    op.currentStepIndex += 1;
    // Reset state for next step
    op.state = 'running';
    await this.executeNextStep(operationId);
  }

  public async handleApprovalResponse(approvalId: string, approved: boolean, reason?: string): Promise<boolean> {
    for (const op of this.activeOperations.values()) {
      if (op.pendingApproval && op.pendingApproval.approvalId === approvalId) {
        if (approved) {
          logger.info(`Operation ${op.operationId} step approved by user.`);
          op.state = 'approved';
          await this.executeNextStep(op.operationId);
        } else {
          logger.warn(`Operation ${op.operationId} step REJECTED by user: ${reason || 'No reason provided'}`);
          op.state = 'cancelled';
          this.eventManager.broadcast(
            'operation_cancelled',
            { operationId: op.operationId, reason: reason || 'User rejected step approval' },
            undefined,
            op.operationId
          );
        }
        return true;
      }
    }
    return false;
  }

  public getOperation(operationId: string): ActiveOperation | undefined {
    return this.activeOperations.get(operationId);
  }

  public cancelOperation(operationId: string): boolean {
    const op = this.activeOperations.get(operationId);
    if (!op) {
      logger.warn(`Cannot cancel operation ${operationId}: not found`);
      return false;
    }

    // Try to cancel the underlying command process if it's running
    const processKilled = cancelCommand(operationId);
    
    // Update operation state regardless of whether process was found
    op.state = 'cancelled';
    
    // Broadcast cancellation events
    this.eventManager.broadcast(
      'operation_cancelled',
      { operationId, reason: 'Cancelled by user request' },
      undefined,
      operationId
    );
    
    logger.info(`Operation ${operationId} cancelled (process killed: ${processKilled})`);
    return true;
  }
}
