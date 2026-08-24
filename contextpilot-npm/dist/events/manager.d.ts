import WebSocket from 'ws';
export declare class EventManager {
    private clients;
    addClient(ws: WebSocket): void;
    removeClient(ws: WebSocket): void;
    broadcast<T>(type: string, payload: T, sessionId?: string, operationId?: string): void;
}
//# sourceMappingURL=manager.d.ts.map