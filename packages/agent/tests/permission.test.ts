import { describe, it, expect } from 'vitest';
import { WorkspaceManager } from '../src/workspace/manager';
import { PermissionEngine } from '../src/permission/engine';

describe('PermissionEngine', () => {
  const workspace = new WorkspaceManager(process.cwd());
  const engine = new PermissionEngine(workspace);

  it('should classify read-only operations as SAFE', () => {
    expect(engine.classifyRisk('read_file', { path: 'package.json' })).toBe('SAFE');
    expect(engine.classifyRisk('git_status', {})).toBe('SAFE');
  });

  it('should classify mutating operations as REVIEW', () => {
    expect(engine.classifyRisk('create_file', { path: 'test.ts' })).toBe('REVIEW');
    expect(engine.classifyRisk('edit_file', { path: 'test.ts' })).toBe('REVIEW');
  });

  it('should classify dangerous commands as DANGEROUS', () => {
    expect(engine.classifyRisk('run_command', { command: 'rm -rf /' })).toBe('DANGEROUS');
    expect(engine.classifyRisk('run_command', { command: 'git reset --hard' })).toBe('DANGEROUS');
  });

  it('should deny actions targeting paths outside workspace', () => {
    const check = engine.checkPermission('read_file', { path: '../../outside.txt' });
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('outside the workspace boundary');
  });
});
