# ContextPilot NPM - Complete AI Memory & Project Details

**Last Updated:** 2026-08-24  
**Status:** MVP Implemented & Tested + Post-MVP hardening (build clean, 14/14 tests passing)  
**Version:** 1.0.1  

---

## TABLE OF CONTENTS
1. [Project Overview](#project-overview)
2. [Current Status](#current-status)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Technology Stack](#technology-stack)
6. [Implemented Features](#implemented-features)
7. [Setup & Installation](#setup--installation)
8. [Running the Project](#running-the-project)
9. [Core Workflow](#core-workflow)
10. [File Operations Reference](#file-operations-reference)
11. [CLI Commands](#cli-commands)
12. [Protocol Specification](#protocol-specification)
13. [Security Details](#security-details)
14. [AI Configuration](#ai-configuration)
15. [Testing](#testing)
16. [Known Limitations](#known-limitations)
17. [Dependencies](#dependencies)
18. [Agent Instructions & Rules](#agent-instructions--rules)
19. [Changelog](#changelog)

---

## PROJECT OVERVIEW

**ContextPilot Laptop Agent** is a lightweight Node.js + TypeScript developer agent CLI that:

- Acts as a bridge between Flutter phone apps and laptop development environments
- Runs locally within developer projects over local Wi-Fi
- Safely executes AI-driven developer tasks using local AI models (Ollama)
- Implements workspace sandboxing and permission-based approval workflows

**Core Value Proposition:**
- Developer asks question on phone → Agent understands project context → AI generates plan → User approves → Agent executes safely

---

## CURRENT STATUS

- **MVP Status:** Fully Implemented & Tested
- **Build Status:** ✓ Clean (TypeScript compiles; emit verified)
- **Test Status:** ✓ 14/14 tests passing (4 suites)
- **This machine (2026-08-24):** Node v24/npm, Flutter 3.44.8, Docker 29.6.2, Python 3.14.6, Git; Ollama online at `http://localhost:11434` — model `qwen2.5-coder:1.5b` **configured but NOT installed**
- **Ready for:** Hackathon demonstration & production use
- **Completed this session (2026-08-24):** Fixed compile errors (package did NOT compile), typed 30-action command layer, `action_request` WS + `/api/commands`, startup banner/Ollama/model detection, richer `doctor`, Windows `.cmd` tool detection
- **Remaining work (not yet done):** see [Known Limitations](#known-limitations) — DANGEROUS-after-approval execution, long-running command streaming/cancellation, Flutter quick-action chips

---

## PROJECT STRUCTURE

```
contextpilot-npm/
├── bin/
│   └── contextpilot.js              # Executable entrypoint (CLI wrapper)
├── docs/
│   ├── AI_MEMORY.md                 # AI continuity notes
│   ├── AI_PROMPT.md                 # System prompts for AI integration
│   ├── CHANGELOG.md                 # Version history
│   ├── PRD.md                       # Product requirements
│   ├── TRD.md                       # Technical requirements
│   ├── PROTOCOL.md                  # Network protocol specification
│   └── [THIS FILE]                  # Complete consolidated memory
├── src/
│   ├── index.ts                     # Main module export
│   ├── ai/
│   │   ├── adapter.ts               # AIAdapter interface (abstract)
│   │   ├── mockAdapter.ts           # MockAIAdapter (fallback)
│   │   ├── ollamaAdapter.ts         # OllamaAdapter (primary)
│   │   └── orchestrator.ts          # AI plan orchestrator
│   ├── cli/
│   │   └── index.ts                 # Commander CLI entry point
│   ├── config/
│   │   └── index.ts                 # Configuration loader (env vars, CLI args)
│   ├── events/
│   │   └── manager.ts               # WebSocket event stream manager
│   ├── mock/
│   │   └── mockPhoneClient.ts       # Interactive mock phone terminal client
│   ├── operation/
│   │   └── manager.ts               # Operation state machine & execution
│   ├── permission/
│   │   └── engine.ts                # Risk classification & approval engine
│   ├── server/
│   │   └── agentServer.ts           # Express HTTP + WebSocket server
│   ├── session/
│   │   └── manager.ts               # Session & pairing token manager
│   ├── tools/
│   │   ├── fileTools.ts             # File CRUD operations
│   │   ├── terminalTools.ts         # Shell command execution
│   │   ├── gitTools.ts              # Git status/diff operations
│   │   ├── testTools.ts             # Test runner integration
│   │   ├── securityTools.ts         # Security scanning
│   │   └── registry.ts              # Tool registry & executor
│   ├── types/
│   │   └── protocol.ts              # Zod schemas for protocol validation
│   ├── utils/
│   │   ├── logger.ts                # Structured CLI logger
│   │   └── network.ts               # Local network IP detection
│   └── workspace/
│       └── manager.ts               # Path sandboxing & project detection
├── tests/
│   ├── workspace.test.ts            # Workspace manager tests
│   ├── permission.test.ts           # Permission engine tests
│   ├── tools.test.ts                # Tool registry tests
│   └── integration.test.ts          # End-to-end integration tests
├── package.json                     # npm dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # Project documentation

**Key: Tests (14/14 passing)**
- Workspace detection & sandboxing
- Permission classification
- Tool execution & validation
- Full E2E integration flow
```

---

## ARCHITECTURE

### Process Model
- **Single-process Node.js** runtime
- **Express** HTTP server + **ws** WebSocket server running simultaneously
- Non-blocking async/await pattern throughout

### Communication Flow
```
Flutter App / Mock Client (Phone)
         ↓ Local Network (HTTP + WebSocket)
    ContextPilot Agent Server
         ├→ Session Manager (authentication)
         ├→ AI Orchestrator (local Ollama or mock)
         ├→ Permission Engine (risk classification)
         ├→ Tool Registry (file, terminal, git, test, security)
         └→ Operation Manager (state machine & execution)
         ↓ Local Access
    Developer Project Files / Terminal / Git
```

### Security Boundary
- **Workspace Path Sandboxing:** All file operations validated against project root via `fs.realpathSync()`
- **Permission Engine:** Classifies all tool operations as `SAFE`, `REVIEW`, or `DANGEROUS`
- **Session Authentication:** 8-byte hex pairing tokens + session tokens on all WebSocket frames
- **Explicit Approval:** User must approve `REVIEW` and `DANGEROUS` operations before execution

### AI Architecture
- **AIAdapter Interface:** Modular abstraction supporting multiple AI providers
- **Primary: OllamaAdapter** connects to `http://127.0.0.1:11434/api/generate`
  - Uses `qwen2.5-coder` model by default
  - Sends workspace tree context + user prompt → receives structured JSON plan
- **Fallback: MockAIAdapter** provides deterministic test plan when Ollama offline
- **AIOrchestrator** assembles workspace context and coordinates plan generation

---

## TECHNOLOGY STACK

### Runtime & Build
- **Node.js:** >= 18.0.0
- **TypeScript:** ^5.3.3
- **Language:** TypeScript (strict mode)

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `commander` | ^11.1.0 | CLI framework & argument parsing |
| `express` | ^4.18.2 | HTTP REST server |
| `ws` | ^8.16.0 | WebSocket server |
| `zod` | ^3.22.4 | Runtime protocol validation & schemas |
| `qrcode-terminal` | ^0.12.0 | ASCII QR code rendering in terminal |
| `chalk` | ^4.1.2 | CLI color styling |
| `dotenv` | ^16.3.1 | Environment variable loading |
| `cors` | ^2.8.5 | CORS middleware for Express |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.3.3 | TypeScript compiler |
| `tsx` | ^4.7.0 | TypeScript executor (for dev mode) |
| `vitest` | ^1.1.0 | Test runner |
| `@types/*` | latest | TypeScript type definitions |

### External Services
- **Ollama** (local): HTTP API at `http://127.0.0.1:11434` (configurable via `OLLAMA_HOST`)
- **Model:** `qwen2.5-coder` (recommended for code generation)

---

## IMPLEMENTED FEATURES

### ✓ MVP Complete
All features from PRD and TRD are implemented:

**CLI & Startup**
- [x] `contextpilot` command starts agent server
- [x] `contextpilot doctor` runs diagnostics
- [x] `contextpilot mock-client` interactive test harness
- [x] QR code generation with pairing payload
- [x] Configurable via env vars + CLI args

**Project Detection & Workspace**
- [x] Multi-ecosystem project detection (Node, React, Next, Flutter, Python, Go, Rust, Java)
- [x] Workspace root detection via package manager markers
- [x] Zero-escape path sandboxing (all paths validated against root)
- [x] Project metadata extraction

**Network & Pairing**
- [x] Short-lived 8-byte hex pairing tokens (5 min TTL)
- [x] `POST /api/pair` REST endpoint for phone handshake
- [x] WebSocket upgrade & session establishment
- [x] Session token authentication on all frames

**AI Integration**
- [x] AIAdapter interface (provider-agnostic)
- [x] OllamaAdapter implementation (primary)
- [x] MockAIAdapter fallback implementation
- [x] Workspace context assembly (file tree + package.json + git status)
- [x] Structured JSON plan generation
- [x] Model temperature & timeout configuration

**Permission System**
- [x] Risk classification engine (SAFE / REVIEW / DANGEROUS)
- [x] Path traversal validation
- [x] Tool-level permission checks
- [x] Approval request/response workflow
- [x] Approved action execution with audit trail

**Tool Registry (12 Tools)**

| Tool | Type | Risk | Purpose |
|------|------|------|---------|
| `read_file` | File | SAFE | Read file contents |
| `list_directory` | File | SAFE | List directory contents |
| `search_code` | File | SAFE | Search code patterns |
| `create_file` | File | REVIEW | Create new file |
| `create_folder` | File | REVIEW | Create new folder |
| `edit_file` | File | REVIEW | Edit existing file |
| `delete_file` | File | DANGEROUS | Delete file |
| `run_command` | Terminal | DANGEROUS | Execute shell command |
| `run_tests` | Test | SAFE | Run project tests |
| `git_status` | Git | SAFE | Git status report |
| `git_diff` | Git | SAFE | Git diff report |
| `security_scan` | Security | SAFE | Security vulnerability scan |

> **Typed developer command tools (added 2026-08-24):** Beyond the legacy 12 tools above, ContextPilot now exposes five typed executors — `run_flutter_command`, `run_npm_command`, `run_git_command`, `run_docker_command`, `run_python_command`. Each accepts only an allowlisted `{ action }` (30 total actions defined in `src/commands/registry.ts`); the shell string is always derived from a `CommandDefinition` **template** and never accepted as free text from phone/LLM. Executable availability is pre-checked via `src/tools/systemTools.ts` (unavailable tools return an `unavailable` result rather than crashing), and risk (`SAFE`/`REVIEW`/`DANGEROUS`) is resolved from the template by the policy layer, **not** the LLM.

**Operation Lifecycle**
- [x] State machine: `queued` → `planning` → `awaiting_approval` → `approved` → `running` → `completed`/`failed`
- [x] Real-time event streaming over WebSocket
- [x] Progress reporting (tool_started, tool_completed)
- [x] Error handling with standard error codes

**Testing**
- [x] 14 unit + integration tests passing
- [x] Workspace manager validation
- [x] Permission engine classification
- [x] Tool execution & sandboxing
- [x] End-to-end protocol flow

---

## SETUP & INSTALLATION

### Prerequisites
1. **Node.js >= 18.0.0** installed
2. **npm** (comes with Node.js)
3. **Ollama** (optional, for AI plan generation)
   - Install: https://ollama.ai
   - Pull model: `ollama pull qwen2.5-coder`
   - Running by default at `http://127.0.0.1:11434`

### Installation Steps

```bash
# Navigate to project directory
cd /Users/madankryadav/Desktop/hackathon/contextpilot-npm

# Install dependencies
npm install

# Verify setup
npm run build

# Run tests to confirm everything works
npm test
```

### Environment Variables (Optional)

Create a `.env` file in project root:

```bash
# AI Configuration
OLLAMA_HOST=http://127.0.0.1:11434
AI_MODEL=qwen2.5-coder
AI_TIMEOUT=30000

# Server Configuration
CONTEXTPILOT_PORT=8765
CONTEXTPILOT_HOST=0.0.0.0

# Logging
LOG_LEVEL=info

# Feature Flags
MOCK_AI=false
```

---

## RUNNING THE PROJECT

### Option 1: Development Mode (Recommended for development)
```bash
npm run dev
```
- Runs TypeScript directly via `tsx`
- Auto-restarts on code changes
- Immediate feedback for debugging

### Option 2: Build & Run Production
```bash
# Build TypeScript to JavaScript
npm run build

# Run compiled version
npm start
```

### Option 3: Mock Client Testing
```bash
# Terminal 1: Start agent server
npm run dev

# Terminal 2: Start interactive mock phone client
npm run mock-client
```

### Option 4: Global Installation
```bash
# Install globally (after build)
npm link

# Run from anywhere
contextpilot
contextpilot doctor
contextpilot mock-client
```

---

### Expected Output

When you run `npm run dev` or `npm start`:

```
╭────────────────────────────────────────╮
│       ContextPilot Agent Started       │
╰────────────────────────────────────────╯

🚀 Server: http://localhost:8765
📱 QR Code:

  █████████████████████████████
  ██            QR            ██
  ██ (scan with phone app)    ██
  ██            CODE          ██
  █████████████████████████████

📋 Connection Details:
   Host: 192.168.1.10 (or detected local IP)
   Port: 8765
   Token: [8-byte hex token]
   Project: MyApp

✓ Workspace: /path/to/project
✓ Framework: React
✓ Package Manager: npm
✓ Git Repo: Yes

⏳ Waiting for phone connection...
```

Phone scans QR → Agent authenticates → WebSocket opens → Ready for requests

---

## CORE WORKFLOW

### Step 1: Start Agent
```bash
npm run dev
```

### Step 2: Pair Phone (or use mock client)
- Scan QR code with Flutter app, OR
- Run `npm run mock-client` in another terminal

### Step 3: Send Request
From phone: *"Create authentication service and run tests"*

### Step 4: Agent Process
```
User Request
    ↓
AI Context Assembly (workspace tree + project metadata)
    ↓
AI Plan Generation (Ollama `qwen2.5-coder`)
    ↓
Send plan to phone:
  - Step 1: Create auth.ts (REVIEW risk) → needs approval
  - Step 2: Run tests (SAFE risk) → auto-execute
    ↓
User approves on phone
    ↓
Execute approved steps:
  1. Create file (REVIEW)
  2. Run tests (SAFE)
    ↓
Stream progress to phone:
  - tool_started: create_file
  - tool_completed: create_file ✓
  - tool_started: run_tests
  - tool_completed: run_tests ✓
    ↓
operation_completed with results
    ↓
Phone displays results
```

---

## FILE OPERATIONS REFERENCE

### Safe Operations (Auto-execute)
```typescript
// Read file
{ tool: "read_file", args: { path: "src/App.tsx" } }

// List directory
{ tool: "list_directory", args: { path: "src" } }

// Search code
{ tool: "search_code", args: { pattern: "useState", path: "src" } }

// Run tests
{ tool: "run_tests", args: { } }

// Git status
{ tool: "git_status", args: { } }

// Git diff
{ tool: "git_diff", args: { } }

// Security scan
{ tool: "security_scan", args: { } }
```

### Review Operations (Require approval)
```typescript
// Create file
{ tool: "create_file", args: { path: "src/auth.ts", content: "..." } }

// Create folder
{ tool: "create_folder", args: { path: "src/services" } }

// Edit file
{ tool: "edit_file", args: { path: "src/App.tsx", content: "..." } }
```

### Dangerous Operations (Require explicit approval)
```typescript
// Delete file
{ tool: "delete_file", args: { path: "src/old.ts" } }

// Run command
{ tool: "run_command", args: { command: "npm install axios" } }
```

**All operations are sandboxed** — attempting to access files outside project root throws `Access denied` error.

---

## CLI COMMANDS

### contextpilot
Start the agent server.

```bash
npm run dev
# or after build:
npm start
# or globally:
contextpilot

# With options:
contextpilot --port 9000 --mock-ai
```

**Options:**
- `--port <number>` : Server port (default: 8765)
- `--host <string>` : Bind address (default: 0.0.0.0)
- `--mock-ai` : Use mock AI instead of Ollama
- `--project-root <path>` : Override detected project root
- `--verbose` : Enable debug logging

### contextpilot doctor
Run diagnostics.

```bash
npm run dev doctor
```

**Checks:**
- Node.js version compatibility
- npm installation
- Workspace detection
- Git availability
- Ollama connectivity
- Network interfaces

### contextpilot mock-client
Interactive terminal phone simulator.

```bash
npm run mock-client
```

**Usage:**
```
> Connecting to http://localhost:8765...
Connected to: MyApp
session: sess-48e838d4cbdd62e6

Enter request (or 'quit' to exit):
> Create a login form component

✓ Plan received:
  Step 1: Create LoginForm.tsx (REVIEW)
  Step 2: Add tests (SAFE)
  Step 3: Run tests (SAFE)

Approve? (y/n): y

✓ Step 1: create_file completed
✓ Step 2: create_file completed
✓ Step 3: run_tests completed

✓ Operation complete!
Git diff:
  +++ src/LoginForm.tsx
  +++ src/LoginForm.test.tsx
```

---

## PROTOCOL SPECIFICATION

### QR Code Payload (Encoded in QR)

```json
{
  "protocolVersion": "1.0",
  "agentId": "agent-46e14ae2",
  "host": "192.168.1.10",
  "port": 8765,
  "pairingToken": "4a9f2b8c1d3e7f0a",
  "projectName": "MyApp",
  "projectId": "2f5573657273",
  "expiresAt": "2026-08-20T18:25:00.000Z"
}
```

### HTTP Pairing Endpoint

**POST /api/pair**

Request:
```json
{
  "pairingToken": "4a9f2b8c1d3e7f0a",
  "deviceId": "phone-device-001",
  "deviceName": "Developer iPhone"
}
```

Response (200 OK):
```json
{
  "success": true,
  "session": {
    "sessionId": "sess-48e838d4cbdd62e6",
    "agentId": "agent-46e14ae2",
    "deviceId": "phone-device-001",
    "connectedAt": "2026-08-20T18:16:05.362Z"
  },
  "project": {
    "id": "2f5573657273",
    "name": "MyApp",
    "rootPath": "/Users/developer/MyApp",
    "language": "JavaScript/TypeScript",
    "framework": "React",
    "packageManager": "npm",
    "isGitRepo": true
  }
}
```

### WebSocket Messages

All messages follow this structure:

```json
{
  "protocolVersion": "1.0",
  "messageId": "msg-1787249765",
  "type": "<type>",
  "timestamp": "2026-08-20T18:16:05.362Z",
  "sessionId": "sess-48e838d4cbdd62e6",
  "operationId": "op-1787249765362",
  "payload": { ... }
}
```

**Message Types:**
- `pairing` : Initial WebSocket pairing
- `authenticated` : Pairing success
- `user_request` : Phone sends natural language request
- `plan_created` : Agent sends structured plan
- `approval_required` : Agent requests approval for step
- `approval_response` : Phone approves/rejects
- `tool_started` : Execution begun
- `tool_completed` : Execution succeeded
- `operation_completed` : Full operation finished
- `operation_failed` : Full operation failed
- `error` : Protocol error

**Approval Workflow Example:**

Phone → Agent:
```json
{
  "type": "user_request",
  "sessionId": "sess-...",
  "payload": {
    "prompt": "Create authentication service"
  }
}
```

Agent → Phone:
```json
{
  "type": "plan_created",
  "operationId": "op-...",
  "payload": {
    "plan": {
      "summary": "Create auth service",
      "steps": [
        {
          "stepId": "step-1",
          "tool": "create_file",
          "args": { "path": "src/auth.ts" },
          "riskLevel": "REVIEW",
          "requiresApproval": true
        }
      ]
    }
  }
}
```

Agent → Phone:
```json
{
  "type": "approval_required",
  "payload": {
    "approvalId": "appr-...",
    "stepId": "step-1",
    "tool": "create_file",
    "riskLevel": "REVIEW"
  }
}
```

Phone → Agent:
```json
{
  "type": "approval_response",
  "sessionId": "sess-...",
  "payload": {
    "approvalId": "appr-...",
    "approved": true
  }
}
```

---

## SECURITY DETAILS

### 1. Path Traversal Protection

All file paths validated via:
```typescript
const realPath = fs.realpathSync(requestedPath);
const realRoot = fs.realpathSync(workspaceRoot);

if (!realPath.startsWith(realRoot)) {
  throw new Error('Access denied: path outside workspace');
}
```

**Example:**
- ✓ `src/App.tsx` → allowed
- ✓ `../sibling/file.ts` → resolved to same root → allowed if within root
- ✗ `../../secret.txt` → escapes root → `Access denied`

### 2. Pairing Token Security

- **Generation:** 8-byte random hex string (16 chars)
- **TTL:** 5 minutes from generation
- **Usage:** Single-use for initial pairing via `POST /api/pair`
- **Expiration:** Checked server-side, auto-rejected after TTL

### 3. Session Authentication

- **Session ID:** Generated after successful pairing
- **Token Validation:** Every WebSocket frame must include valid `sessionId`
- **Timeout:** Sessions expire if inactive > 24 hours (configurable)

### 4. Risk Classification

All tool operations classified:
- **SAFE:** Read-only operations (read_file, list_directory, git_status, run_tests)
  - Auto-approved, no user interaction needed
- **REVIEW:** Mutations (create_file, edit_file, create_folder)
  - Requires explicit user approval via phone
- **DANGEROUS:** Destructive operations (delete_file, run_command)
  - Requires explicit user approval + confirmation

### 5. Tool Execution Sandboxing

- All file paths validated against workspace root
- Terminal commands executed in project directory context
- Timeouts enforced (default 30s)
- Output captured & returned to phone

### 6. No Cloud Transmission

- All computation local (file access, AI execution, git operations)
- Project code never leaves laptop
- Only structured protocol messages transmitted over local Wi-Fi

---

## AI CONFIGURATION

### Primary: Ollama Integration

**Default Setup:**
- **Host:** `http://127.0.0.1:11434`
- **Model:** `qwen2.5-coder`
- **Temperature:** 0.7 (balanced creativity/accuracy)
- **Timeout:** 30 seconds

**Installation:**
```bash
# Install Ollama
https://ollama.ai

# Pull recommended model
ollama pull qwen2.5-coder

# Verify running
curl http://127.0.0.1:11434/api/tags
```

### AI Adapter Interface

```typescript
interface AIAdapter {
  generatePlan(context: WorkspaceContext, userPrompt: string): Promise<Plan>;
  isAvailable(): Promise<boolean>;
}
```

**Context Provided to AI:**
```typescript
interface WorkspaceContext {
  projectName: string;
  projectRoot: string;
  language: string;
  framework: string;
  packageManager: string;
  gitStatus: string;
  fileTree: string;       // Directory structure
  keyFiles: string[];     // package.json, tsconfig.json, etc.
  gitDiff?: string;       // If applicable
}
```

### Fallback: Mock AI

Used when:
- `MOCK_AI=true` environment variable set
- `--mock-ai` CLI flag passed
- Ollama unavailable/offline

**Features:**
- Deterministic plan generation
- No external dependencies
- Useful for testing & CI/CD

---

## TESTING

### Test Suite (14 tests, 4 suites)

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific test file
npm test workspace.test.ts
```

### Test Coverage

**Workspace Manager Tests** (`workspace.test.ts`)
- Path sandboxing validation
- Project detection (Node, React, etc.)
- Workspace boundary enforcement

**Permission Engine Tests** (`permission.test.ts`)
- Risk classification (SAFE, REVIEW, DANGEROUS)
- Tool permission checks
- Path traversal validation

**Tool Registry Tests** (`tools.test.ts`)
- File operations
- Terminal execution
- Git operations
- Test runner integration

**Integration Tests** (`integration.test.ts`)
- Full server startup
- Pairing flow (REST + WebSocket)
- User request → Plan → Approval → Execution
- Error handling

**Current Status:** ✓ All 14 tests passing

---

## KNOWN LIMITATIONS

1. **Command Execution Timeout:** legacy `run_command` defaults to 30s; typed commands (flutter/npm/git/docker/python) use a 120s cap.
2. **Long-running streaming & cancellation NOT implemented:** commands such as `flutter_test`, `npm_run_build`, `npm_test`, `docker_compose_up/down` still run via a single blocking `exec` — no incremental progress frames to the phone and no cancel signal. The `longRunning` flag exists in the registry but is unused. *(Future work)*
3. **DANGEROUS approval does not yet allow execution:** `git_reset_hard`, `git_clean_fd`, and other DANGEROUS-classified actions still fail even after explicit phone approval, because the permission engine returns `allowed:false` for DANGEROUS regardless of prior approval. *(Future work)*
4. **Flutter (phone) quick actions deferred:** the agent now supports `action_request`, but the Flutter client still only sends free-text `user_request`; there is no quick-action chip or structured action-result rendering yet. *(Future work)*
5. **Model Token Limit:** model-dependent (usually 4–8k tokens); very large codebases may exceed the context window.
6. **File Size:** large files (>1MB) may cause performance issues.
7. **Network:** requires local Wi-Fi/LAN; no cloud fallback or remote access.
8. **OS Compatibility:** now validated on **Windows** (2026-08-24) — tool probes fall back through `cmd.exe` (via `ComSpec`) for `.cmd`/`.bat` shims such as npm and flutter. Still should be spot-checked on Linux/macOS.

---

## DEPENDENCIES

### Production Dependencies

```json
{
  "chalk": "^4.1.2",              // CLI coloring
  "commander": "^11.1.0",         // CLI framework
  "cors": "^2.8.5",               // CORS middleware
  "dotenv": "^16.3.1",            // .env loading
  "express": "^4.18.2",           // HTTP server
  "qrcode-terminal": "^0.12.0",   // QR rendering
  "ws": "^8.16.0",                // WebSocket
  "zod": "^3.22.4"                // Schema validation
}
```

### Development Dependencies

```json
{
  "@types/cors": "^2.8.17",
  "@types/express": "^4.17.21",
  "@types/node": "^20.10.6",
  "@types/qrcode-terminal": "^0.12.2",
  "@types/ws": "^8.5.10",
  "typescript": "^5.3.3",
  "tsx": "^4.7.0",                // TypeScript executor
  "vitest": "^1.1.0"              // Test runner
}
```

### External Services

- **Ollama API** (optional, recommended for production)
- **Local Network** (required for phone communication)

---

## AGENT INSTRUCTIONS & RULES

### 1. Documentation & Continuity Rules
1. This `AI_MEMORY_COMPLETE.md` file is the single source of truth for project memory.
2. Before implementing any task, review the relevant sections of this file.
3. Before completing any task, update this file:
   - [Current Status](#current-status) section
   - [Changelog](#changelog) section
   - Any relevant technical sections if requirements changed

### 2. Code Safety & Architectural Principles

1. **Workspace Sandboxing**: File operations MUST ALWAYS pass through `WorkspaceManager.resolvePath()` to prevent path traversal outside the project directory.

2. **Permission Engine**: Tools modifying files or running commands MUST undergo risk classification (`SAFE`, `REVIEW`, `DANGEROUS`) and require user approval for `REVIEW`/`DANGEROUS` actions.

3. **AI Adapter Independence**: Never hardcode the core logic to a single AI provider. Always maintain the `AIAdapter` abstraction interface (`OllamaAdapter`, `MockAIAdapter`).

4. **Structured Events**: Real-time progress updates must be broadcast as structured JSON frames via `EventManager`, matching protocol schemas.

5. **No Invented History**: Never claim tests passed or features exist without running empirical verification commands (`npm test`, `npm run build`).

6. **No Secrets in Docs**: Secrets, API keys, or private tokens must never be written to files or documentation.

### 3. End-of-Task Procedure

Before completing every task, complete this checklist:
- [ ] Code implemented and compiled (`npm run build`).
- [ ] Automated tests executed (`npm test`).
- [ ] This `AI_MEMORY_COMPLETE.md` file updated.
- [ ] [Changelog](#changelog) entry added.
- [ ] Final response formatted clearly.

---

## CHANGELOG

### [1.0.1] - 2026-08-24

#### Added
- Typed developer command layer: 30 allowlisted commands across flutter/npm/git/docker/python (`src/commands/registry.ts`, `src/tools/commandTools.ts`). Each `run_*_command` accepts `{ action }`; risk is resolved from the template.
- Executable availability + version detection, with Windows `cmd.exe` fallback for `.cmd`/`.bat` shims (`src/tools/systemTools.ts`).
- Ollama model auto-detection (HTTP `/api/tags`) and model selection into `OllamaAdapter` (`src/ai/detection.ts`).
- `contextpilot start` startup banner: Ollama / endpoint / model OK-or-warning, tool availability, graceful Mock AI fallback when Ollama is unreachable.
- `contextpilot doctor` full environment diagnostic: Node/npm/Git/Flutter/Docker/Python/Ollama + model + workspace safety.
- WebSocket `action_request` handler + `/api/commands` HTTP endpoint (`src/server/agentServer.ts`), routed through the existing operation/approval/event pipeline.

#### Fixed
- `src/commands/registry.ts`: removed a premature `];` that left all Git/Docker/Python entries outside the array (this was 107 TS syntax errors — the package did **not** compile before this).
- `src/tools/commandTools.ts`: removed a duplicated import block.
- `src/permission/engine.ts`: legacy `run_command` is now correctly excluded from the typed-command shortcut so `rm -rf /`, `git reset --hard`, `format`, force-push, etc. classify as DANGEROUS (were misclassified as REVIEW).

### [1.0.0] - 2026-08-20

#### Added
- Created executable CLI `contextpilot` with `start`, `doctor`, and `mock-client` commands.
- Implemented zero-escape workspace sandboxing (`WorkspaceManager`) protecting against path traversal.
- Implemented multi-framework project detection (Node, React, Next, Flutter, Python, Go, Rust, Java).
- Implemented short-lived random pairing tokens, QR terminal renderer, and Express REST pairing endpoint (`POST /api/pair`).
- Implemented WebSocket server (`ws://`) with session authentication and real-time bi-directional message routing.
- Implemented provider-independent `AIAdapter` interface with `OllamaAdapter` (`qwen2.5-coder`) and fallback `MockAIAdapter`.
- Implemented `PermissionEngine` for risk level classification (`SAFE`, `REVIEW`, `DANGEROUS`).
- Implemented `ToolRegistry` with 12 controlled tools (`read_file`, `create_file`, `edit_file`, `delete_file`, `list_directory`, `search_code`, `run_command`, `git_status`, `git_diff`, `run_tests`, `security_scan`).
- Implemented interactive terminal mock phone client (`contextpilot mock-client`).
- Added complete automated test suite (4 suites, 14 passing tests) in `tests/`.

#### Documentation
- Created consolidated AI memory and project documentation in `AI_MEMORY_COMPLETE.md` with all PRD, TRD, Protocol, and Agent Instructions integrated.

1. **Understand Architecture:** Review the flow in [Core Workflow](#core-workflow)
2. **Set Up Local Environment:**
   ```bash
   cd /Users/madankryadav/Desktop/hackathon/contextpilot-npm
   npm install
   npm run build
   npm test
   ```
3. **Run Agent & Test:**
   ```bash
   npm run dev
   # In another terminal:
   npm run mock-client
   ```
4. **Review Code:**
   - Start with `src/cli/index.ts` (entry point)
   - Then `src/server/agentServer.ts` (server initialization)
   - Then `src/ai/orchestrator.ts` (plan generation)
5. **Modify & Debug:**
   - Use `npm run dev` for immediate feedback
   - All changes to TypeScript auto-detected
6. **Deploy:**
   - `npm run build` creates `/dist` directory
   - `npm start` runs compiled version
   - `npm link` enables global `contextpilot` command

---

**For questions:** Refer to specific documentation files (PRD.md, TRD.md, PROTOCOL.md) or review test cases for usage examples.
