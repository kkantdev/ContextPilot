"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaAdapter = void 0;
const config_1 = require("../config");
class OllamaAdapter {
    name = 'Ollama Local Adapter';
    baseUrl;
    modelName;
    constructor(baseUrl = config_1.DEFAULT_OLLAMA_HOST, modelName = config_1.DEFAULT_MODEL, detectedModel) {
        this.baseUrl = baseUrl;
        // Prefer the model ContextPilot detected at startup; fall back to configured default.
        this.modelName = (detectedModel && detectedModel.length > 0) ? detectedModel : modelName;
    }
    async isAvailable() {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`);
            return res.ok;
        }
        catch {
            return false;
        }
    }
    async generatePlan(prompt, context, availableTools) {
        const toolsDescription = availableTools
            .map((t) => `- ${t.name} (${t.riskLevel}): ${t.description}. Schema: ${JSON.stringify(t.inputSchema)}`)
            .join('\n');
        const systemPrompt = `You are ContextPilot AI, an autonomous laptop developer assistant.
Your job is to analyze the developer request and project context, then produce a structured JSON execution plan.

DO NOT output any conversational prose or chain-of-thought markdown.
Output ONLY a single valid JSON object matching this schema:
{
  "planId": "plan-<timestamp>",
  "summary": "<Short explanation of plan>",
  "steps": [
    {
      "stepId": "step-1",
      "description": "<Description of step>",
      "tool": "<tool_name>",
      "args": { ... },
      "riskLevel": "SAFE" | "REVIEW" | "DANGEROUS",
      "requiresApproval": boolean
    }
  ]
}

Available Tools:
${toolsDescription}

Rules:
1. "SAFE" tools (read_file, search_code, list_directory, git_status, git_diff) have requiresApproval = false.
2. "REVIEW" tools (create_file, create_folder, edit_file, delete_file, run_command, run_tests, security_scan) have requiresApproval = true.
3. Keep plans concise (1 to 4 steps).
`;
        const userPrompt = `Project Context:
${context}

User Request:
${prompt}`;
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    system: systemPrompt,
                    prompt: userPrompt,
                    stream: false,
                    format: 'json',
                }),
            });
            if (!response.ok) {
                throw new Error(`Ollama returned status ${response.status}`);
            }
            const data = (await response.json());
            const parsed = JSON.parse(data.response);
            if (!parsed.summary || !Array.isArray(parsed.steps)) {
                throw new Error('Invalid JSON plan schema returned by Ollama');
            }
            return parsed;
        }
        catch (err) {
            throw new Error(`Ollama adapter failed: ${err.message}`);
        }
    }
}
exports.OllamaAdapter = OllamaAdapter;
//# sourceMappingURL=ollamaAdapter.js.map