"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIOrchestrator = void 0;
const ollamaAdapter_1 = require("./ollamaAdapter");
const mockAdapter_1 = require("./mockAdapter");
const logger_1 = require("../utils/logger");
class AIOrchestrator {
    primaryAdapter;
    fallbackAdapter;
    workspace;
    toolRegistry;
    useMock;
    constructor(config, workspace, toolRegistry) {
        this.workspace = workspace;
        this.toolRegistry = toolRegistry;
        this.useMock = config.useMockAi;
        this.primaryAdapter = new ollamaAdapter_1.OllamaAdapter(config.ollamaUrl, config.modelName, config.detectedModel);
        this.fallbackAdapter = new mockAdapter_1.MockAIAdapter();
    }
    async planUserRequest(userPrompt) {
        const projectInfo = this.workspace.detectProject();
        const treeSummary = this.workspace.generateProjectTreeSummary();
        const context = `
Project Name: ${projectInfo.name}
Language: ${projectInfo.language}
Framework: ${projectInfo.framework}
Package Manager: ${projectInfo.packageManager}
Is Git Repository: ${projectInfo.isGitRepo}

Directory Tree:
${treeSummary}
`.trim();
        const allTools = this.toolRegistry.getToolDefinitions();
        // Never advertise the raw (allowlist-resolved) run_command to the LLM.
        // The model may only request the typed developer commands (flutter/npm/git/
        // docker/python) which ContextPilot validates and permission-checks itself.
        const tools = allTools.filter((t) => t.name !== 'run_command');
        if (!this.useMock) {
            const isOllamaUp = await this.primaryAdapter.isAvailable();
            if (isOllamaUp) {
                logger_1.logger.info(`Using Ollama AI model adapter...`);
                try {
                    return await this.primaryAdapter.generatePlan(userPrompt, context, tools);
                }
                catch (err) {
                    logger_1.logger.warn(`Ollama model failed: ${err.message}. Falling back to Mock AI adapter...`);
                }
            }
            else {
                logger_1.logger.warn(`Ollama is not running at configured URL. Using Mock AI adapter for hackathon demo...`);
            }
        }
        else {
            logger_1.logger.info(`Using Mock AI adapter (configured)...`);
        }
        return await this.fallbackAdapter.generatePlan(userPrompt, context, tools);
    }
}
exports.AIOrchestrator = AIOrchestrator;
//# sourceMappingURL=orchestrator.js.map