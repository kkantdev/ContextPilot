"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMAND_REGISTRY = void 0;
exports.getCommandDefinition = getCommandDefinition;
exports.isBlockedCommand = isBlockedCommand;
exports.listCommandActions = listCommandActions;
exports.gitIsBlocked = gitIsBlocked;
function gitIsBlocked(args) {
    const subAction = String(args.command || '').toLowerCase();
    if (subAction.includes('remote set-url') && /:\/\/[^\s]*@/.test(subAction))
        return true;
    if (subAction.includes('credential'))
        return true;
    return false;
}
exports.COMMAND_REGISTRY = [
    // ── Flutter ─────────────────────────────────────────────────────────────
    { action: 'flutter_doctor', group: 'flutter', executable: 'flutter', risk: 'SAFE', description: 'Run Flutter environment diagnostics.', build: () => 'flutter doctor' },
    { action: 'flutter_analyze', group: 'flutter', executable: 'flutter', risk: 'SAFE', description: 'Analyze the Flutter project for issues.', build: () => 'flutter analyze' },
    { action: 'flutter_test', group: 'flutter', executable: 'flutter', risk: 'SAFE', description: 'Run the Flutter test suite.', build: () => 'flutter test', longRunning: true },
    { action: 'flutter_pub_get', group: 'flutter', executable: 'flutter', risk: 'REVIEW', description: 'Fetch Flutter/Dart packages.', build: () => 'flutter pub get' },
    { action: 'flutter_pub_outdated', group: 'flutter', executable: 'flutter', risk: 'SAFE', description: 'List outdated Flutter/Dart packages.', build: () => 'flutter pub outdated' },
    { action: 'flutter_build_apk', group: 'flutter', executable: 'flutter', risk: 'REVIEW', description: 'Build the Flutter debug APK.', build: () => 'flutter build apk --debug', longRunning: true },
    { action: 'flutter_run', group: 'flutter', executable: 'flutter', risk: 'REVIEW', description: 'Launch the Flutter app.', build: () => 'flutter run' },
    // ── npm ─────────────────────────────────────────────────────────────────
    { action: 'npm_install', group: 'npm', executable: 'npm', risk: 'REVIEW', description: 'Install npm project dependencies.', build: (a) => `npm install ${a.package || ''}`.trim() },
    { action: 'npm_test', group: 'npm', executable: 'npm', risk: 'SAFE', description: 'Run the npm test suite.', build: () => 'npm test', longRunning: true },
    { action: 'npm_run_build', group: 'npm', executable: 'npm', risk: 'REVIEW', description: 'Run the npm build.', build: () => 'npm run build', longRunning: true },
    { action: 'npm_run_lint', group: 'npm', executable: 'npm', risk: 'REVIEW', description: 'Run npm lint over the project.', build: () => 'npm run lint' },
    { action: 'npm_audit', group: 'npm', executable: 'npm', risk: 'SAFE', description: 'Run npm security vulnerability audit.', build: (a) => (a.auditLevel ? `npm audit --audit-level=${a.auditLevel}` : 'npm audit') },
    { action: 'npm_audit_high', group: 'npm', executable: 'npm', risk: 'SAFE', description: 'Run npm security audit at high severity.', build: () => 'npm audit --audit-level=high' },
    // ── Git ─────────────────────────────────────────────────────────────────
    { action: 'git_status', group: 'git', executable: 'git', risk: 'SAFE', description: 'Show git working-tree status.', build: () => 'git status' },
    { action: 'git_diff', group: 'git', executable: 'git', risk: 'SAFE', description: 'Show uncommitted diff.', build: (a) => (a.path ? `git diff -- "${a.path}"` : 'git diff') },
    { action: 'git_branch', group: 'git', executable: 'git', risk: 'SAFE', description: 'List git branches.', build: () => 'git branch' },
    { action: 'git_log', group: 'git', executable: 'git', risk: 'SAFE', description: 'Show recent git commits.', build: (a) => `git log${a.limit ? ` -${a.limit}` : ''}` },
    { action: 'git_checkout', group: 'git', executable: 'git', risk: 'REVIEW', description: 'Checkout a git branch or commit.', build: (a) => `git checkout ${a.branch || ''}`.trim() },
    { action: 'git_commit', group: 'git', executable: 'git', risk: 'REVIEW', description: 'Create a git commit.', build: (a) => `git commit -m "${a.message || 'ContextPilot commit'}"` },
    { action: 'git_reset_hard', group: 'git', executable: 'git', risk: 'DANGEROUS', description: 'Hard reset git working tree (destructive).', build: (a) => `git reset --hard ${a.ref || ''}`.trim() },
    { action: 'git_clean_fd', group: 'git', executable: 'git', risk: 'DANGEROUS', description: 'Force-clean untracked files and directories (destructive).', build: () => 'git clean -fd' },
    // ── Docker ──────────────────────────────────────────────────────────────
    { action: 'docker_version', group: 'docker', executable: 'docker', risk: 'SAFE', description: 'Show Docker version.', build: () => 'docker --version' },
    { action: 'docker_ps', group: 'docker', executable: 'docker', risk: 'SAFE', description: 'List running Docker containers.', build: () => 'docker ps' },
    { action: 'docker_images', group: 'docker', executable: 'docker', risk: 'SAFE', description: 'List Docker images.', build: () => 'docker images' },
    { action: 'docker_compose_ps', group: 'docker', executable: 'docker', risk: 'SAFE', description: 'List Docker Compose services.', build: () => 'docker compose ps' },
    { action: 'docker_compose_up', group: 'docker', executable: 'docker', risk: 'REVIEW', description: 'Start Docker Compose services.', build: () => 'docker compose up', longRunning: true },
    { action: 'docker_compose_down', group: 'docker', executable: 'docker', risk: 'REVIEW', description: 'Stop Docker Compose services.', build: () => 'docker compose down', longRunning: true },
    { action: 'docker_compose_logs', group: 'docker', executable: 'docker', risk: 'SAFE', description: 'Show Docker Compose logs.', build: () => 'docker compose logs', longRunning: true },
    // ── Python ──────────────────────────────────────────────────────────────
    { action: 'python_version', group: 'python', executable: 'python', risk: 'SAFE', description: 'Show Python version.', build: () => 'python --version' },
    { action: 'python_pytest', group: 'python', executable: 'python', risk: 'SAFE', description: 'Run the Python pytest suite.', build: () => 'python -m pytest', longRunning: true },
];
function getCommandDefinition(action) {
    return exports.COMMAND_REGISTRY.find((c) => c.action === action);
}
function isBlockedCommand(def, args) {
    if (def.risk === 'BLOCKED')
        return { blocked: true, reason: 'Command is classified BLOCKED by ContextPilot policy.' };
    if (def.group === 'git' && gitIsBlocked(args)) {
        return { blocked: true, reason: 'Git command attempts to modify remote credentials or push secret material.' };
    }
    return { blocked: false };
}
function listCommandActions() {
    return exports.COMMAND_REGISTRY.map((c) => c.action);
}
//# sourceMappingURL=registry.js.map