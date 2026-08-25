"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = void 0;
const ws_1 = __importDefault(require("ws"));
const protocol_1 = require("../types/protocol");
const logger_1 = require("../utils/logger");
class EventManager {
    clients = new Set();
    addClient(ws) {
        this.clients.add(ws);
    }
    removeClient(ws) {
        this.clients.delete(ws);
    }
    broadcast(type, payload, sessionId, operationId) {
        const msg = {
            protocolVersion: protocol_1.PROTOCOL_VERSION,
            messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type,
            timestamp: new Date().toISOString(),
            sessionId,
            operationId,
            payload,
        };
        logger_1.logger.event(type, typeof payload === 'string' ? payload : JSON.stringify(payload));
        const json = JSON.stringify(msg);
        for (const ws of this.clients) {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.send(json);
            }
        }
    }
}
exports.EventManager = EventManager;
//# sourceMappingURL=manager.js.map