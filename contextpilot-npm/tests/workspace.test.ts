import { describe, it, expect } from 'vitest';
import path from 'path';
import { WorkspaceManager } from '../src/workspace/manager';

describe('WorkspaceManager', () => {
  const workspace = new WorkspaceManager(process.cwd());

  it('should establish workspace root correctly', () => {
    expect(workspace.getWorkspaceRoot()).toBe(process.cwd());
  });

  it('should resolve valid relative paths inside workspace', () => {
    const resolved = workspace.resolvePath('package.json');
    expect(resolved).toBe(path.join(process.cwd(), 'package.json'));
  });

  it('should throw an error on path traversal attempts outside workspace', () => {
    expect(() => workspace.resolvePath('../../secret.txt')).toThrow(/Access denied/);
  });

  it('should detect project information', () => {
    const project = workspace.detectProject();
    expect(project.name).toBe('contextpilot-npm');
    expect(project.language).toBe('JavaScript/TypeScript');
    expect(project.packageManager).toBe('npm');
  });
});
