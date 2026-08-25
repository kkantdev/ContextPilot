import crypto from 'crypto';
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

export class SessionManager {
  private agentId: string;
  private currentPairingToken: string | null = null;
  private pairingTokenExpiresAt: Date | null = null;
  private activeSession: ActiveSession | null = null;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.agentId = `agent-${crypto.randomBytes(4).toString('hex')}`;
  }

  public getAgentId(): string {
    return this.agentId;
  }

  public generatePairingPayload(host: string, port: number, projectName: string, projectId: string): QRPayload {
    this.currentPairingToken = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date(Date.now() + this.config.tokenTTLSeconds * 1000);
    this.pairingTokenExpiresAt = expiresAt;

    return {
      protocolVersion: '1.0',
      agentId: this.agentId,
      host,
      port,
      pairingToken: this.currentPairingToken,
      projectName,
      projectId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  public validatePairingToken(token: string): boolean {
    if (!this.currentPairingToken || !this.pairingTokenExpiresAt) {
      return false;
    }
    if (Date.now() > this.pairingTokenExpiresAt.getTime()) {
      return false; // Expired token
    }
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(this.currentPairingToken));
  }

  public createSession(deviceId: string, deviceName?: string): ActiveSession {
    // Invalidate current pairing token (single-use)
    this.currentPairingToken = null;
    this.pairingTokenExpiresAt = null;

    const session: ActiveSession = {
      sessionId: `sess-${crypto.randomBytes(8).toString('hex')}`,
      agentId: this.agentId,
      deviceId,
      deviceName,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.activeSession = session;
    return session;
  }

  public getActiveSession(): ActiveSession | null {
    return this.activeSession;
  }

  public isValidSession(sessionId: string): boolean {
    if (!this.activeSession) return false;
    return this.activeSession.sessionId === sessionId;
  }

  public touchSession() {
    if (this.activeSession) {
      this.activeSession.lastActivity = new Date();
    }
  }

  public endSession() {
    this.activeSession = null;
  }
}
