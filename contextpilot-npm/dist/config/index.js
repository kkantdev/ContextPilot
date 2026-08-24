"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODEL = exports.DEFAULT_OLLAMA_HOST = void 0;
exports.resolveOllamaHost = resolveOllamaHost;
exports.resolveModel = resolveModel;
exports.loadConfig = loadConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.DEFAULT_OLLAMA_HOST = 'http://localhost:11434';
exports.DEFAULT_MODEL = 'qwen2.5-coder:1.5b';
function resolveOllamaHost() {
    return (process.env.CONTEXT_PILOT_OLLAMA_HOST ||
        process.env.OLLAMA_HOST ||
        exports.DEFAULT_OLLAMA_HOST);
}
function resolveModel() {
    return (process.env.CONTEXT_PILOT_MODEL ||
        process.env.CONTEXTPILOT_MODEL ||
        exports.DEFAULT_MODEL);
}
function loadConfig(options = {}) {
    return {
        port: options.port || Number(process.env.CONTEXTPILOT_PORT) || 8765,
        host: options.host || process.env.CONTEXTPILOT_HOST || '0.0.0.0',
        ollamaUrl: options.ollamaUrl || resolveOllamaHost(),
        modelName: options.modelName || resolveModel(),
        useMockAi: options.useMockAi ?? (process.env.CONTEXTPILOT_USE_MOCK === 'true'),
        logLevel: options.logLevel || process.env.LOG_LEVEL || 'info',
        tokenTTLSeconds: options.tokenTTLSeconds || Number(process.env.TOKEN_TTL_SECONDS) || 300, // 5 min
    };
}
//# sourceMappingURL=index.js.map