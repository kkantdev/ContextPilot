# ContextPilot NPM / Laptop Agent — Technical Requirements Document

**Version:** 1.0  
**Status:** Hackathon MVP  
**Technology Stack:** Node.js + TypeScript + npm  
**Runtime:** Local laptop (Node.js >= 18)  
**Communication:** Local Wi-Fi (HTTP + WebSocket)  
**AI:** Local Ollama (`qwen2.5-coder`) + Mock AI fallback  

---

# 1. TECHNICAL ARCHITECTURE

```text
Flutter App / Mock Client
       │
       │ Local Network (HTTP / WebSocket)
       ▼
ContextPilot Agent
 ├── Session Manager (Pairing & Auth)
 ├── Protocol Layer (Zod Schemas)
 ├── Agent Server (Express + ws)
 ├── AI Orchestrator (Ollama / Mock)
 ├── Permission Engine (Risk Classification)
 ├── Tool Registry (File, Terminal, Git, Test, Security)
 └── Operation Manager (State Machine & Events)
```

---

# 2. MODULE SPECIFICATIONS

### CLI Layer (`src/cli/index.ts`)
* `contextpilot start`: Loads config, boots agent server, prints QR payload.
* `contextpilot doctor`: Runs diagnostics for Node.js, workspace, and Ollama.
* `contextpilot mock-client`: Interactive terminal phone harness.

### Workspace Sandbox (`src/workspace/manager.ts`)
* Resolves paths against `workspaceRoot`.
* Throws `Access denied` error if resolved path escapes root.
* Detects project metadata (language, framework, package manager, git status).

### Permission Engine (`src/permission/engine.ts`)
* Classifies tool risk: `SAFE`, `REVIEW`, `DANGEROUS`.
* Validates workspace boundaries.

### Tool Registry (`src/tools/`)
* Standardized tool execution signature: `(args: any) => Promise<ToolResult>`.
* Includes 12 registered tools covering file operations, terminal runner, Git status/diff, test runner, and security scanner.

### AI Adapter Layer (`src/ai/`)
* `AIAdapter` interface.
* `OllamaAdapter`: Connects to `http://127.0.0.1:11434/api/generate`.
* `MockAIAdapter`: Fallback deterministic plan generator.
* `AIOrchestrator`: Assembles workspace tree context and prompts model for structured JSON plans.

### Server & Session Manager (`src/server/`, `src/session/`)
* Short-lived 8-byte hex pairing tokens.
* HTTP endpoint `POST /api/pair` for initial setup.
* WebSocket server (`ws://`) for bi-directional protocol communication.

---

# 3. SECURITY ARCHITECTURE

1. Workspace path sandboxing (`fs.realpathSync` validation).
2. Short-lived single-use pairing tokens (5 min TTL).
3. Session token authentication on all WebSocket frames.
4. Risk-based manual user approval for mutating actions.
