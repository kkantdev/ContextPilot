import { QRPayload } from '../types/protocol';
import { AgentConfig } from '../config';
export interface ActiveSession {
    sessionId: string;
    agentId: string;
    deviceId: string;
    deviceName?: string;
    connectedAt: Date;
    lastActivity: Date;
}
export declare class SessionManager {
    private agentId;
    private currentPairingToken;
    private pairingTokenExpiresAt;
    private activeSession;
    private config;
    constructor(config: AgentConfig);
    getAgentId(): string;
    generatePairingPayload(host: string, port: number, projectName: string, projectId: string): QRPayload;
    validatePairingToken(token: string): boolean;
    createSession(deviceId: string, deviceName?: string): ActiveSession;
    getActiveSession(): ActiveSession | null;
    isValidSession(sessionId: string): boolean;
    touchSession(): void;
    endSession(): void;
}
//# sourceMappingURL=manager.d.ts.map