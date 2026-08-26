"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationManager = void 0;
const logger_1 = require("../utils/logger");
const registry_1 = require("../commands/registry");
const executor_1 = require("../commands/executor");
const GROUP_TOOL_BY_ACTION = {
    flutter_doctor: 'run_flutter_command', flutter_analyze: 'run_flutter_command', flutter_test: 'run_flutter_command', flutter_pub_get: 'run_flutter_command', flutter_pub_outdated: 'run_flutter_command', flutter_build_apk: 'run_flutter_command', flutter_run: 'run_flutter_command',
    npm_install: 'run_npm_command', npm_test: 'run_npm_command', npm_run_build: 'run_npm_command', npm_run_lint: 'run_npm_command', npm_audit: 'run_npm_command', npm_audit_high: 'run_npm_command',
    git_status: 'run_git_command', git_diff: 'run_git_command', git_branch: 'run_git_command', git_log: 'run_git_command', git_checkout: 'run_git_command', git_commit: 'run_git_command', git_reset_hard: 'run_git_command', git_clean_fd: 'run_git_command',
    docker_version: 'run_docker_command', docker_ps: 'run_docker_command', docker_images: 'run_docker_command', docker_compose_ps: 'run_docker_command', docker_compose_up: 'run_docker_command', docker_compose_down: 'run_docker_command', docker_compose_logs: 'run_docker_command',
    python_version: 'run_python_command', python_pytest: 'run_python_command',
};
function groupToolForAction(action) {
    return GROUP_TOOL_BY_ACTION[action];
}
class OperationManager {
    activeOperations = new Map();
    toolRegistry;
    eventManager;
    workspaceManager;
    constructor(toolRegistry, eventManager, workspaceManager) {
        this.toolRegistry = toolRegistry;
        this.eventManager = eventManager;
        this.workspaceManager = workspaceManager;
    }
    createOperation(prompt) {
        const operationId = `op-${Date.now()}`;
        const op = {
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
    setPlan(operationId, plan) {
        const op = this.activeOperations.get(operationId);
        if (!op)
            return;
        op.plan = plan;
        op.state = 'planning';
        this.eventManager.broadcast('plan_created', { operationId, plan }, undefined, operationId);
    }
    async executeNextStep(operationId) {
        const op = this.activeOperations.get(operationId);
        if (!op || !op.plan)
            return;
        if (op.currentStepIndex >= op.plan.steps.length) {
            op.state = 'completed';
            this.eventManager.broadcast('operation_completed', { operationId, results: op.results }, undefined, operationId);
            return;
        }
        const step = op.plan.steps[op.currentStepIndex];
        if (step.requiresApproval && op.state !== 'approved') {
            op.state = 'awaiting_approval';
            const approvalRequest = {
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
        this.eventManager.broadcast('tool_started', { operationId, stepId: step.stepId, tool: step.tool, description: step.description }, undefined, operationId);
        // Check if this is a command action that should use streaming executor
        const isCommandAction = step.args && step.args.action && (0, registry_1.getCommandDefinition)(step.args.action);
        let result;
        if (isCommandAction) {
            // Use streaming executor for command actions with operation context
            const { runCommandTemplate } = await Promise.resolve().then(() => __importStar(require('../commands/executor')));
            try {
                const commandResult = await runCommandTemplate(this.workspaceManager, {
                    action: step.args.action,
                    args: step.args,
                    operationId,
                    onEvent: (eventType, payload) => {
                        // Emit command.* streaming events
                        this.eventManager.broadcast(eventType, payload);
                    },
                });
                result = {
                    tool: step.tool,
                    success: commandResult.status === 'success',
                    output: commandResult,
                    error: commandResult.error,
                    durationMs: commandResult.durationMs,
                };
            }
            catch (error) {
                result = {
                    tool: step.tool,
                    success: false,
                    output: null,
                    error: error.message,
                    durationMs: 0,
                };
            }
        }
        else {
            // Use standard tool execution for non-command actions
            result = await this.toolRegistry.executeTool(step.tool, step.args);
        }
        op.results.push(result);
        this.eventManager.broadcast('tool_completed', { operationId, stepId: step.stepId, tool: step.tool, result }, undefined, operationId);
        if (!result.success) {
            op.state = 'failed';
            this.eventManager.broadcast('operation_failed', { operationId, error: result.error, failedStep: step }, undefined, operationId);
            return;
        }
        op.currentStepIndex += 1;
        // Reset state for next step
        op.state = 'running';
        await this.executeNextStep(operationId);
    }
    async handleApprovalResponse(approvalId, approved, reason) {
        for (const op of this.activeOperations.values()) {
            if (op.pendingApproval && op.pendingApproval.approvalId === approvalId) {
                if (approved) {
                    logger_1.logger.info(`Operation ${op.operationId} step approved by user.`);
                    op.state = 'approved';
                    await this.executeNextStep(op.operationId);
                }
                else {
                    logger_1.logger.warn(`Operation ${op.operationId} step REJECTED by user: ${reason || 'No reason provided'}`);
                    op.state = 'cancelled';
                    this.eventManager.broadcast('operation_cancelled', { operationId: op.operationId, reason: reason || 'User rejected step approval' }, undefined, op.operationId);
                }
                return true;
            }
        }
        return false;
    }
    getOperation(operationId) {
        return this.activeOperations.get(operationId);
    }
    cancelOperation(operationId) {
        const op = this.activeOperations.get(operationId);
        if (!op) {
            logger_1.logger.warn(`Cannot cancel operation ${operationId}: not found`);
            return false;
        }
        // Try to cancel the underlying command process if it's running
        const processKilled = (0, executor_1.cancelCommand)(operationId);
        // Update operation state regardless of whether process was found
        op.state = 'cancelled';
        // Broadcast cancellation events
        this.eventManager.broadcast('operation_cancelled', { operationId, reason: 'Cancelled by user request' }, undefined, operationId);
        logger_1.logger.info(`Operation ${operationId} cancelled (process killed: ${processKilled})`);
        return true;
    }
}
exports.OperationManager = OperationManager;
//# sourceMappingURL=manager.js.map