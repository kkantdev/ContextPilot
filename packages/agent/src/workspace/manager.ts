import path from 'path';
import fs from 'fs';
import { ProjectInfo } from '../types/protocol';

export class WorkspaceManager {
  private rootPath: string;

  constructor(workspacePath?: string) {
    const rawPath = workspacePath ? path.resolve(workspacePath) : process.cwd();
    this.rootPath = fs.realpathSync(rawPath);
  }

  public getWorkspaceRoot(): string {
    return this.rootPath;
  }

  public getProjectName(): string {
    return path.basename(this.rootPath);
  }

  /**
   * Resolves a target path relative to workspace root.
   * Throws an error if the path escapes the workspace root (path traversal attempt).
   */
  public resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.rootPath, relativePath);
    
    // Check if the resolved path starts with the workspace root path
    if (!resolved.startsWith(this.rootPath)) {
      throw new Error(`Access denied: Path "${relativePath}" escapes workspace root "${this.rootPath}"`);
    }

    return resolved;
  }

  /**
   * Validates if a path is inside the workspace without throwing.
   */
  public isPathInWorkspace(targetPath: string): boolean {
    try {
      this.resolvePath(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detects project metadata based on root files.
   */
  public detectProject(): ProjectInfo {
    const name = this.getProjectName();
    let language = 'Unknown';
    let framework = 'Unknown';
    let packageManager = 'Unknown';
    let testFramework: string | undefined = undefined;

    const isGitRepo = fs.existsSync(path.join(this.rootPath, '.git'));

    if (fs.existsSync(path.join(this.rootPath, 'pubspec.yaml'))) {
      language = 'Dart';
      framework = 'Flutter';
      packageManager = 'pub';
      testFramework = 'flutter test';
    } else if (fs.existsSync(path.join(this.rootPath, 'package.json'))) {
      language = 'JavaScript/TypeScript';
      packageManager = 'npm';
      testFramework = 'npm test';

      try {
        const pkgContent = fs.readFileSync(path.join(this.rootPath, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgContent);
        if (pkg.dependencies?.next || pkg.devDependencies?.next) {
          framework = 'Next.js';
        } else if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          framework = 'React';
        } else if (pkg.dependencies?.express || pkg.devDependencies?.express) {
          framework = 'Express/Node.js';
        } else {
          framework = 'Node.js';
        }
      } catch {
        framework = 'Node.js';
      }
    } else if (
      fs.existsSync(path.join(this.rootPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(this.rootPath, 'requirements.txt')) ||
      fs.existsSync(path.join(this.rootPath, 'main.py'))
    ) {
      language = 'Python';
      framework = 'Python Project';
      packageManager = 'pip';
      testFramework = 'pytest';
    } else if (fs.existsSync(path.join(this.rootPath, 'Cargo.toml'))) {
      language = 'Rust';
      framework = 'Cargo Project';
      packageManager = 'cargo';
      testFramework = 'cargo test';
    } else if (fs.existsSync(path.join(this.rootPath, 'go.mod'))) {
      language = 'Go';
      framework = 'Go Module';
      packageManager = 'go';
      testFramework = 'go test';
    }

    const countFiles = (dir: string): number => {
      const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.dart_tool', 'coverage']);
      try {
        return fs.readdirSync(dir, { withFileTypes: true }).reduce((count, entry) => {
          if (ignored.has(entry.name)) return count;
          return count + (entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1);
        }, 0);
      } catch { return 0; }
    };
    let branch: string | undefined;
    try {
      branch = require('child_process').execFileSync('git', ['branch', '--show-current'], { cwd: this.rootPath, encoding: 'utf8' }).trim() || undefined;
    } catch {}
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
  public generateProjectTreeSummary(maxDepth = 2): string {
    const ignoreList = new Set(['node_modules', '.git', 'dist', 'build', '.dart_tool', '.idea', '.vscode', 'coverage']);

    const readDirRecursive = (dir: string, depth: number): string[] => {
      if (depth > maxDepth) return [];
      const lines: string[] = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (ignoreList.has(entry.name)) continue;

          const relPath = path.relative(this.rootPath, path.join(dir, entry.name));
          const indent = '  '.repeat(depth);

          if (entry.isDirectory()) {
            lines.push(`${indent}📁 ${entry.name}/`);
            lines.push(...readDirRecursive(path.join(dir, entry.name), depth + 1));
          } else {
            lines.push(`${indent}📄 ${entry.name}`);
          }
        }
      } catch (err) {
        // Ignore read errors
      }

      return lines;
    };

    const tree = readDirRecursive(this.rootPath, 0);
    return tree.join('\n');
  }
}
