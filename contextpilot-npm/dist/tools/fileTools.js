"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFileTools = registerFileTools;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function registerFileTools(workspace) {
    return {
        list_directory: async (args) => {
            const startTime = Date.now();
            try {
                const targetPath = workspace.resolvePath(args.path || '.');
                const items = fs_1.default.readdirSync(targetPath, { withFileTypes: true });
                const result = items.map((item) => ({
                    name: item.name,
                    type: item.isDirectory() ? 'directory' : 'file',
                }));
                return {
                    tool: 'list_directory',
                    success: true,
                    output: { path: args.path || '.', items: result },
                    durationMs: Date.now() - startTime,
                };
            }
            catch (err) {
                return {
                    tool: 'list_directory',
                    success: false,
                    output: null,
                    error: err.message,
                    durationMs: Date.now() - startTime,
                };
            }
        },
        read_file: async (args) => {
            const startTime = Date.now();
            try {
                const targetPath = workspace.resolvePath(args.path);
                if (!fs_1.default.existsSync(targetPath)) {
                    throw new Error(`File not found: ${args.path}`);
                }
                const content = fs_1.default.readFileSync(targetPath, 'utf-8');
                return {
                    tool: 'read_file',
                    success: true,
                    output: { path: args.path, content },
                    durationMs: Date.now() - startTime,
                };
            }
            catch (err) {
                return {
                    tool: 'read_file',
                    success: false,
                    output: null,
                    error: err.message,
                    durationMs: Date.now() - startTime,
                };
            }
        },
        search_code: async (args) => {
            const startTime = Date.now();
            try {
                const searchDir = workspace.resolvePath(args.path || '.');
                const matches = [];
                const ignoreSet = new Set(['node_modules', '.git', 'dist', 'build', '.dart_tool', 'coverage']);
                const searchRecursive = (dir) => {
                    if (matches.length >= 50)
                        return; // Cap results
                    const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        if (ignoreSet.has(entry.name))
                            continue;
                        const fullPath = path_1.default.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            searchRecursive(fullPath);
                        }
                        else if (entry.isFile()) {
                            try {
                                const content = fs_1.default.readFileSync(fullPath, 'utf-8');
                                const lines = content.split('\n');
                                lines.forEach((line, idx) => {
                                    if (line.includes(args.query)) {
                                        matches.push({
                                            file: path_1.default.relative(workspace.getWorkspaceRoot(), fullPath),
                                            line: idx + 1,
                                            text: line.trim(),
                                        });
                                    }
                                });
                            }
                            catch {
                                // Ignore binary/read errors
                            }
                        }
                    }
                };
                searchRecursive(searchDir);
                return {
                    tool: 'search_code',
                    success: true,
                    output: { query: args.query, matchesCount: matches.length, matches },
                    durationMs: Date.now() - startTime,
                };
            }
            catch (err) {
                return {
                    tool: 'search_code',
                    success: false,
                    output: null,
                    error: err.message,
                    durationMs: Date.now() - startTime,
                };
            }
        },
        create_file: async (args) => {
            const startTime = Date.now();
            try {
                const targetPath = workspace.resolvePath(args.path);
                const parentDir = path_1.default.dirname(targetPath);
                if (!fs_1.default.existsSync(parentDir)) {
                    fs_1.default.mkdirSync(parentDir, { recursive: true });
                }
                fs_1.default.writeFileSync(targetPath, args.content || '', 'utf-8');
                return {
                    tool: 'create_file',
                    success: true,
                    output: { path: args.path, message: `File ${args.path} created successfully.` },
                    durationMs: Date.now() - startTime,
                };
            }
            catch (err) {
                return {
                    tool: 'create_file',
                    success: false,
                    output: null,
                    error: err.message,
                    durationMs: Date.now() - startTime,
                };
            }
        },
        create_folder: async (args) => {
            const startTime = Date.now();
            try {
                const targetPath = workspace.resolvePath(args.path);
                fs_1.default.mkdirSync(targetPath, { recursive: true });
                return {
                    tool: 'create_folder',
                    success: true,
                    output: { path: args.path, message: `Folder ${args.path} created successfully.` },
                    durationMs: Date.now() - startTime,
                };
            }
            catch (err) {
                return {
                    tool: 'create_folder',
                    success: false,
                    output: null,
                    error: err.message,
                    durationMs: Date.now() - startTime,
                };
            }
        },
        edit_file: async (args) => {
            const startTime = Date.now();
            try {
                const targetPath = workspace.resolvePath(args.path);
                if (!fs_1.default.existsSync(targetPath)) {
                    throw new Error(`File not found to edit: ${args.path}`);
                }
                fs_1.default.writeFileSync(targetPath, args.content, 'utf-8');
                return {
                    tool: 'edit_file',
                    success: true,
                    output: { path: args.path, message: `File ${args.path} edited successfully.` },
                    durationMs: Date.now() - startTime,
                };
            }
            catch (err) {
                return {
                    tool: 'edit_file',
                    success: false,
                    output: null,
                    error: err.message,
                    durationMs: Date.now() - startTime,
                };
            }
        },
        delete_file: async (args) => {
            const startTime = Date.now();
            try {
                const targetPath = workspace.resolvePath(args.path);
                if (!fs_1.default.existsSync(targetPath)) {
                    throw new Error(`File not found to delete: ${args.path}`);
                }
                const stat = fs_1.default.statSync(targetPath);
                if (stat.isDirectory()) {
                    fs_1.default.rmSync(targetPath, { recursive: true, force: true });
                }
                else {
                    fs_1.default.unlinkSync(targetPath);
                }
                return {
                    tool: 'delete_file',
                    success: true,
                    output: { path: args.path, message: `Path ${args.path} deleted successfully.` },
                    durationMs: Date.now() - startTime,
                };
            }
            catch (err) {
                return {
                    tool: 'delete_file',
                    success: false,
                    output: null,
                    error: err.message,
                    durationMs: Date.now() - startTime,
                };
            }
        },
    };
}
//# sourceMappingURL=fileTools.js.map