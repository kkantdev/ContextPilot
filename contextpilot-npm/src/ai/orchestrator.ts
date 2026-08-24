import { AIAdapter } from './adapter';
import { OllamaAdapter } from './ollamaAdapter';
import { MockAIAdapter } from './mockAdapter';
import { WorkspaceManager } from '../workspace/manager';
import { ToolRegistry } from '../tools/registry';
import { Plan } from '../types/protocol';
import { AgentConfig } from '../config';
import { logger } from '../utils/logger';

export class AIOrchestrator {
  private primaryAdapter: AIAdapter;
  private fallbackAdapter: AIAdapter;
  private workspace: WorkspaceManager;
  private toolRegistry: ToolRegistry;
  private useMock: boolean;

  constructor(
    config: AgentConfig,
    workspace: WorkspaceManager,
    toolRegistry: ToolRegistry
  ) {
    this.workspace = workspace;
    this.toolRegistry = toolRegistry;
    this.useMock = config.useMockAi;

    this.primaryAdapter = new OllamaAdapter(
      config.ollamaUrl,
      config.modelName,
      config.detectedModel
    );
    this.fallbackAdapter = new MockAIAdapter();
  }

  public async planUserRequest(userPrompt: string): Promise<Plan> {
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
        logger.info(`Using Ollama AI model adapter...`);
        try {
          return await this.primaryAdapter.generatePlan(userPrompt, context, tools);
        } catch (err: any) {
          logger.warn(`Ollama model failed: ${err.message}. Falling back to Mock AI adapter...`);
        }
      } else {
        logger.warn(`Ollama is not running at configured URL. Using Mock AI adapter for hackathon demo...`);
      }
    } else {
      logger.info(`Using Mock AI adapter (configured)...`);
    }

    return await this.fallbackAdapter.generatePlan(userPrompt, context, tools);
  }
}
