"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceManager = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class WorkspaceManager {
    rootPath;
    constructor(workspacePath) {
        const rawPath = workspacePath ? path_1.default.resolve(workspacePath) : process.cwd();
        this.rootPath = fs_1.default.realpathSync(rawPath);
    }
    getWorkspaceRoot() {
        return this.rootPath;
    }
    getProjectName() {
        return path_1.default.basename(this.rootPath);
    }
    /**
     * Resolves a target path relative to workspace root.
     * Throws an error if the path escapes the workspace root (path traversal attempt).
     */
    resolvePath(relativePath) {
        const resolved = path_1.default.resolve(this.rootPath, relativePath);
        // Check if the resolved path starts with the workspace root path
        if (!resolved.startsWith(this.rootPath)) {
            throw new Error(`Access denied: Path "${relativePath}" escapes workspace root "${this.rootPath}"`);
        }
        return resolved;
    }
    /**
     * Validates if a path is inside the workspace without throwing.
     */
    isPathInWorkspace(targetPath) {
        try {
            this.resolvePath(targetPath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Detects project metadata based on root files.
     */
    detectProject() {
        const name = this.getProjectName();
        let language = 'Unknown';
        let framework = 'Unknown';
        let packageManager = 'Unknown';
        let testFramework = undefined;
        const isGitRepo = fs_1.default.existsSync(path_1.default.join(this.rootPath, '.git'));
        if (fs_1.default.existsSync(path_1.default.join(this.rootPath, 'pubspec.yaml'))) {
            language = 'Dart';
            framework = 'Flutter';
            packageManager = 'pub';
            testFramework = 'flutter test';
        }
        else if (fs_1.default.existsSync(path_1.default.join(this.rootPath, 'package.json'))) {
            language = 'JavaScript/TypeScript';
            packageManager = 'npm';
            testFramework = 'npm test';
            try {
                const pkgContent = fs_1.default.readFileSync(path_1.default.join(this.rootPath, 'package.json'), 'utf-8');
                const pkg = JSON.parse(pkgContent);
                if (pkg.dependencies?.next || pkg.devDependencies?.next) {
                    framework = 'Next.js';
                }
                else if (pkg.dependencies?.react || pkg.devDependencies?.react) {
                    framework = 'React';
                }
                else if (pkg.dependencies?.express || pkg.devDependencies?.express) {
                    framework = 'Express/Node.js';
                }
                else {
                    framework = 'Node.js';
                }
            }
            catch {
                framework = 'Node.js';
            }
        }
        else if (fs_1.default.existsSync(path_1.default.join(this.rootPath, 'pyproject.toml')) ||
            fs_1.default.existsSync(path_1.default.join(this.rootPath, 'requirements.txt')) ||
            fs_1.default.existsSync(path_1.default.join(this.rootPath, 'main.py'))) {
            language = 'Python';
            framework = 'Python Project';
            packageManager = 'pip';
            testFramework = 'pytest';
        }
        else if (fs_1.default.existsSync(path_1.default.join(this.rootPath, 'Cargo.toml'))) {
            language = 'Rust';
            framework = 'Cargo Project';
            packageManager = 'cargo';
            testFramework = 'cargo test';
        }
        else if (fs_1.default.existsSync(path_1.default.join(this.rootPath, 'go.mod'))) {
            language = 'Go';
            framework = 'Go Module';
            packageManager = 'go';
            testFramework = 'go test';
        }
        const countFiles = (dir) => {
            const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.dart_tool', 'coverage']);
            try {
                return fs_1.default.readdirSync(dir, { withFileTypes: true }).reduce((count, entry) => {
                    if (ignored.has(entry.name))
                        return count;
                    return count + (entry.isDirectory() ? countFiles(path_1.default.join(dir, entry.name)) : 1);
                }, 0);
            }
            catch {
                return 0;
            }
        };
        let branch;
        try {
            branch = require('child_process').execFileSync('git', ['branch', '--show-current'], { cwd: this.rootPath, encoding: 'utf8' }).trim() || undefined;
        }
        catch { }
        return {
            id: Buffer.from(this.rootPath).toString('hex').slice(0, 12),
            name,
            rootPath: this.rootPath,
            language,
            framework,
            packageManager,
            isGitRepo,
            testFramework,
            branch,
            totalFiles: countFiles(this.rootPath),
        };
    }
    /**
     * Generates a structural summary tree of the project (up to depth 2, excluding node_modules, .git, build, dist).
     */
    generateProjectTreeSummary(maxDepth = 2) {
        const ignoreList = new Set(['node_modules', '.git', 'dist', 'build', '.dart_tool', '.idea', '.vscode', 'coverage']);
        const readDirRecursive = (dir, depth) => {
            if (depth > maxDepth)
                return [];
            const lines = [];
            try {
                const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (ignoreList.has(entry.name))
                        continue;
                    const relPath = path_1.default.relative(this.rootPath, path_1.default.join(dir, entry.name));
                    const indent = '  '.repeat(depth);
                    if (entry.isDirectory()) {
                        lines.push(`${indent}📁 ${entry.name}/`);
                        lines.push(...readDirRecursive(path_1.default.join(dir, entry.name), depth + 1));
                    }
                    else {
                        lines.push(`${indent}📄 ${entry.name}`);
                    }
                }
            }
            catch (err) {
                // Ignore read errors
            }
            return lines;
        };
        const tree = readDirRecursive(this.rootPath, 0);
        return tree.join('\n');
    }
}
exports.WorkspaceManager = WorkspaceManager;
//# sourceMappingURL=manager.js.map