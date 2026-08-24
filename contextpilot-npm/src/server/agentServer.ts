import http from 'http';
import express from 'express';
import cors from 'cors';
import WebSocket, { WebSocketServer } from 'ws';
import { AgentConfig } from '../config';
import { SessionManager } from '../session/manager';
import { WorkspaceManager } from '../workspace/manager';
import { PermissionEngine } from '../permission/engine';
import { ToolRegistry } from '../tools/registry';
import { AIOrchestrator } from '../ai/orchestrator';
import { EventManager } from '../events/manager';
import { OperationManager } from '../operation/manager';
import { logger } from '../utils/logger';
import {
  ProtocolMessage,
  PairingRequestSchema,
  UserRequestSchema,
  ApprovalResponseSchema,
  ActionRequestSchema,
  CancelRequestSchema,
  ErrorCode,
  Plan,
} from '../types/protocol';
import { getCommandDefinition, listCommandActions } from '../commands/registry';
import { runCommandTemplate, CommandExecutionRequest, cancelCommand } from '../commands/executor';

// Map a command group to its registered typed executor tool.
const TOOL_BY_GROUP: Record<string, string> = {
  flutter: 'run_flutter_command',
  npm: 'run_npm_command',
  git: 'run_git_command',
  docker: 'run_docker_command',
  python: 'run_python_command',
};

export class AgentServer {
  private config: AgentConfig;
  private app: express.Express;
  private httpServer: http.Server;
  private wss: WebSocketServer;
  private sessionManager: SessionManager;
  private workspaceManager: WorkspaceManager;
  private permissionEngine: PermissionEngine;
  private toolRegistry: ToolRegistry;
  private aiOrchestrator: AIOrchestrator;
  private eventManager: EventManager;
  private operationManager: OperationManager;

  constructor(
    config: AgentConfig,
    workspaceManager: WorkspaceManager,
    sessionManager: SessionManager
  ) {
    this.config = config;
    this.workspaceManager = workspaceManager;
    this.sessionManager = sessionManager;

    this.permissionEngine = new PermissionEngine(workspaceManager);
    this.toolRegistry = new ToolRegistry(workspaceManager, this.permissionEngine);
    this.aiOrchestrator = new AIOrchestrator(config, workspaceManager, this.toolRegistry);
    this.eventManager = new EventManager();
    this.operationManager = new OperationManager(this.toolRegistry, this.eventManager, workspaceManager);

    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.httpServer = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.setupHttpRoutes();
    this.setupWebSocket();
  }

  private setupHttpRoutes() {
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', agentId: this.sessionManager.getAgentId() });
    });

    this.app.get('/api/project', (req, res) => {
      res.json(this.workspaceManager.detectProject());
    });

    this.app.post('/api/pair', (req, res) => {
      const parseResult = PairingRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Malformed pairing request payload' });
      }

      const { pairingToken, deviceId, deviceName } = parseResult.data;
      const isValid = this.sessionManager.validatePairingToken(pairingToken);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid or expired pairing token', code: 'PAIRING_TOKEN_EXPIRED' });
      }

      const session = this.sessionManager.createSession(deviceId, deviceName);
      logger.success(`Phone paired successfully! Device ID: ${deviceId}`);

      return res.json({
        success: true,
        session,
        project: this.workspaceManager.detectProject(),
      });
    });

    this.app.get('/api/commands', (_req, res) => {
      const commands = listCommandActions().map((action) => {
        const def = getCommandDefinition(action);
        return {
          action,
          group: def?.group,
          risk: def?.risk,
          description: def?.description,
        };
      });
      res.json({ commands });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('Phone connected via WebSocket.');
      this.eventManager.addClient(ws);

      ws.on('message', async (data: string) => {
        try {
          const message: ProtocolMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (err: any) {
          logger.error('Failed to process WebSocket message:', err.message);
          this.sendError(ws, 'INTERNAL_ERROR', 'Failed to parse incoming message format');
        }
      });

      ws.on('close', () => {
        logger.warn('Phone disconnected from WebSocket.');
        this.eventManager.removeClient(ws);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: ProtocolMessage) {
    const { type, payload, sessionId } = message;

    // Direct pairing message via WebSocket
    if (type === 'pairing') {
      const parseResult = PairingRequestSchema.safeParse(payload);
      if (!parseResult.success) {
        return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'Invalid pairing parameters');
      }

      const { pairingToken, deviceId, deviceName } = parseResult.data;
      if (!this.sessionManager.validatePairingToken(pairingToken)) {
        return this.sendError(ws, 'PAIRING_TOKEN_EXPIRED', 'Pairing token is invalid or expired');
      }

      const session = this.sessionManager.createSession(deviceId, deviceName);
      logger.success(`Phone authenticated via WebSocket! Device: ${deviceId}`);

      this.eventManager.broadcast('authenticated', { session, project: this.workspaceManager.detectProject() }, session.sessionId);
      return;
    }

    // Validate active session for all other request types
    if (!sessionId || !this.sessionManager.isValidSession(sessionId)) {
      return this.sendError(ws, 'INVALID_SESSION', 'Session invalid or unauthenticated. Please re-pair with QR.');
    }

    this.sessionManager.touchSession();

    if (type === 'action_request') {
      const parseResult = ActionRequestSchema.safeParse(payload);
      if (!parseResult.success) {
        return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'Action request requires a non-empty "action".');
      }
      const { action, args, requestId } = parseResult.data;
      return this.handleActionRequest(ws, action, args || {}, requestId);
    }

    if (type === 'user_request') {
      const parseResult = UserRequestSchema.safeParse(payload);
      if (!parseResult.success) {
        return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'User request payload requires non-empty "prompt".');
      }

      const { prompt } = parseResult.data;
      logger.info(`Received user prompt from phone: "${prompt}"`);

      const op = this.operationManager.createOperation(prompt);

      try {
        const plan = await this.aiOrchestrator.planUserRequest(prompt);
        this.operationManager.setPlan(op.operationId, plan);
        await this.operationManager.executeNextStep(op.operationId);
      } catch (err: any) {
        logger.error(`AI planning error for operation ${op.operationId}:`, err.message);
        this.sendError(ws, 'AI_UNAVAILABLE', err.message);
      }
      return;
    }

    if (type === 'approval_response') {
      const parseResult = ApprovalResponseSchema.safeParse(payload);
      if (!parseResult.success) {
        return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'Malformed approval response payload');
      }

      const { approvalId, approved, reason } = parseResult.data;
      const resolved = await this.operationManager.handleApprovalResponse(approvalId, approved, reason);
      if (!resolved) {
        logger.warn(`Received approval response for unknown or expired approvalId: ${approvalId}`);
      }
      return;
    }

    if (type === 'cancel_request' || type === 'command.cancel') {
      const parseResult = CancelRequestSchema.safeParse(payload);
      if (!parseResult.success) {
        return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'Cancel request requires requestId.');
      }

      const { requestId } = parseResult.data;
      
      // Try to cancel via command executor first (for direct streaming commands)
      let cancelled = cancelCommand(requestId);
      
      // If that didn't work, try via operation manager (for operation-based flows)
      if (!cancelled) {
        cancelled = this.operationManager.cancelOperation(requestId);
      }
      
      if (cancelled) {
        logger.info(`Cancelled command/operation with requestId: ${requestId}`);
        this.eventManager.broadcast('command.cancelled', { requestId });
      } else {
        logger.warn(`Failed to cancel command/operation with requestId: ${requestId} (not found or already completed)`);
      }
      return;
    }
  }

  private sendError(ws: WebSocket, code: ErrorCode, message: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'error',
          payload: { code, message },
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  public get port(): number {
    return this.config.port;
  }

  private async handleActionRequest(
    ws: WebSocket,
    action: string,
    args: Record<string, any>,
    requestId?: string
  ): Promise<void> {
    const def = getCommandDefinition(action);
    if (!def) {
      // Emit command.error for unknown action
      this.eventManager.broadcast('command.error', {
        requestId: requestId || `req-${Date.now()}`,
        error: `Action "${action}" is not a registered ContextPilot command.`,
      });
      return this.sendError(ws, 'COMMAND_NOT_ALLOWED', `Action "${action}" is not a registered ContextPilot command.`);
    }

    // Create operation for existing protocol compatibility
    const op = this.operationManager.createOperation(`Device command: ${action}`);
    const operationId = op.operationId;
    const finalRequestId = requestId || operationId;

    // Create single-step plan for existing protocol
    const requiresApproval = def.risk === 'REVIEW' || def.risk === 'DANGEROUS';
    const plan: Plan = {
      planId: `plan-${Date.now()}`,
      summary: `Run ${action}: ${def.description}`,
      steps: [
        {
          stepId: 'step-1',
          description: def.description,
          tool: `run_${def.group}_command`,
          args: { ...args, action },
          riskLevel: def.risk,
          requiresApproval,
        },
      ],
    };

    this.operationManager.setPlan(operationId, plan);

    // Emit existing plan_created event
    this.eventManager.broadcast('plan_created', { operationId, plan }, undefined, operationId);

    if (requiresApproval) {
      // Handle approval flow through operation manager
      await this.operationManager.executeNextStep(operationId);
      return;
    }

    // For SAFE commands, execute directly with streaming
    this.eventManager.broadcast(
      'tool_started',
      { operationId, stepId: 'step-1', tool: `run_${def.group}_command`, description: def.description },
      undefined,
      operationId
    );

    const request: CommandExecutionRequest = {
      action,
      args: args || {},
      operationId,
      requestId: finalRequestId,
      onEvent: (eventType: string, payload: any) => {
        // Emit command.* streaming events
        this.eventManager.broadcast(eventType, payload);
      },
    };

    try {
      const result = await runCommandTemplate(this.workspaceManager, request);
      
      // Emit existing tool_completed event
      this.eventManager.broadcast(
        'tool_completed',
        { operationId, stepId: 'step-1', tool: `run_${def.group}_command`, result: {
          tool: `run_${def.group}_command`,
          success: result.status === 'success',
          output: result,
          error: result.error,
          durationMs: result.durationMs,
        }},
        undefined,
        operationId
      );

      if (result.status === 'success') {
        this.eventManager.broadcast('operation_completed', { operationId, results: [result] }, undefined, operationId);
      } else {
        this.eventManager.broadcast(
          'operation_failed',
          { operationId, error: result.error, failedStep: plan.steps[0] },
          undefined,
          operationId
        );
      }
    } catch (error: any) {
      this.eventManager.broadcast(
        'operation_failed',
        { operationId, error: error.message, failedStep: plan.steps[0] },
        undefined,
        operationId
      );
    }
  }

  public async start(): Promise<void> {
    const firstPort = this.config.port;
    let lastError: Error | undefined;
    for (let port = firstPort; port < firstPort + 10; port++) {
      try {
        await this.listen(port);
        this.config.port = port;
        logger.success(`ContextPilot Agent Server listening on http://${this.config.host}:${port}`);
        return;
      } catch (error: any) {
        lastError = error;
        if (error?.code !== 'EADDRINUSE') throw error;
        logger.warn(`Port ${port} is already in use, trying ${port + 1}...`);
      }
    }
    throw lastError ?? new Error(`No available port found between ${firstPort} and ${firstPort + 9}`);
  }

  private listen(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const onError = (error: Error) => {
        this.httpServer.off('error', onError);
        reject(error);
      };
      this.httpServer.once('error', onError);
      this.httpServer.listen(port, this.config.host, () => {
        this.httpServer.off('error', onError);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close();
      this.httpServer.close(() => resolve());
    });
  }
}
