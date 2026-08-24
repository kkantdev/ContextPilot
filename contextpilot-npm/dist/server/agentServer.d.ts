import { AgentConfig } from '../config';
import { SessionManager } from '../session/manager';
import { WorkspaceManager } from '../workspace/manager';
export declare class AgentServer {
    private config;
    private app;
    private httpServer;
    private wss;
    private sessionManager;
    private workspaceManager;
    private permissionEngine;
    private toolRegistry;
    private aiOrchestrator;
    private eventManager;
    private operationManager;
    constructor(config: AgentConfig, workspaceManager: WorkspaceManager, sessionManager: SessionManager);
    private setupHttpRoutes;
    private setupWebSocket;
    private handleMessage;
    private sendError;
    get port(): number;
    private handleActionRequest;
    start(): Promise<void>;
    private listen;
    stop(): Promise<void>;
}
//# sourceMappingURL=agentServer.d.ts.map