# ContextPilot — NPM / Laptop Agent Memory

> **Current-implementation memory for the laptop agent only.** Source of truth is `packages/agent/`.

## Purpose

The laptop agent is a Node.js / TypeScript process that runs inside a project directory. It serves as the bridge between the ContextPilot mobile app and the developer workstation: it pairs a phone, validates and maps allowed actions to typed command templates, executes them in the workspace, and streams output back over WebSocket.

## Architecture

- Express HTTP server for lightweight endpoints + `ws` WebSocket server for the real-time protocol (both on the same port).
- Modular components: `SessionManager` (pairing), `WorkspaceManager` (root + sandbox), `PermissionEngine` (risk), `CommandRegistry` (allowlist), `Executor` (spawn), `AIOrchestrator` (planning), `EventManager` (broadcast), `OperationManager` (approval/ops).
- Binaries: `bin/contextpilot.js` starts the CLI; `src/index.ts` re-exports the public API.

## Entry point

- `bin/contextpilot.js` -> requires `dist/cli/index.js`.
- CLI (`src/cli/index.ts`, commander): `start` (default), `doctor`, `mock-client`.
- On `start`: loads config, creates `WorkspaceManager`, `SessionManager`, `AgentServer`, generates a pairing QR, optionally detects Ollama, then binds the HTTP+WS server.

## package.json

- Name `contextpilot`, version `1.0.0`, `main` + `types` point to `dist/index.js`.
- `bin.contextpilot` -> `bin/contextpilot.js`.
- License `MIT`. Engines `node >= 18`.

## NPM scripts

- `build`: `tsc`
- `dev`: `tsx src/cli/index.ts`
- `start`: `node dist/cli/index.js`
- `test`: `vitest run`
- `mock-client`: `tsx src/cli/index.ts mock-client`
- `prepack`: `npm run build`

## Network / server layer

- Express app with `cors()` + `express.json()`, then wrapped in an `http` server; a `WebSocketServer` is attached to that server.
- HTTP endpoints: `GET /api/health`, `GET /api/project`, `POST /api/pair`, `GET /api/commands`.
- WebSocket: at the server root; messages are JSON `ProtocolMessage { protocolVersion, messageId, type, timestamp, sessionId?, operationId?, payload }`.
- Messages dispatched by `type`: `pairing`, `user_request`, `action_request`, `approval_response`, `cancel_request`, `command.cancel`.
- Port: default `8765`; on `EADDRINUSE` the agent tries the next port up to 10 total.

## Pairing

- `SessionManager.generatePairingPayload()` builds the QR payload `{ protocolVersion, agentId, host, port, pairingToken, projectName, projectId, expiresAt }`.
- Token: 8 random bytes hex, TTL `TOKEN_TTL_SECONDS` (default 300), **single-use** (invalidated once a session is created), compared with `crypto.timingSafeEqual`.
- Pairing via HTTP `POST /api/pair` (zod-validated) or a WebSocket `pairing` message.
- A successful pair creates a session; all other request types require a valid session id.

## Workspace manager

- Root = `process.cwd()` at startup (or an explicit path), resolved via `fs.realpathSync`.
- `detectProject()` infers language/framework from root files (see Project Memory) and computes branch, file count, and a hex project id.
- `resolvePath(rel)` rejects any path escaping the root (path traversal).
- `generateProjectTreeSummary()` builds a depth-limited tree (ignoring node_modules/.git/build/dist/etc.).

## activeWorkspace

- There is a single active workspace per process: the directory the agent started in (`WorkspaceManager.getWorkspaceRoot()`). There is no runtime switching between projects.

## Command / action system

- `src/commands/registry.ts` defines 28 typed actions across Flutter (7), npm (6), Git (8), Docker (7), Python (2). Each `CommandDefinition` carries `{ action, group, executable, build(args), risk, longRunning? }`.
- The raw graph string is always produced by `build(args)` from a template; never accepted from the phone or LLM.
- `listCommandActions()` and `getCommandDefinition()` feed `/api/commands`.

## Process execution

- `runCommandTemplate` (in `src/commands/executor.ts`): checks allowlist, blocklist, executable presence, then runs the command.
- Spawn with `cwd = workspace root`. On Windows, `.cmd`/`.bat` shims `npm`, `flutter`, etc. are routed via `%ComSpec% /d /s /c`.
- Timeout: `DEFAULT_TIMEOUT_MS` = 120 000 ms (2 min); a timer hard-kills the child.

## cwd handling

- Command working directory = `WorkspaceManager.getWorkspaceRoot()`.

## stdout / stderr

- Streamed per chunk via `command.output` WS events (also emits legacy `tool_*`/`operation_*` events).
- Captured into `result.stdout` / `result.stderr`.

## exit codes

- Child exit code captured into `result.exitCode`; `status` is `success` (0) or `failed` (non-zero) unless cancelled/unavailable/blocked.

## cancellation (if implemented)

- Implemented: `cancelCommand(requestId)` -> kills the tracked child via `RunningCommand`/`runningProcesses` map; `OperationManager.cancelOperation` also cancels an in-flight operation and updates state to `cancelled`.

## Security

- Zod validation of all inbound payloads.
- Allowlist of command actions; anything else -> `COMMAND_NOT_ALLOWED`.
- Permission/risk engine: SAFE (no approval), REVIEW/DANGEROUS (approval required), BLOCKED (never runs).
- Path sandbox (`resolvePath`).
- No raw shell from phone/LLM; command derived from templates.
- Legacy `run_command` tool is hidden from the LLM and permission-gated.
- Git-credential / `remote set-url` credential patterns are blocked.

## Event protocol

- Server-to-phone broadcast events include: `plan_created`, `tool_started`, `tool_completed`, `operation_started`, `operation_completed`, `operation_failed`, `operation_cancelled`, `approval_required`, plus streaming `command.start`, `command.output`, `command.completed`, `command.error`, `command.cancelled`.
- Frames wrapped in `ProtocolMessage` (single JSON object per WS message).

## Ollama integration (implemented)

- Local AI detection via `GET /api/tags`; adapter calls `POST /api/generate`.
- Endpoint `CONTEXT_PILOT_OLLAMA_HOST` / `OLLAMA_HOST` (default `http://localhost:11434`), model `CONTEXTPILOT_MODEL` (default `qwen2.5-coder:1.5b`).
- `AIOrchestrator.planUserRequest` -> streams a JSON plan (1-4 steps) using tools (with `run_command` filtered out); falls back to the Mock AI adapter if Ollama is unreachable.

## Configuration

- Loaded via `loadConfig(options)`; env vars and flags.
- Env vars: `PORT`, `HOST`, `CONTEXTPILOT_PORT`, `CONTEXTPILOT_HOST`, `CONTEXTPILOT_MODEL`, `OLLAMA_HOST`, `CONTEXTPILOT_USE_MOCK`, `LOG_LEVEL`, `TOKEN_TTL_SECONDS`, `CONTEXT_PILOT_OLLAMA_HOST`.

## Environment variables

- `TOKEN_TTL_SECONDS` (default 300), `CONTEXTPILOT_USE_MOCK` (bool), `LOG_LEVEL` (debug/info/warn/error), plus the ones above for host/port/model.

## Tests

- `packages/agent/tests/` uses vitest: `integration.test.ts`, `permission.test.ts`, `tools.test.ts`, `workspace.test.ts`. Run via `npm test`.

## Known issues

- Single active session; a new pairing replaces it.
- Single workspace (start directory); no runtime switch.
- Manual Flutter `defaultPort` vs agent default `8765` discrepancy (see Project Memory).
- MockAgentService in the Flutter app is a deprecated no-op.

## Planned features

- From PRD/TRD/UI-UX only (not implemented): on-device LLM, voice-first, screenshot/camera, GitHub/VS Code integrations, multi-project, remote access, cloud backend, session persistence across restarts.

## Important files

- `src/server/agentServer.ts` — HTTP + WS entry point and message routing.
- `src/commands/registry.ts` — command allowlist/definitions.
- `src/commands/executor.ts` — streaming + cancellation.
- `src/workspace/manager.ts` — root + sandbox + project detection.
- `src/permission/engine.ts` — risk/approval.
- `src/session/manager.ts` — pairing tokens/sessions.
- `src/tools/registry.ts` + `src/tools/commandTools.ts` — tool layer.
- `src/ai/orchestrator.ts` — plan generation (Ollama/Mock).
- `src/cli/index.ts` + `bin/contextpilot.js` — entry.
