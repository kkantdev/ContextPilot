import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WorkspaceManager } from '../src/workspace/manager';
import { PermissionEngine } from '../src/permission/engine';
import { ToolRegistry } from '../src/tools/registry';

describe('ToolRegistry', () => {
  const workspace = new WorkspaceManager(process.cwd());
  const permissionEngine = new PermissionEngine(workspace);
  const registry = new ToolRegistry(workspace, permissionEngine);

  it('should expose expected tool definitions', () => {
    const definitions = registry.getToolDefinitions();
    const toolNames = definitions.map((d) => d.name);

    expect(toolNames).toContain('read_file');
    expect(toolNames).toContain('create_file');
    expect(toolNames).toContain('edit_file');
    expect(toolNames).toContain('delete_file');
    expect(toolNames).toContain('run_command');
    expect(toolNames).toContain('git_status');
    expect(toolNames).toContain('security_scan');
  });

  it('should execute read_file tool safely', async () => {
    const res = await registry.executeTool('read_file', { path: 'package.json' });
    expect(res.success).toBe(true);
    expect(res.output.content).toContain('contextpilot');
  });

  it('should execute git_status tool', async () => {
    const res = await registry.executeTool('git_status', {});
    expect(res.success).toBe(true);
    expect(res.output.branch).toBeDefined();
  });

  it('should execute security_scan tool', async () => {
    const res = await registry.executeTool('security_scan', {});
    expect(res.success).toBe(true);
    expect(res.output.scanner).toContain('ContextPilot');
  });

  it('should safely create, edit, and delete temporary files within workspace', async () => {
    const tempFile = 'dist_test_file.txt';

    // 1. Create file
    const createRes = await registry.executeTool('create_file', { path: tempFile, content: 'Initial Content' });
    expect(createRes.success).toBe(true);

    // 2. Read file
    const readRes = await registry.executeTool('read_file', { path: tempFile });
    expect(readRes.output.content).toBe('Initial Content');

    // 3. Edit file
    const editRes = await registry.executeTool('edit_file', { path: tempFile, content: 'Updated Content' });
    expect(editRes.success).toBe(true);

    // 4. Delete file
    const deleteRes = await registry.executeTool('delete_file', { path: tempFile });
    expect(deleteRes.success).toBe(true);

    expect(fs.existsSync(path.join(process.cwd(), tempFile))).toBe(false);
  });
});
