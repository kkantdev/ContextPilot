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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentServer = void 0;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = __importStar(require("ws"));
const engine_1 = require("../permission/engine");
const registry_1 = require("../tools/registry");
const orchestrator_1 = require("../ai/orchestrator");
const manager_1 = require("../events/manager");
const manager_2 = require("../operation/manager");
const logger_1 = require("../utils/logger");
const protocol_1 = require("../types/protocol");
const registry_2 = require("../commands/registry");
// Map a command group to its registered typed executor tool.
const TOOL_BY_GROUP = {
    flutter: 'run_flutter_command',
    npm: 'run_npm_command',
    git: 'run_git_command',
    docker: 'run_docker_command',
    python: 'run_python_command',
};
class AgentServer {
    config;
    app;
    httpServer;
    wss;
    sessionManager;
    workspaceManager;
    permissionEngine;
    toolRegistry;
    aiOrchestrator;
    eventManager;
    operationManager;
    constructor(config, workspaceManager, sessionManager) {
        this.config = config;
        this.workspaceManager = workspaceManager;
        this.sessionManager = sessionManager;
        this.permissionEngine = new engine_1.PermissionEngine(workspaceManager);
        this.toolRegistry = new registry_1.ToolRegistry(workspaceManager, this.permissionEngine);
        this.aiOrchestrator = new orchestrator_1.AIOrchestrator(config, workspaceManager, this.toolRegistry);
        this.eventManager = new manager_1.EventManager();
        this.operationManager = new manager_2.OperationManager(this.toolRegistry, this.eventManager);
        this.app = (0, express_1.default)();
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json());
        this.httpServer = http_1.default.createServer(this.app);
        this.wss = new ws_1.WebSocketServer({ server: this.httpServer });
        this.setupHttpRoutes();
        this.setupWebSocket();
    }
    setupHttpRoutes() {
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', agentId: this.sessionManager.getAgentId() });
        });
        this.app.get('/api/project', (req, res) => {
            res.json(this.workspaceManager.detectProject());
        });
        this.app.post('/api/pair', (req, res) => {
            const parseResult = protocol_1.PairingRequestSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({ error: 'Malformed pairing request payload' });
            }
            const { pairingToken, deviceId, deviceName } = parseResult.data;
            const isValid = this.sessionManager.validatePairingToken(pairingToken);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid or expired pairing token', code: 'PAIRING_TOKEN_EXPIRED' });
            }
            const session = this.sessionManager.createSession(deviceId, deviceName);
            logger_1.logger.success(`Phone paired successfully! Device ID: ${deviceId}`);
            return res.json({
                success: true,
                session,
                project: this.workspaceManager.detectProject(),
            });
        });
        this.app.get('/api/commands', (_req, res) => {
            const commands = (0, registry_2.listCommandActions)().map((action) => {
                const def = (0, registry_2.getCommandDefinition)(action);
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
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            logger_1.logger.info('Phone connected via WebSocket.');
            this.eventManager.addClient(ws);
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(ws, message);
                }
                catch (err) {
                    logger_1.logger.error('Failed to process WebSocket message:', err.message);
                    this.sendError(ws, 'INTERNAL_ERROR', 'Failed to parse incoming message format');
                }
            });
            ws.on('close', () => {
                logger_1.logger.warn('Phone disconnected from WebSocket.');
                this.eventManager.removeClient(ws);
            });
        });
    }
    async handleMessage(ws, message) {
        const { type, payload, sessionId } = message;
        // Direct pairing message via WebSocket
        if (type === 'pairing') {
            const parseResult = protocol_1.PairingRequestSchema.safeParse(payload);
            if (!parseResult.success) {
                return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'Invalid pairing parameters');
            }
            const { pairingToken, deviceId, deviceName } = parseResult.data;
            if (!this.sessionManager.validatePairingToken(pairingToken)) {
                return this.sendError(ws, 'PAIRING_TOKEN_EXPIRED', 'Pairing token is invalid or expired');
            }
            const session = this.sessionManager.createSession(deviceId, deviceName);
            logger_1.logger.success(`Phone authenticated via WebSocket! Device: ${deviceId}`);
            this.eventManager.broadcast('authenticated', { session, project: this.workspaceManager.detectProject() }, session.sessionId);
            return;
        }
        // Validate active session for all other request types
        if (!sessionId || !this.sessionManager.isValidSession(sessionId)) {
            return this.sendError(ws, 'INVALID_SESSION', 'Session invalid or unauthenticated. Please re-pair with QR.');
        }
        this.sessionManager.touchSession();
        if (type === 'action_request') {
            const parseResult = protocol_1.ActionRequestSchema.safeParse(payload);
            if (!parseResult.success) {
                return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'Action request requires a non-empty "action".');
            }
            const { action, args } = parseResult.data;
            return this.handleActionRequest(ws, action, args || {});
        }
        if (type === 'user_request') {
            const parseResult = protocol_1.UserRequestSchema.safeParse(payload);
            if (!parseResult.success) {
                return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'User request payload requires non-empty "prompt".');
            }
            const { prompt } = parseResult.data;
            logger_1.logger.info(`Received user prompt from phone: "${prompt}"`);
            const op = this.operationManager.createOperation(prompt);
            try {
                const plan = await this.aiOrchestrator.planUserRequest(prompt);
                this.operationManager.setPlan(op.operationId, plan);
                await this.operationManager.executeNextStep(op.operationId);
            }
            catch (err) {
                logger_1.logger.error(`AI planning error for operation ${op.operationId}:`, err.message);
                this.sendError(ws, 'AI_UNAVAILABLE', err.message);
            }
            return;
        }
        if (type === 'approval_response') {
            const parseResult = protocol_1.ApprovalResponseSchema.safeParse(payload);
            if (!parseResult.success) {
                return this.sendError(ws, 'TOOL_VALIDATION_FAILED', 'Malformed approval response payload');
            }
            const { approvalId, approved, reason } = parseResult.data;
            const resolved = await this.operationManager.handleApprovalResponse(approvalId, approved, reason);
            if (!resolved) {
                logger_1.logger.warn(`Received approval response for unknown or expired approvalId: ${approvalId}`);
            }
            return;
        }
    }
    sendError(ws, code, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify({
                type: 'error',
                payload: { code, message },
                timestamp: new Date().toISOString(),
            }));
        }
    }
    get port() {
        return this.config.port;
    }
    async handleActionRequest(ws, action, args) {
        const def = (0, registry_2.getCommandDefinition)(action);
        if (!def) {
            return this.sendError(ws, 'COMMAND_NOT_ALLOWED', `Action "${action}" is not a registered ContextPilot command.`);
        }
        const tool = TOOL_BY_GROUP[def.group];
        if (!tool) {
            return this.sendError(ws, 'COMMAND_NOT_ALLOWED', `Command group "${def.group}" has no executor tool.`);
        }
        // Model the action as a single-step plan so it flows through the existing
        // operation + approval + streaming event pipeline.
        const op = this.operationManager.createOperation(`Device command: ${action}`);
        const requiresApproval = def.risk === 'REVIEW' || def.risk === 'DANGEROUS';
        const plan = {
            planId: `plan-${Date.now()}`,
            summary: `Run ${action}: ${def.description}`,
            steps: [
                {
                    stepId: 'step-1',
                    description: def.description,
                    tool,
                    args: { ...args, action },
                    riskLevel: def.risk,
                    requiresApproval,
                },
            ],
        };
        this.operationManager.setPlan(op.operationId, plan);
        await this.operationManager.executeNextStep(op.operationId);
    }
    async start() {
        const firstPort = this.config.port;
        let lastError;
        for (let port = firstPort; port < firstPort + 10; port++) {
            try {
                await this.listen(port);
                this.config.port = port;
                logger_1.logger.success(`ContextPilot Agent Server listening on http://${this.config.host}:${port}`);
                return;
            }
            catch (error) {
                lastError = error;
                if (error?.code !== 'EADDRINUSE')
                    throw error;
                logger_1.logger.warn(`Port ${port} is already in use, trying ${port + 1}...`);
            }
        }
        throw lastError ?? new Error(`No available port found between ${firstPort} and ${firstPort + 9}`);
    }
    listen(port) {
        return new Promise((resolve, reject) => {
            const onError = (error) => {
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
    async stop() {
        return new Promise((resolve) => {
            this.wss.close();
            this.httpServer.close(() => resolve());
        });
    }
}
exports.AgentServer = AgentServer;
//# sourceMappingURL=agentServer.js.map