# ContextPilot — AI Memory

> **Primary continuity document for both Flutter app and NPM agent. Any AI starting work MUST read this first.**

---

## 1. PROJECT OVERVIEW

**ContextPilot** is a hybrid streaming command execution system with dual protocol support:
- **Flutter app** (`contextpilot-flutter`) - Mobile control surface
- **NPM agent** (`contextpilot-npm`) - Laptop agent with streaming terminal execution

```
Developer's Phone [contextpilot-flutter]
         │ WebSocket (ws://) over Local Wi-Fi
         ▼
  Laptop Agent [contextpilot-npm]
         │ ── Streaming Command Executor (NEW)
         ├── Dual Protocol (operation_* + command.*)
         ├── Real-time stdout/stderr streaming
         ├── Windows .cmd tool support
         └── Live terminal cancellation
```

---

## 2. RECENT IMPLEMENTATION (HYBRID STREAMING SYSTEM)

### ✅ NPM Agent - Streaming Executor (`contextpilot-npm`)
- **Streaming executor** (`src/commands/executor.ts`) with real-time stdout/stderr capture
- **Dual event emission**: maintains existing `operation_*`/`tool_*` events + new `command.*` streaming events
- **Windows support**: `.cmd` tools (npm, flutter) route through ComSpec with `/d /s /c` flags
- **Cancellation**: `command.cancel` → `OperationManager.cancelOperation()` → `process.kill()`
- **Updated commandTools.ts**: delegates to streaming executor (removed duplicate `exec` code)

### ✅ Flutter App - Terminal UI (`contextpilot-flutter`)
- **Extended Operation model**: `TerminalOutputLine`, `commandText`, `exitCode`, `isStreamingCommand`
- **sendCommand method**: `chatProvider.sendCommand(action, args, requestId)` sends `action_request`
- **Live terminal UI**: `OperationProgressScreen` shows real-time stdout/stderr with color coding
- **Command events**: handles `command.start/output/completed/error/cancelled`
- **Auto-scroll terminal**: with toggle, status badges, cancel button

### Protocol Events (Server→Phone)
| Event | Purpose |
|-------|---------|
| **Existing** | `operation_started`, `plan_created`, `tool_started/completed`, `operation_completed/failed/cancelled` |
| **New Streaming** | `command.start`, `command.output`, `command.completed`, `command.error`, `command.cancelled` |

### Phone→Server Messages
| Message | Purpose |
|---------|---------|
| `user_request` | AI chat prompts |
| `action_request` | Direct command execution |
| `cancel_request` | Cancel running commands |
| `approval_response` | Operation approval |

---
## 3. CURRENT STATUS

| Component | Status |
|-----------|--------|
| **NPM Agent Streaming** | ✅ Complete - dual protocol, Windows support, cancellation |
| **Flutter Terminal UI** | ✅ Complete - live output, auto-scroll, cancel button |
| **Developer Commands UI** | ⚠️ In Progress - 7/10 MVP actions implemented |
| **E2E Testing** | ❌ Pending - needs WebSocket validation |
| **Comprehensive Tests** | ❌ Pending - streaming executor & cancellation tests |

---

## 4. KEY ARCHITECTURE DECISIONS

### NPM Agent (`contextpilot-npm`)
- **Single executor**: One `child_process` spawn per command with real-time streaming
- **No duplication**: Removed parallel `exec` implementations
- **Process registry**: Track running commands by `operationId` for cancellation
- **Event correlation**: `requestId` maps to `operationId`, falls back to server-generated ID

### Flutter App (`contextpilot-flutter`)
- **Riverpod state management**: All providers use `StateNotifierProvider`
- **Dual operation support**: Traditional operations + streaming commands
- **Live terminal**: Real-time output with stdout (green) / stderr (red) color coding
- **Operation correlation**: `_findOpByIdOrRequestId()` handles both operation flows

---

## 5. DEVELOPER COMMANDS (MVP ACTIONS)

### ✅ Implemented (10 commands)
```
Flutter: flutter_doctor, flutter_analyze, flutter_pub_get
NPM: npm_audit, npm_install
Git: git_status, git_diff  
Docker: docker_ps, docker_compose_ps
Python: python_version
```

### UI Integration
- **Home screen**: Developer Commands grid (2x5) with icons and colors
- **Command execution**: `chatProvider.sendCommand(action)` → live terminal
- **Status indicators**: Running/completed/failed badges with icons