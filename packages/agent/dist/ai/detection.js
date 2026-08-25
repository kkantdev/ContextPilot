"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeModelTag = normalizeModelTag;
exports.isExactOrVariant = isExactOrVariant;
exports.detectOllama = detectOllama;
exports.isOllamaReachable = isOllamaReachable;
exports.selectModel = selectModel;
/**
 * Normalizes an Ollama model tag from the `/api/tags` response.
 * Ollama may report additional metadata such as `qwen2.5-coder:1.5b-q4_K_M`.
 */
function normalizeModelTag(tag) {
    const raw = typeof tag === 'string' ? tag : String(tag);
    return raw.trim();
}
/**
 * Returns true when `tag` is exactly `exactModel` or an equivalent variant
 * carrying extra metadata (e.g. `qwen2.5-coder:1.5b-...`).
 *
 * This deliberately does NOT match a different Qwen model such as
 * `qwen2.5-coder:7b` because the variant suffix is checked after the exact
 * model string, and the boundary is a `-` (metadata separator) not `:`.
 */
function isExactOrVariant(tag, exactModel) {
    const normalized = normalizeModelTag(tag);
    if (normalized === exactModel)
        return true;
    if (normalized.startsWith(`${exactModel}-`))
        return true;
    return false;
}
/**
 * Queries Ollama through its local HTTP API (`/api/tags`) rather than shell
 * output, and detects whether the configured model (or an equivalent variant)
 * is installed. Never starts, stops, or downloads Ollama.
 */
async function detectOllama(endpoint, configuredModel) {
    let tags = [];
    try {
        const res = await fetch(`${endpoint}/api/tags`);
        if (!res.ok) {
            return {
                reachable: false,
                endpoint,
                tags: [],
                detectedModel: null,
                configuredModel,
                error: `Ollama API responded with status ${res.status}`,
            };
        }
        const data = await res.json();
        const rawTags = Array.isArray(data?.models) ? data.models : Array.isArray(data?.tags) ? data.tags : [];
        tags = rawTags.map(normalizeModelTag);
        const detectedModel = tags.find((tag) => isExactOrVariant(tag, configuredModel)) ?? null;
        return {
            reachable: true,
            endpoint,
            tags,
            detectedModel,
            configuredModel,
        };
    }
    catch (err) {
        return {
            reachable: false,
            endpoint,
            tags,
            detectedModel: null,
            configuredModel,
            error: err?.message || String(err),
        };
    }
}
async function isOllamaReachable(endpoint) {
    const detection = await detectOllama(endpoint, '');
    return detection.reachable;
}
function selectModel(configuredModel, detectedModel) {
    return (detectedModel && detectedModel.length > 0) ? detectedModel : configuredModel;
}
//# sourceMappingURL=detection.js.map