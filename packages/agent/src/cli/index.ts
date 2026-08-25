import { Command } from 'commander';
import os from 'os';
import qrcode from 'qrcode-terminal';
import chalk from 'chalk';
import { loadConfig } from '../config';
import { WorkspaceManager } from '../workspace/manager';
import { SessionManager } from '../session/manager';
import { AgentServer } from '../server/agentServer';
import { getLocalIPAddress } from '../utils/network';
import { logger } from '../utils/logger';
import { runMockPhoneClient } from '../mock/mockPhoneClient';
import { detectOllama, selectModel } from '../ai/detection';
import { detectEnvironment } from '../tools/systemTools';

const program = new Command();

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
    const config = loadConfig({
      port: options.port,
      modelName: options.model,
      useMockAi: options.mockAi,
    });

    logger.setLevel(config.logLevel);

    console.log(chalk.cyan.bold('\n🚀 Starting ContextPilot Laptop Agent...'));

    const workspace = new WorkspaceManager();
    const projectInfo = workspace.detectProject();

    console.log(chalk.gray('--------------------------------------------------'));
    console.log(chalk.bold(`📂 Project Name:      `) + chalk.yellow(projectInfo.name));
    console.log(chalk.bold(`💻 Workspace Root:    `) + chalk.blue(projectInfo.rootPath));
    console.log(chalk.bold(`🛠️  Language/Framework: `) + chalk.green(`${projectInfo.language} / ${projectInfo.framework}`));
    console.log(chalk.bold(`📦 Package Manager:   `) + chalk.magenta(projectInfo.packageManager));
    console.log(chalk.bold(`🌿 Git Repository:    `) + (projectInfo.isGitRepo ? chalk.green('Connected') : chalk.gray('Not a git repo')));
    console.log(chalk.gray('--------------------------------------------------'));

    // Detect environment + Ollama model at startup (never auto-start Ollama).
    const envTools = detectEnvironment();
    const ollamaDetection = await detectOllama(config.ollamaUrl, config.modelName);
    config.ollamaAvailable = ollamaDetection.reachable;
    config.detectedModel = ollamaDetection.detectedModel
      ? selectModel(config.modelName, ollamaDetection.detectedModel)
      : null;
    const effectiveModel = ollamaDetection.detectedModel || config.modelName;

    console.log(chalk.gray('--------------------------------------------------'));
    if (!config.useMockAi) {
      if (ollamaDetection.reachable) {
        console.log(`${chalk.green('✔')} Ollama detected: ${chalk.cyan(ollamaDetection.endpoint)}`);
        console.log(`${chalk.green('✔')} Endpoint: ${chalk.cyan(`${ollamaDetection.endpoint}/api/tags`)}`);
        console.log(`${chalk.green('✔')} Model: ${chalk.bold(effectiveModel)} (installed)`);
        console.log(`${chalk.green('✔')} Local AI ready: ${chalk.gray('Ollama adapter')}`);
      } else {
        console.log(`${chalk.yellow('⚠')} Ollama not detected: ${chalk.cyan(config.ollamaUrl)}${ollamaDetection.error ? chalk.gray(` (${ollamaDetection.error})`) : ''}`);
        console.log(chalk.gray('   Start Ollama and pull the model:'));
        console.log(chalk.white(`   ollama pull ${config.modelName}`));
        console.log(chalk.gray('   Falling back to Mock AI for this session.'));
      }
    }
    if (envTools.flutter) console.log(`${chalk.green('✔')} Flutter: ${chalk.gray(envTools.versions.flutter || 'available')}`);
    if (envTools.docker) console.log(`${chalk.green('✔')} Docker: ${chalk.gray(envTools.versions.docker || 'available')}`);
    if (envTools.git) console.log(`${chalk.green('✔')} Git: ${chalk.gray(envTools.versions.git || 'available')}`);
    console.log(chalk.gray('--------------------------------------------------'));

    const sessionManager = new SessionManager(config);
    const agentServer = new AgentServer(config, workspace, sessionManager);

    await agentServer.start();

    const localIp = getLocalIPAddress();
    const qrPayload = sessionManager.generatePairingPayload(
      localIp,
      agentServer.port,
      projectInfo.name,
      projectInfo.id
    );

    console.log(chalk.yellow.bold('\n📱 Scan QR Code with ContextPilot Phone App to Pair:'));
    const payloadJson = JSON.stringify(qrPayload);
    // The compact renderer uses Unicode half-block characters. Use the
    // ANSI-background renderer on Windows so legacy terminals do not garble it.
    qrcode.generate(payloadJson, { small: os.platform() !== 'win32' });

    console.log(chalk.gray(`Local Endpoint:  http://${localIp}:${agentServer.port}`));
    console.log(chalk.gray(`Pairing Token:   ${qrPayload.pairingToken} (expires in 5 min)`));
    console.log(chalk.gray(`Status:          Waiting for phone connection...\n`));

    console.log(
      chalk.blue.bold(`💡 Tip: To test pairing from another terminal window, run:`)
    );
    console.log(chalk.white(`   npx tsx src/cli/index.ts mock-client --token ${qrPayload.pairingToken}\n`));

    if (os.platform() === 'win32') {
      console.log(chalk.yellow.bold('🛡️  Windows Firewall Configuration:'));
      console.log('Windows Firewall may block phone connections. Run Command Prompt as Administrator, then:');
      console.log(chalk.white(`   netsh advfirewall firewall add rule name="ContextPilot Agent" dir=in action=allow protocol=TCP localport=${agentServer.port}\n`));
    }

    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\nStopping ContextPilot Agent...'));
      await agentServer.stop();
      process.exit(0);
    });
  });

program
  .command('doctor')
  .description('Diagnose environment, workspace safety, and Ollama connection status')
  .action(async () => {
    console.log(chalk.cyan.bold('\n🩺 ContextPilot Environment Doctor:\n'));

    const envTools = detectEnvironment();
    const ok = chalk.green('✔');
    const warn = chalk.yellow('⚠');
    const mk = (label: string, present: boolean, version?: string) =>
      console.log(`${present ? ok : warn} ${label.padEnd(13)}: ${present ? (version || 'available') : 'not available in PATH'}`);

    console.log(`${envTools.node ? ok : warn} Node.js       : ${envTools.versions.node || 'not detected'}`);
    mk('npm', envTools.npm, envTools.versions.npm);
    mk('Git', envTools.git, envTools.versions.git);
    mk('Flutter', envTools.flutter, envTools.versions.flutter);
    mk('Docker', envTools.docker, envTools.versions.docker);
    mk('Python', envTools.python, envTools.versions.python);

    const config = loadConfig();
    const detection = await detectOllama(config.ollamaUrl, config.modelName);
    if (detection.reachable) {
      console.log(`${ok} Ollama (${chalk.cyan(detection.endpoint)}): online`);
      const m = detection.detectedModel || detection.configuredModel;
      console.log(`${ok} Model: ${chalk.bold(m)} ${detection.detectedModel ? 'installed' : '(configured; not installed)'}`);
    } else {
      console.log(`${warn} Ollama (${chalk.cyan(config.ollamaUrl)}): ${detection.error || 'offline'}`);
      console.log(`${warn} Model: ${config.modelName} not detected. Run: ${chalk.white(`ollama pull ${config.modelName}`)}`);
    }

    const workspace = new WorkspaceManager();
    const project = workspace.detectProject();
    console.log(`${ok} Workspace : ${workspace.getWorkspaceRoot()} (${project.name} — ${project.language}/${project.framework})`);
    console.log(`${project.isGitRepo ? ok : warn} Git repo : ${project.isGitRepo ? project.branch || 'connected' : 'not a git repository'}`);
    console.log(`${ok} Safety    : path traversal resolution enabled (workspace sandbox)`);

    console.log(chalk.green('\n✔ Doctor diagnostic check complete.\n'));
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
    await runMockPhoneClient(options.host, port, token);
  });

program.parse(process.argv);
