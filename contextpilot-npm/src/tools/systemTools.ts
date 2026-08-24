import { execFileSync } from 'child_process';
import { logger } from '../utils/logger';

export interface EnvironmentTools {
  node: boolean;
  npm: boolean;
  git: boolean;
  flutter: boolean;
  docker: boolean;
  python: boolean;
  ollama: boolean;
  versions: Record<string, string>;
}

/**
 * Runs `<executable> <args>` and returns the trimmed first output line, or null
 * if the command cannot be resolved/run. On Windows, `.cmd`/`.bat` shims (npm,
 * flutter) cannot be spawned directly by execFileSync, so a second attempt
 * routes the fixed, benign command through cmd.exe (avoids an ENOENT without
 * the `shell:true` deprecation warning).
 */
function probeVersion(executable: string, args: string[]): string | null {
  const attempts: Array<[string, string[]]> = [[executable, args]];
  if (process.platform === 'win32' && process.env.ComSpec) {
    attempts.push([process.env.ComSpec, ['/d', '/c', [executable, ...args].join(' ')]]);
  }
  for (const [bin, binArgs] of attempts) {
    try {
      const out = execFileSync(bin, binArgs, { encoding: 'utf8' }).trim().split('\n')[0];
      if (out) return out;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** Checks whether an executable resolves via PATH (cached per process). */
const checkedExecutables = new Map<string, boolean>();

export function executableAvailable(executable: string): boolean {
  if (checkedExecutables.has(executable)) return checkedExecutables.get(executable)!;
  const available = probeVersion(executable, ['--version']) !== null;
  checkedExecutables.set(executable, available);
  return available;
}

/** Runs an executable's --version and returns the trimmed first line. */
export function getExecutableVersion(executable: string, args = ['--version']): string | undefined {
  return probeVersion(executable, args) ?? undefined;
}

export function detectEnvironment(): EnvironmentTools {
  const tools: EnvironmentTools = {
    node: executableAvailable('node'),
    npm: executableAvailable('npm'),
    git: executableAvailable('git'),
    flutter: executableAvailable('flutter'),
    docker: executableAvailable('docker'),
    python: executableAvailable('python'),
    // Real reachability is set by the Ollama detection layer; default false here.
    ollama: false,
    versions: {},
  };

  if (tools.node) tools.versions.node = getExecutableVersion('node') || 'available';
  if (tools.npm) tools.versions.npm = getExecutableVersion('npm', ['-v']) || 'available';
  if (tools.git) tools.versions.git = getExecutableVersion('git', ['--version']) || 'available';
  if (tools.flutter) tools.versions.flutter = getExecutableVersion('flutter', ['--version']) || 'available';
  if (tools.docker) tools.versions.docker = getExecutableVersion('docker', ['--version']) || 'available';
  if (tools.python) tools.versions.python = getExecutableVersion('python', ['--version']) || 'available';

  logger.debug('Environment detection', JSON.stringify({ ...tools, versions: tools.versions }));
  return tools;
}