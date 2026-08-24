"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMockPhoneClient = runMockPhoneClient;
const ws_1 = __importDefault(require("ws"));
const readline_1 = __importDefault(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
async function runMockPhoneClient(serverHost, serverPort, pairingToken) {
    console.log(chalk_1.default.cyan.bold('\n📱 [ContextPilot Mock Phone Client] Starting pairing...'));
    const wsUrl = `ws://${serverHost}:${serverPort}`;
    const ws = new ws_1.default(wsUrl);
    let sessionId = null;
    let activeApprovalId = null;
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    ws.on('open', () => {
        console.log(chalk_1.default.green('✔ Connected to ContextPilot Laptop Agent server. Authenticating...'));
        ws.send(JSON.stringify({
            protocolVersion: '1.0',
            messageId: `msg-${Date.now()}`,
            type: 'pairing',
            timestamp: new Date().toISOString(),
            payload: {
                pairingToken,
                deviceId: 'mock-phone-001',
                deviceName: 'Developer Mock iPhone 15 Pro',
            },
        }));
    });
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            const { type, payload } = msg;
            if (type === 'authenticated') {
                sessionId = payload.session.sessionId;
                console.log(chalk_1.default.bold.green(`\n🎉 Phone Paired Successfully!`));
                console.log(chalk_1.default.gray(`Session ID: ${sessionId}`));
                console.log(chalk_1.default.gray(`Project: ${payload.project.name} (${payload.project.language} / ${payload.project.framework})`));
                promptUserForCommand();
                return;
            }
            if (type === 'plan_created') {
                console.log(chalk_1.default.yellow.bold(`\n📋 Structured Plan Created by AI:`));
                console.log(chalk_1.default.bold(`Summary: ${payload.plan.summary}`));
                payload.plan.steps.forEach((step, idx) => {
                    console.log(`  ${idx + 1}. [${step.riskLevel}] ${step.description} (${step.tool})`);
                });
                return;
            }
            if (type === 'approval_required') {
                activeApprovalId = payload.approvalId;
                console.log(chalk_1.default.bgYellow.black.bold(`\n ⚠️  APPROVAL REQUIRED `));
                console.log(chalk_1.default.yellow(`Tool: ${payload.tool}`));
                console.log(chalk_1.default.yellow(`Risk Level: ${payload.riskLevel}`));
                console.log(chalk_1.default.yellow(`Description: ${payload.description}`));
                console.log(chalk_1.default.gray(`Args: ${JSON.stringify(payload.args)}`));
                rl.question(chalk_1.default.bold('\nApprove this action? (y/n): '), (ans) => {
                    const approved = ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes';
                    ws.send(JSON.stringify({
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
                    }));
                    activeApprovalId = null;
                });
                return;
            }
            if (type === 'tool_started') {
                console.log(chalk_1.default.blue(`▶ Tool Execution Started: ${payload.tool}`));
                return;
            }
            if (type === 'tool_completed') {
                console.log(chalk_1.default.green(`✔ Tool Execution Completed: ${payload.tool}`));
                console.log(chalk_1.default.gray(`Output: ${JSON.stringify(payload.result.output, null, 2).slice(0, 300)}`));
                return;
            }
            if (type === 'operation_completed') {
                console.log(chalk_1.default.bold.green(`\n✨ Operation Completed Successfully!`));
                promptUserForCommand();
                return;
            }
            if (type === 'operation_cancelled') {
                console.log(chalk_1.default.red(`\n❌ Operation Cancelled: ${payload.reason}`));
                promptUserForCommand();
                return;
            }
            if (type === 'error') {
                console.log(chalk_1.default.red.bold(`\n❌ Error [${payload.code}]: ${payload.message}`));
                promptUserForCommand();
                return;
            }
        }
        catch (err) {
            console.error(chalk_1.default.red('Error parsing WebSocket frame:'), err.message);
        }
    });
    function promptUserForCommand() {
        rl.question(chalk_1.default.cyan.bold('\n📱 Send request to laptop agent (or type "exit"): '), (prompt) => {
            if (prompt.trim().toLowerCase() === 'exit') {
                ws.close();
                rl.close();
                process.exit(0);
            }
            if (!prompt.trim()) {
                promptUserForCommand();
                return;
            }
            ws.send(JSON.stringify({
                protocolVersion: '1.0',
                messageId: `msg-${Date.now()}`,
                type: 'user_request',
                timestamp: new Date().toISOString(),
                sessionId,
                payload: { prompt },
            }));
        });
    }
}
//# sourceMappingURL=mockPhoneClient.js.map