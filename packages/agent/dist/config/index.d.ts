export declare const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
export declare const DEFAULT_MODEL = "qwen2.5-coder:1.5b";
export interface AgentConfig {
    port: number;
    host: string;
    ollamaUrl: string;
    modelName: string;
    useMockAi: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    tokenTTLSeconds: number;
    ollamaAvailable?: boolean;
    detectedModel?: string | null;
    detectedTools?: Record<string, boolean>;
}
export declare function resolveOllamaHost(): string;
export declare function resolveModel(): string;
export declare function loadConfig(options?: Partial<AgentConfig>): AgentConfig;
//# sourceMappingURL=index.d.ts.map