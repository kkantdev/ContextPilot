import WebSocket from 'ws';
import { ProtocolMessage, PROTOCOL_VERSION } from '../types/protocol';
import { logger } from '../utils/logger';

export class EventManager {
  private clients: Set<WebSocket> = new Set();

  public addClient(ws: WebSocket) {
    this.clients.add(ws);
  }

  public removeClient(ws: WebSocket) {
    this.clients.delete(ws);
  }

  public broadcast<T>(type: string, payload: T, sessionId?: string, operationId?: string) {
    const msg: ProtocolMessage<T> = {
      protocolVersion: PROTOCOL_VERSION,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: new Date().toISOString(),
      sessionId,
      operationId,
      payload,
    };

    logger.event(type, typeof payload === 'string' ? payload : JSON.stringify(payload));

    const json = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    }
  }
}
