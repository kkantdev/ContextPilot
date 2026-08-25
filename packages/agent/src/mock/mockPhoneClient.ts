import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { ProtocolMessage } from '../types/protocol';

export async function runMockPhoneClient(
  serverHost: string,
  serverPort: number,
  pairingToken: string
) {
  console.log(chalk.cyan.bold('\n📱 [ContextPilot Mock Phone Client] Starting pairing...'));

  const wsUrl = `ws://${serverHost}:${serverPort}`;
  const ws = new WebSocket(wsUrl);

  let sessionId: string | null = null;
  let activeApprovalId: string | null = null;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  ws.on('open', () => {
    console.log(chalk.green('✔ Connected to ContextPilot Laptop Agent server. Authenticating...'));
    ws.send(
      JSON.stringify({
        protocolVersion: '1.0',
        messageId: `msg-${Date.now()}`,
        type: 'pairing',
        timestamp: new Date().toISOString(),
        payload: {
          pairingToken,
          deviceId: 'mock-phone-001',
          deviceName: 'Developer Mock iPhone 15 Pro',
        },
      })
    );
  });

  ws.on('message', (data: string) => {
    try {
      const msg: ProtocolMessage = JSON.parse(data.toString());
      const { type, payload } = msg;

      if (type === 'authenticated') {
        sessionId = payload.session.sessionId;
        console.log(chalk.bold.green(`\n🎉 Phone Paired Successfully!`));
        console.log(chalk.gray(`Session ID: ${sessionId}`));
        console.log(chalk.gray(`Project: ${payload.project.name} (${payload.project.language} / ${payload.project.framework})`));

        promptUserForCommand();
        return;
      }

      if (type === 'plan_created') {
        console.log(chalk.yellow.bold(`\n📋 Structured Plan Created by AI:`));
        console.log(chalk.bold(`Summary: ${payload.plan.summary}`));
        payload.plan.steps.forEach((step: any, idx: number) => {
          console.log(`  ${idx + 1}. [${step.riskLevel}] ${step.description} (${step.tool})`);
        });
        return;
      }

      if (type === 'approval_required') {
        activeApprovalId = payload.approvalId;
        console.log(chalk.bgYellow.black.bold(`\n ⚠️  APPROVAL REQUIRED `));
        console.log(chalk.yellow(`Tool: ${payload.tool}`));
        console.log(chalk.yellow(`Risk Level: ${payload.riskLevel}`));
        console.log(chalk.yellow(`Description: ${payload.description}`));
        console.log(chalk.gray(`Args: ${JSON.stringify(payload.args)}`));

        rl.question(chalk.bold('\nApprove this action? (y/n): '), (ans) => {
          const approved = ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes';
          ws.send(
            JSON.stringify({
              protocolVersion: '1.0',
              messageId: `msg-${Date.now()}`,
              type: 'approval_response',
              timestamp: new Date().toISOString(),
              sessionId,
              payload: {
                approvalId: activeApprovalId,
                approved,
                reason: approved ? 'Approved by mock phone user' : 'Rejected by user',
              },
            })
          );
          activeApprovalId = null;
        });
        return;
      }

      if (type === 'tool_started') {
        console.log(chalk.blue(`▶ Tool Execution Started: ${payload.tool}`));
        return;
      }

      if (type === 'tool_completed') {
        console.log(chalk.green(`✔ Tool Execution Completed: ${payload.tool}`));
        console.log(chalk.gray(`Output: ${JSON.stringify(payload.result.output, null, 2).slice(0, 300)}`));
        return;
      }

      if (type === 'operation_completed') {
        console.log(chalk.bold.green(`\n✨ Operation Completed Successfully!`));
        promptUserForCommand();
        return;
      }

      if (type === 'operation_cancelled') {
        console.log(chalk.red(`\n❌ Operation Cancelled: ${payload.reason}`));
        promptUserForCommand();
        return;
      }

      if (type === 'error') {
        console.log(chalk.red.bold(`\n❌ Error [${payload.code}]: ${payload.message}`));
        promptUserForCommand();
        return;
      }
    } catch (err: any) {
      console.error(chalk.red('Error parsing WebSocket frame:'), err.message);
    }
  });

  function promptUserForCommand() {
    rl.question(chalk.cyan.bold('\n📱 Send request to laptop agent (or type "exit"): '), (prompt) => {
      if (prompt.trim().toLowerCase() === 'exit') {
        ws.close();
        rl.close();
        process.exit(0);
      }

      if (!prompt.trim()) {
        promptUserForCommand();
        return;
      }

      ws.send(
        JSON.stringify({
          protocolVersion: '1.0',
          messageId: `msg-${Date.now()}`,
          type: 'user_request',
          timestamp: new Date().toISOString(),
          sessionId,
          payload: { prompt },
        })
      );
    });
  }
}
