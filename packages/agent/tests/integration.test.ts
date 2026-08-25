import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { loadConfig } from '../src/config';
import { WorkspaceManager } from '../src/workspace/manager';
import { SessionManager } from '../src/session/manager';
import { AgentServer } from '../src/server/agentServer';
import { ProtocolMessage } from '../src/types/protocol';

describe('ContextPilot End-to-End Integration', () => {
  let server: AgentServer;
  let sessionManager: SessionManager;
  let pairingToken: string;
  const port = 8788;

  beforeAll(async () => {
    const config = loadConfig({ port, useMockAi: true, logLevel: 'error' });
    const workspace = new WorkspaceManager(process.cwd());
    sessionManager = new SessionManager(config);
    server = new AgentServer(config, workspace, sessionManager);

    await server.start();

    const qrPayload = sessionManager.generatePairingPayload('127.0.0.1', port, 'contextpilot-npm', 'test-id');
    pairingToken = qrPayload.pairingToken;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should authenticate phone over WebSocket, plan request, handle approval, and complete operation', () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      let sessionId: string | null = null;
      let approvalReceived = false;

      ws.on('open', () => {
        // Send pairing request
        ws.send(
          JSON.stringify({
            protocolVersion: '1.0',
            messageId: 'msg-1',
            type: 'pairing',
            timestamp: new Date().toISOString(),
            payload: {
              pairingToken,
              deviceId: 'integration-test-device',
            },
          })
        );
      });

      ws.on('message', (data: string) => {
        const msg: ProtocolMessage = JSON.parse(data.toString());

        if (msg.type === 'authenticated') {
          sessionId = msg.payload.session.sessionId;
          expect(sessionId).toBeDefined();

          // Send user request
          ws.send(
            JSON.stringify({
              protocolVersion: '1.0',
              messageId: 'msg-2',
              type: 'user_request',
              timestamp: new Date().toISOString(),
              sessionId,
              payload: {
                prompt: 'Run security scan and check status',
              },
            })
          );
        }

        if (msg.type === 'approval_required') {
          approvalReceived = true;
          expect(msg.payload.tool).toBeDefined();

          // Send approval response
          ws.send(
            JSON.stringify({
              protocolVersion: '1.0',
              messageId: 'msg-3',
              type: 'approval_response',
              timestamp: new Date().toISOString(),
              sessionId,
              payload: {
                approvalId: msg.payload.approvalId,
                approved: true,
              },
            })
          );
        }

        if (msg.type === 'operation_completed') {
          expect(approvalReceived).toBe(true);
          ws.close();
          resolve();
        }

        if (msg.type === 'error') {
          ws.close();
          reject(new Error(`Server returned error: ${msg.payload.message}`));
        }
      });

      ws.on('error', (err) => {
        reject(err);
      });
    });
  });
});
