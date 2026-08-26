# ContextPilot Project Memory

> **Current-implementation handoff document.** Read the source code before acting.
> Where this differs from the PRD/TRD/UI-UX, the source code is the current reality.

## 1. Project Identity

- **Project:** ContextPilot
- **Track:** Developer Tools
- **Platforms:** Android (mobile client) + Laptop (agent)
- **Main technologies:**
  - Flutter / Dart (mobile app, `apps/mobile`)
  - Node.js / TypeScript / npm (laptop agent, `packages/agent`)
- **Local AI:** Ollama is implemented and configured (optional); the agent falls back to a deterministic Mock AI adapter when Ollama is not reachable. See **Local AI** below.

## 2. Project Goal

ContextPilot is a phone-first developer agent. A developer uses the Flutter mobile app to connect to a laptop-side NPM agent over a local network and, from the phone, inspect, understand, modify, test, and secure a software project that lives on the laptop. The phone does not access the laptop filesystem directly; all project operations are performed by the agent on the laptop.

## 3. Problem

Developers constantly switch between IDE, terminal, project files, Git, test output, documentation, and AI assistants. Existing AI coding assistants are typically centered on the desktop IDE. ContextPilot explores a phone-first workflow where the developer stays on the phone while a laptop-side agent performs controlled operations on the actual project.

## 4. Solution

ContextPilot splits the workload between two components:

- A **laptop agent** (`packages/agent`) that runs inside a project directory, detects the project, exposes the workspace, pairs a phone, validates requests, maps allowed action IDs to typed command templates, and executes them with live stdout/stderr streaming.
- A **Flutter app** (`apps/mobile`) that pairs via QR, sends chat prompts and structured command requests over WebSocket, shows real-time terminal output, requests approval for risky actions, and displays project/activity/security status.

Pairing uses a short-lived, single-use token delivered by QR. Risky operations require explicit approval. A safe subset of actions is allowlisted and permission-gated.

## 5. Current Implementation Status

### DONE

- WebSocket-based pairing with a short-lived (default 300s), single-use token produced by the agent and delivered through a terminal QR code.
- Single active session model; every non-pairing WebSocket message must carry a valid `sessionId`.
- Workspace detection (Flutter / Node / Python / Rust / Go) from the current working directory and a path-traversal sandbox (`resolvePath`).
- 28 allowlisted developer command actions across Flutter, npm, Git, Docker, and Python groups, each mapping to a fixed typed command template.
- Real-time stdout/stderr streaming to the phone via `command.*` events with a 120s per-command timeout.
- Cancellation of running commands and operations.
- Risk classification and approval gating (SAFE / REVIEW / DANGEROUS) plus destructive-command blocking.
- Local AI planning via Ollama (HTTP `/api/tags` + `/api/generate`) with automatic Mock AI fallback.
- Mock phone client CLI for testing without a physical phone.
- HTTP health/project/pair/commands endpoints.
### IN PROGRESS

- No in-progress items were found in the current source. (Earlier notes mention a Developer Commands UI — see the command grid on the Flutter Home screen, which already lists commands.)

### PLANNED

The following appear only in PRD/TRD/UI-UX or are marked TODO; they are **not implemented** in the current code:

- On-device LLM, voice-first workflow, screenshot understanding, camera/OCR, GitHub integration, PR review, remote project access, VS Code extension, multi-project management, task execution with configurable permissions, cloud backend, persistent multi-session handling, and workspace persistence across runs.

### KNOWN ISSUES

- Port default mismatch: the agent defaults to port `8765`, while the Flutter `AppConstants.defaultPort` is `8080` and the manual connect form defaults to `8080`. QR pairing carries the real agent port, so this only affects manual IP/PORT entry.
- `MockAgentService` in the Flutter app is a deprecated no-op shell (empty streams, no-op methods) retained for backward compatibility; mock mode `isMockMode` is effectively always `false`.
- The agent keeps a single active session; pairing again replaces the current session.
- Some long-running commands (e.g., `flutter run`, `docker compose up`) will run until the 120s timeout unless cancelled.
- `apps/mobile/README.md` still references the old `../packages/agent` path (pre-organization).
- Existing legacy memory docs (`docs/AI-Memory/AI-MEMORY.md`, `AI-MEMORY-COMPLETE.md`) predate the reorganized layout and count 10 commands; the current registry has 28. They are preserved as-is (this file is the current one).

## 6. Current Architecture

- **Flutter mobile app** (`apps/mobile`): Riverpod-driven screens; WebSocket client for transport; QR scanner + manual IP/form to create a `ConnectionInfo`; chat/operation/approval providers.
- **Local network** (`ws://<host>:<port>`): the phone connects to the agent's WebSocket server over the LAN.
- **NPM agent** (`packages/agent`): Express HTTP server for a few endpoints + WebSocket server for the real-time protocol.
- **Pairing:** terminal QR payload → phone sends `pairing` with token/device → session created.
- **Request handling:** inbound WebSocket messages are type-dispatched (`pairing`, `user_request`, `action_request`, `approval_response`, `cancel_request`, `command.cancel`).
- **Validation:** zod schemas on all inbound payloads; session auth for all non-pairing messages.
- **Action mapping:** `getCommandDefinition(action)` → `CommandDefinition {action, group, executable, build(…), risk, longRunning}`.
- **Command execution:** `runCommandTemplate` checks allowlist, blocklist, executable presence, then spawns the child in the workspace root with streaming.
- **Output streaming:** `command.start/output/completed/error/cancelled` events broadcast to the connected phone.
- **Security:** allowlist, permission engine risk classification, approval gating, path sandbox, git credential blocking.
- **Local AI:** optional Ollama; Mock AI fallback for planning `user_request` into a JSON step plan.

Only components that actually exist are listed.
## 7. Communication Flow

```
Flutter app
  │  WebSocket (ws://<host>:<port>) JSON ProtocolMessage
  ▼
NPM Agent (WebSocket + Express)
  │  handleMessage(): type dispatch
  ▼
Request validation (zod schemas) + session check
  ▼
user_request  → AI planning (Ollama or Mock) → Plan
action_request → direct ActionRequest
  │
  ▼
Permission engine (risk classification + approval gating)
  │
  ▼
Command mapping (ActionRegistry → typed template)
  │
  ▼
Workspace root (cwd)
  │
  ▼
Command executor (spawn, cwd=workspace)
  │
  ▼
stdout / stderr (streamed via command.* events)
  │
  ▼
Flutter UI (chat / live terminal / activity)
```

## 8. Workspace System

- **Active workspace:** the agent is started from the project directory (uses `process.cwd()` by default). `WorkspaceManager` resolves it once via `fs.realpathSync`; `getWorkspaceRoot()` returns it.
- **Project detection:** `detectProject()` inspects root-level files: `pubspec.yaml` → Flutter/Dart, `package.json` → Node/Next.js/React/Express, `pyproject.toml`/`requirements.txt`/`main.py` → Python, `Cargo.toml` → Rust, `go.mod` → Go. Computes git branch, file count (ignoring build/node_modules/etc.), and a stable hex project id.
- **Project selection:** there is no remote selection UI; the workspace is whatever directory the agent started in.
- **Workspace validation:** `resolvePath` rejects any path that escapes the workspace root (path traversal).
- **Command working directory:** every command runs with `cwd = workspace.getWorkspaceRoot()`.
- **Workspace persistence:** none; the workspace is bound to the running process.

## 9. Command system

The actual supported action IDs (from `packages/agent/src/commands/registry.ts`, 28 total):

```
flutter_doctor           → flutter doctor
flutter_analyze          → flutter analyze
flutter_test             → flutter test
flutter_pub_get          → flutter pub get
flutter_pub_outdated     → flutter pub outdated
flutter_build_apk        → flutter build apk --debug
flutter_run              → flutter run
npm_install              → npm install [package]
## 10. Security

- **Request validation:** zod schema validation on every inbound WebSocket payload.
- **Allowed actions:** a fixed allowlist; anything else returns `COMMAND_NOT_ALLOWED`.
- **Workspace validation:** path sandbox (`resolvePath`) rejects escaping paths.
- **Command mapping:** raw shell strings are never accepted from the phone or LLM; the command is always derived from a `CommandDefinition` template.
- **Arbitrary shell restrictions:** the legacy `run_command` tool is no longer surfaced to the LLM and stays permission-gated (REVIEW, or BLOCKED patterns like `rm -rf /`, `sudo`, `git reset --hard`, `git push --force`).
- **Blocked git patterns:** disallow `git remote set-url` with embedded credentials and any `git ... credential` command.
- **Risk model:** SAFE runs immediately; REVIEW/DANGEROUS require explicit approval; BLOCKED is never run.
- **Auth/pairing:** short-lived engine-generated token, constant-time compare, single-use (invalidated once a session is created).
- **Token handling:** pairing token TTL default 300s; stored in memory only.
- **Network restrictions:** binds `0.0.0.0` by default; the phone must reach the laptop LAN IP; Windows doc includes a firewall `netsh` rule.

## 11. Local AI

- **State:** implemented and optional. The agent auto-detects Ollama at startup (never starts/stops/downloads anything).
- **Endpoint:** `CONTEXT_PILOT_OLLAMA_HOST` / `OLLAMA_HOST` env, default `http://localhost:11434`.
- **Model:** configured via `CONTEXTPILOT_MODEL`, default `qwen2.5-coder:1.5b`; detected model tags are normalized and either the exact model or a variant is used.
- **Usage:** `AIOrchestrator.planUserRequest()` turns a `user_request` prompt into a JSON plan (1–4 steps) using the selected tools (the raw `run_command` is filtered out). The plan becomes an operation with steps; each step is permission-checked and executed.
- **Integration:** fully integrated in the **NPM agent**. **Not** integrated in the Flutter app (the app only sends prompts; AI planning is laptop-side).
- **Fallback:** if Ollama is unreachable, unavailable, or `--mock-ai` is passed, the Mock AI adapter produces a deterministic plan (still permission-gated).

## 12. Technology stack

- **Flutter** (mobile): Dart `>=3.12.2`; packages `flutter_riverpod ^2.6.1`, `web_socket_channel ^3.0.3`, `google_fonts ^6.3.3`, `flutter_animate ^4.5.0`, `mobile_scanner ^7.4.0`, `uuid ^4.5.1`, `intl ^0.20.3`, `shared_preferences ^2.3.2`, `flutter_spinkit ^5.2.1`, `permission_handler ^11.4.0`. Dev: `flutter_lints ^6.0.0`, `flutter_test`. Networking via WebSocket; storage via shared_preferences.
- **Agent** (laptop): Node `>=18`, `typescript ^5.3.3`, `express ^4.18.2`, `ws ^8.16.0`, `cors ^2.8.5`, `dotenv ^16.3.1`, `commander ^11.1.0`, `zod ^3.22.4`, `qrcode-terminal ^0.12.0`, `chalk ^4.1.2`. Dev/test: `vitest ^1.1.0`, `tsx ^4.7.0`, `@types/*`. Build: `tsc` → `dist/`.
npm_test                 → npm test
npm_run_build            → npm run build
npm_run_lint             → npm run lint
npm_audit                → npm audit [--audit-level=<lvl>]
npm_audit_high           → npm audit --audit-level=high
git_status               → git status
git_diff                 → git diff [-- "<path>"]
git_branch               → git branch
git_log                  → git log [-<limit>]
git_checkout             → git checkout <branch>
git_commit               → git commit -m "<message>"
git_reset_hard           → git reset --hard <ref>
git_clean_fd             → git clean -fd
docker_version           → docker --version
## 13. Repository structure (after organization)

```
ContextPilot/
├── apps/mobile/              # Flutter app
│   ├── lib/ ... , pubspec.yaml, README.md
├── packages/agent/           # Node agent
│   ├── src/ , tests/ , dist/, node_modules/
│   ├── package.json , tsconfig.json , README.md , LICENSE
├── docs/
│   ├── PRD/       (ContextPilot-*-PRD.md)
│   ├── TRD/       (ContextPilot-*-TRD.md)
│   ├── UI-UX/     (spec)
│   ├── AI-Memory/ (PROJECT-MEMORY.md, FLUTTER-MEMORY.md, NPM-AGENT-MEMORY.md, legacy AI-MEMORY.md, AI-MEMORY-COMPLETE.md)
│   └── architecture/ (ARCHITECTURE.md)
├── README.md , LICENSE , .gitignore
```

## 14. Important files

- `packages/agent/src/server/agentServer.ts` — agent HTTP + WebSocket entry point and message routing.
- `packages/agent/src/commands/registry.ts` — complete command allowlist/definitions (single source of truth for actions).
- `packages/agent/src/commands/executor.ts` — streaming command execution + cancellation.
- `packages/agent/src/workspace/manager.ts` — workspace root, path sandbox, project detection.
- `packages/agent/src/permission/engine.ts` — risk classification and approval gating.
- `packages/agent/src/session/manager.ts` — pairing tokens and sessions.
- `packages/agent/src/ai/orchestrator.ts` + `ollamaAdapter.ts` + `mockAdapter.ts` — plan generation.
- `packages/agent/src/cli/index.ts` — `start`/`doctor`/`mock-client` entry point.
- `apps/mobile/lib/data/protocol/websocket_client.dart` — Flutter WebSocket transport + reconnect.
- `apps/mobile/lib/presentation/providers/*.dart` — Riverpod state for connection, chat, operations.
- `apps/mobile/lib/presentation/screens/*.dart` — UI screens (connect, chat, operation_progress, security, project, settings, activity).

## 15. Important Architectural Decisions

- Phone-first flow with the agent owning the project filesystem; the phone never touches the filesystem directly.
- Local-only, LAN-first communication (WebSocket) with no cloud backend.
- Typed command templates instead of free-form shell (smaller negative input surface).
- Allowlist + permission engine + approval gating as the security model.
- Streaming `command.*` events in parallel with the legacy `operation_*`/`tool_*` events for protocol compatibility.
- Single active session and single-use pairing token.
- Local AI as an optional adapter behind an `AIAdapter` interface with a Mock fallback.

## 16. Known limitations

- No multi-project switching; the workspace is the start directory.
- No session persistence across restarts; one active session at a time.
- No TLS on WebSocket (LAN `ws://`, not `wss://`) — pairing is decorative on an untrusted network.
- Commands longer than 120s are hard-killed by the timeout (unless cancelled).
- Manual IP connect default port `8080` in the Flutter form differs from the agent default `8765` (QR provides the correct port).

## 17. Roadmap

Items below come only from PRD/TRD/UI-UX / TODO intent, not current code:

- Implement the Planned feature set (on-device LLM, voice-first, screenshot/camera, GitHub integration, PR review, remote access, multi-project, VS Code extension).
- Expand the Home Developer-Commands grid and polish the manual connect flow.
- Add tests for the streaming executor and cancellation.
- E2E against a real phone / WebSocket validation (flagged as Pending in prior notes).
docker_ps                → docker ps
docker_images            → docker images
docker_compose_ps        → docker compose ps
docker_compose_up        → docker compose up
docker_compose_down      → docker compose down
docker_compose_logs      → docker compose logs
python_version           → python --version
python_pytest            → python -m pytest
```