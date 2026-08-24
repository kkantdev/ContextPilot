import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';
export const DEFAULT_MODEL = 'qwen2.5-coder:1.5b';

export interface AgentConfig {
  port: number;
  host: string;
  ollamaUrl: string;
  modelName: string;
  useMockAi: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  tokenTTLSeconds: number;
  // Populated at startup when Ollama + environment detection runs.
  ollamaAvailable?: boolean;
  detectedModel?: string | null;
  detectedTools?: Record<string, boolean>;
}

export function resolveOllamaHost(): string {
  return (
    process.env.CONTEXT_PILOT_OLLAMA_HOST ||
    process.env.OLLAMA_HOST ||
    DEFAULT_OLLAMA_HOST
  );
}

export function resolveModel(): string {
  return (
    process.env.CONTEXT_PILOT_MODEL ||
    process.env.CONTEXTPILOT_MODEL ||
    DEFAULT_MODEL
  );
}

export function loadConfig(options: Partial<AgentConfig> = {}): AgentConfig {
  return {
    port: options.port || Number(process.env.CONTEXTPILOT_PORT) || 8765,
    host: options.host || process.env.CONTEXTPILOT_HOST || '0.0.0.0',
    ollamaUrl: options.ollamaUrl || resolveOllamaHost(),
    modelName: options.modelName || resolveModel(),
    useMockAi: options.useMockAi ?? (process.env.CONTEXTPILOT_USE_MOCK === 'true'),
    logLevel: options.logLevel || (process.env.LOG_LEVEL as any) || 'info',
    tokenTTLSeconds: options.tokenTTLSeconds || Number(process.env.TOKEN_TTL_SECONDS) || 300, // 5 min
  };
}
