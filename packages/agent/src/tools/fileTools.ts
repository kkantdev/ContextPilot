import fs from 'fs';
import path from 'path';
import { WorkspaceManager } from '../workspace/manager';
import { ToolResult } from '../types/protocol';

export function registerFileTools(workspace: WorkspaceManager) {
  return {
    list_directory: async (args: { path?: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const targetPath = workspace.resolvePath(args.path || '.');
        const items = fs.readdirSync(targetPath, { withFileTypes: true });
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
      } catch (err: any) {
        return {
          tool: 'list_directory',
          success: false,
          output: null,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },

    read_file: async (args: { path: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const targetPath = workspace.resolvePath(args.path);
        if (!fs.existsSync(targetPath)) {
          throw new Error(`File not found: ${args.path}`);
        }
        const content = fs.readFileSync(targetPath, 'utf-8');
        return {
          tool: 'read_file',
          success: true,
          output: { path: args.path, content },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          tool: 'read_file',
          success: false,
          output: null,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },

    search_code: async (args: { query: string; path?: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const searchDir = workspace.resolvePath(args.path || '.');
        const matches: Array<{ file: string; line: number; text: string }> = [];

        const ignoreSet = new Set(['node_modules', '.git', 'dist', 'build', '.dart_tool', 'coverage']);

        const searchRecursive = (dir: string) => {
          if (matches.length >= 50) return; // Cap results
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (ignoreSet.has(entry.name)) continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              searchRecursive(fullPath);
            } else if (entry.isFile()) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                  if (line.includes(args.query)) {
                    matches.push({
                      file: path.relative(workspace.getWorkspaceRoot(), fullPath),
                      line: idx + 1,
                      text: line.trim(),
                    });
                  }
                });
              } catch {
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
      } catch (err: any) {
        return {
          tool: 'search_code',
          success: false,
          output: null,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },

    create_file: async (args: { path: string; content?: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const targetPath = workspace.resolvePath(args.path);
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(targetPath, args.content || '', 'utf-8');
        return {
          tool: 'create_file',
          success: true,
          output: { path: args.path, message: `File ${args.path} created successfully.` },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          tool: 'create_file',
          success: false,
          output: null,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },

    create_folder: async (args: { path: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const targetPath = workspace.resolvePath(args.path);
        fs.mkdirSync(targetPath, { recursive: true });
        return {
          tool: 'create_folder',
          success: true,
          output: { path: args.path, message: `Folder ${args.path} created successfully.` },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          tool: 'create_folder',
          success: false,
          output: null,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },

    edit_file: async (args: { path: string; content: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const targetPath = workspace.resolvePath(args.path);
        if (!fs.existsSync(targetPath)) {
          throw new Error(`File not found to edit: ${args.path}`);
        }
        fs.writeFileSync(targetPath, args.content, 'utf-8');
        return {
          tool: 'edit_file',
          success: true,
          output: { path: args.path, message: `File ${args.path} edited successfully.` },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          tool: 'edit_file',
          success: false,
          output: null,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },

    delete_file: async (args: { path: string }): Promise<ToolResult> => {
      const startTime = Date.now();
      try {
        const targetPath = workspace.resolvePath(args.path);
        if (!fs.existsSync(targetPath)) {
          throw new Error(`File not found to delete: ${args.path}`);
        }
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(targetPath);
        }
        return {
          tool: 'delete_file',
          success: true,
          output: { path: args.path, message: `Path ${args.path} deleted successfully.` },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
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
