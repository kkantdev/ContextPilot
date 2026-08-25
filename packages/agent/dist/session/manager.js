"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
class SessionManager {
    agentId;
    currentPairingToken = null;
    pairingTokenExpiresAt = null;
    activeSession = null;
    config;
    constructor(config) {
        this.config = config;
        this.agentId = `agent-${crypto_1.default.randomBytes(4).toString('hex')}`;
    }
    getAgentId() {
        return this.agentId;
    }
    generatePairingPayload(host, port, projectName, projectId) {
        this.currentPairingToken = crypto_1.default.randomBytes(8).toString('hex');
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
    validatePairingToken(token) {
        if (!this.currentPairingToken || !this.pairingTokenExpiresAt) {
            return false;
        }
        if (Date.now() > this.pairingTokenExpiresAt.getTime()) {
            return false; // Expired token
        }
        return crypto_1.default.timingSafeEqual(Buffer.from(token), Buffer.from(this.currentPairingToken));
    }
    createSession(deviceId, deviceName) {
        // Invalidate current pairing token (single-use)
        this.currentPairingToken = null;
        this.pairingTokenExpiresAt = null;
        const session = {
            sessionId: `sess-${crypto_1.default.randomBytes(8).toString('hex')}`,
            agentId: this.agentId,
            deviceId,
            deviceName,
            connectedAt: new Date(),
            lastActivity: new Date(),
        };
        this.activeSession = session;
        return session;
    }
    getActiveSession() {
        return this.activeSession;
    }
    isValidSession(sessionId) {
        if (!this.activeSession)
            return false;
        return this.activeSession.sessionId === sessionId;
    }
    touchSession() {
        if (this.activeSession) {
            this.activeSession.lastActivity = new Date();
        }
    }
    endSession() {
        this.activeSession = null;
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=manager.js.map