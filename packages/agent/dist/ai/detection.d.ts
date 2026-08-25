export interface OllamaDetectionResult {
    reachable: boolean;
    endpoint: string;
    tags: string[];
    detectedModel: string | null;
    configuredModel: string | null;
    error?: string;
}
/**
 * Normalizes an Ollama model tag from the `/api/tags` response.
 * Ollama may report additional metadata such as `qwen2.5-coder:1.5b-q4_K_M`.
 */
export declare function normalizeModelTag(tag: unknown): string;
/**
 * Returns true when `tag` is exactly `exactModel` or an equivalent variant
 * carrying extra metadata (e.g. `qwen2.5-coder:1.5b-...`).
 *
 * This deliberately does NOT match a different Qwen model such as
 * `qwen2.5-coder:7b` because the variant suffix is checked after the exact
 * model string, and the boundary is a `-` (metadata separator) not `:`.
 */
export declare function isExactOrVariant(tag: string, exactModel: string): boolean;
/**
 * Queries Ollama through its local HTTP API (`/api/tags`) rather than shell
 * output, and detects whether the configured model (or an equivalent variant)
 * is installed. Never starts, stops, or downloads Ollama.
 */
export declare function detectOllama(endpoint: string, configuredModel: string): Promise<OllamaDetectionResult>;
export declare function isOllamaReachable(endpoint: string): Promise<boolean>;
export declare function selectModel(configuredModel: string, detectedModel: string | null): string;
//# sourceMappingURL=detection.d.ts.map