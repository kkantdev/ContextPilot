"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const os_1 = __importDefault(require("os"));
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("../config");
const manager_1 = require("../workspace/manager");
const manager_2 = require("../session/manager");
const agentServer_1 = require("../server/agentServer");
const network_1 = require("../utils/network");
const logger_1 = require("../utils/logger");
const mockPhoneClient_1 = require("../mock/mockPhoneClient");
const detection_1 = require("../ai/detection");
const systemTools_1 = require("../tools/systemTools");
const program = new commander_1.Command();
program
    .name('contextpilot')
    .description('ContextPilot Laptop Agent - Phone-to-Laptop developer bridge and AI agent')
    .version('1.0.0');
program
    .command('start', { isDefault: true })
    .description('Start the ContextPilot Laptop Agent inside current project directory')
    .option('-p, --port <number>', 'Agent server port', (val) => parseInt(val, 10))
    .option('-m, --model <string>', 'Local AI model name (e.g. qwen2.5-coder)')
    .option('--mock-ai', 'Force use of Mock AI adapter for offline demo')
    .action(async (options) => {
    const config = (0, config_1.loadConfig)({
        port: options.port,
        modelName: options.model,
        useMockAi: options.mockAi,
    });
    logger_1.logger.setLevel(config.logLevel);
    console.log(chalk_1.default.cyan.bold('\n🚀 Starting ContextPilot Laptop Agent...'));
    const workspace = new manager_1.WorkspaceManager();
    const projectInfo = workspace.detectProject();
    console.log(chalk_1.default.gray('--------------------------------------------------'));
    console.log(chalk_1.default.bold(`📂 Project Name:      `) + chalk_1.default.yellow(projectInfo.name));
    console.log(chalk_1.default.bold(`💻 Workspace Root:    `) + chalk_1.default.blue(projectInfo.rootPath));
    console.log(chalk_1.default.bold(`🛠️  Language/Framework: `) + chalk_1.default.green(`${projectInfo.language} / ${projectInfo.framework}`));
    console.log(chalk_1.default.bold(`📦 Package Manager:   `) + chalk_1.default.magenta(projectInfo.packageManager));
    console.log(chalk_1.default.bold(`🌿 Git Repository:    `) + (projectInfo.isGitRepo ? chalk_1.default.green('Connected') : chalk_1.default.gray('Not a git repo')));
    console.log(chalk_1.default.gray('--------------------------------------------------'));
    // Detect environment + Ollama model at startup (never auto-start Ollama).
    const envTools = (0, systemTools_1.detectEnvironment)();
    const ollamaDetection = await (0, detection_1.detectOllama)(config.ollamaUrl, config.modelName);
    config.ollamaAvailable = ollamaDetection.reachable;
    config.detectedModel = ollamaDetection.detectedModel
        ? (0, detection_1.selectModel)(config.modelName, ollamaDetection.detectedModel)
        : null;
    const effectiveModel = ollamaDetection.detectedModel || config.modelName;
    console.log(chalk_1.default.gray('--------------------------------------------------'));
    if (!config.useMockAi) {
        if (ollamaDetection.reachable) {
            console.log(`${chalk_1.default.green('✔')} Ollama detected: ${chalk_1.default.cyan(ollamaDetection.endpoint)}`);
            console.log(`${chalk_1.default.green('✔')} Endpoint: ${chalk_1.default.cyan(`${ollamaDetection.endpoint}/api/tags`)}`);
            console.log(`${chalk_1.default.green('✔')} Model: ${chalk_1.default.bold(effectiveModel)} (installed)`);
            console.log(`${chalk_1.default.green('✔')} Local AI ready: ${chalk_1.default.gray('Ollama adapter')}`);
        }
        else {
            console.log(`${chalk_1.default.yellow('⚠')} Ollama not detected: ${chalk_1.default.cyan(config.ollamaUrl)}${ollamaDetection.error ? chalk_1.default.gray(` (${ollamaDetection.error})`) : ''}`);
            console.log(chalk_1.default.gray('   Start Ollama and pull the model:'));
            console.log(chalk_1.default.white(`   ollama pull ${config.modelName}`));
            console.log(chalk_1.default.gray('   Falling back to Mock AI for this session.'));
        }
    }
    if (envTools.flutter)
        console.log(`${chalk_1.default.green('✔')} Flutter: ${chalk_1.default.gray(envTools.versions.flutter || 'available')}`);
    if (envTools.docker)
        console.log(`${chalk_1.default.green('✔')} Docker: ${chalk_1.default.gray(envTools.versions.docker || 'available')}`);
    if (envTools.git)
        console.log(`${chalk_1.default.green('✔')} Git: ${chalk_1.default.gray(envTools.versions.git || 'available')}`);
    console.log(chalk_1.default.gray('--------------------------------------------------'));
    const sessionManager = new manager_2.SessionManager(config);
    const agentServer = new agentServer_1.AgentServer(config, workspace, sessionManager);
    await agentServer.start();
    const localIp = (0, network_1.getLocalIPAddress)();
    const qrPayload = sessionManager.generatePairingPayload(localIp, agentServer.port, projectInfo.name, projectInfo.id);
    console.log(chalk_1.default.yellow.bold('\n📱 Scan QR Code with ContextPilot Phone App to Pair:'));
    const payloadJson = JSON.stringify(qrPayload);
    // The compact renderer uses Unicode half-block characters. Use the
    // ANSI-background renderer on Windows so legacy terminals do not garble it.
    qrcode_terminal_1.default.generate(payloadJson, { small: os_1.default.platform() !== 'win32' });
    console.log(chalk_1.default.gray(`Local Endpoint:  http://${localIp}:${agentServer.port}`));
    console.log(chalk_1.default.gray(`Pairing Token:   ${qrPayload.pairingToken} (expires in 5 min)`));
    console.log(chalk_1.default.gray(`Status:          Waiting for phone connection...\n`));
    console.log(chalk_1.default.blue.bold(`💡 Tip: To test pairing from another terminal window, run:`));
    console.log(chalk_1.default.white(`   npx tsx src/cli/index.ts mock-client --token ${qrPayload.pairingToken}\n`));
    if (os_1.default.platform() === 'win32') {
        console.log(chalk_1.default.yellow.bold('🛡️  Windows Firewall Configuration:'));
        console.log('Windows Firewall may block phone connections. Run Command Prompt as Administrator, then:');
        console.log(chalk_1.default.white(`   netsh advfirewall firewall add rule name="ContextPilot Agent" dir=in action=allow protocol=TCP localport=${agentServer.port}\n`));
    }
    process.on('SIGINT', async () => {
        console.log(chalk_1.default.yellow('\nStopping ContextPilot Agent...'));
        await agentServer.stop();
        process.exit(0);
    });
});
program
    .command('doctor')
    .description('Diagnose environment, workspace safety, and Ollama connection status')
    .action(async () => {
    console.log(chalk_1.default.cyan.bold('\n🩺 ContextPilot Environment Doctor:\n'));
    const envTools = (0, systemTools_1.detectEnvironment)();
    const ok = chalk_1.default.green('✔');
    const warn = chalk_1.default.yellow('⚠');
    const mk = (label, present, version) => console.log(`${present ? ok : warn} ${label.padEnd(13)}: ${present ? (version || 'available') : 'not available in PATH'}`);
    console.log(`${envTools.node ? ok : warn} Node.js       : ${envTools.versions.node || 'not detected'}`);
    mk('npm', envTools.npm, envTools.versions.npm);
    mk('Git', envTools.git, envTools.versions.git);
    mk('Flutter', envTools.flutter, envTools.versions.flutter);
    mk('Docker', envTools.docker, envTools.versions.docker);
    mk('Python', envTools.python, envTools.versions.python);
    const config = (0, config_1.loadConfig)();
    const detection = await (0, detection_1.detectOllama)(config.ollamaUrl, config.modelName);
    if (detection.reachable) {
        console.log(`${ok} Ollama (${chalk_1.default.cyan(detection.endpoint)}): online`);
        const m = detection.detectedModel || detection.configuredModel;
        console.log(`${ok} Model: ${chalk_1.default.bold(m)} ${detection.detectedModel ? 'installed' : '(configured; not installed)'}`);
    }
    else {
        console.log(`${warn} Ollama (${chalk_1.default.cyan(config.ollamaUrl)}): ${detection.error || 'offline'}`);
        console.log(`${warn} Model: ${config.modelName} not detected. Run: ${chalk_1.default.white(`ollama pull ${config.modelName}`)}`);
    }
    const workspace = new manager_1.WorkspaceManager();
    const project = workspace.detectProject();
    console.log(`${ok} Workspace : ${workspace.getWorkspaceRoot()} (${project.name} — ${project.language}/${project.framework})`);
    console.log(`${project.isGitRepo ? ok : warn} Git repo : ${project.isGitRepo ? project.branch || 'connected' : 'not a git repository'}`);
    console.log(`${ok} Safety    : path traversal resolution enabled (workspace sandbox)`);
    console.log(chalk_1.default.green('\n✔ Doctor diagnostic check complete.\n'));
});
program
    .command('mock-client')
    .description('Launch interactive mock phone client to simulate phone requests and approvals')
    .option('-t, --token <string>', 'Pairing token from agent CLI')
    .option('-h, --host <string>', 'Agent host IP address', '127.0.0.1')
    .option('-p, --port <number>', 'Agent port', '8765')
    .action(async (options) => {
    const token = options.token || 'test-token';
    const port = parseInt(options.port, 10);
    await (0, mockPhoneClient_1.runMockPhoneClient)(options.host, port, token);
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map