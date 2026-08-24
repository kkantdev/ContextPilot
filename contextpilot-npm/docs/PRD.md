# ContextPilot NPM / Laptop Agent — PRD

**Version:** 1.0  
**Status:** Hackathon MVP  
**Project:** ContextPilot NPM / Laptop Agent  
**Purpose:** Define the complete product requirements for the laptop-side ContextPilot Agent.

---

# INDEX

1. Product Overview
2. Problem Statement
3. Product Vision
4. Objectives
5. Target Users
6. Product Scope
7. MVP Definition
8. Core User Journey
9. Functional Requirements
10. CLI Requirements
11. Project Detection
12. Phone Pairing
13. Network Communication
14. Agent Session
15. AI Integration
16. Tool System
17. File Operations
18. Terminal Operations
19. Testing Operations
20. Git Operations
21. Security Analysis
22. Approval System
23. Operation Lifecycle
24. Real-Time Events
25. Error Handling
26. Configuration
27. Logging
28. Privacy
29. Security Requirements
30. Performance
31. Compatibility
32. Hackathon Demo Requirements
33. MVP Acceptance Criteria
34. Future Scope
35. Dependencies on Flutter
36. Out of Scope
37. Implementation Rules

---

# 1. PRODUCT OVERVIEW

ContextPilot Agent is a lightweight laptop-side developer agent that runs locally inside a developer's project environment.

It acts as the bridge between:
**Flutter phone application → local network → ContextPilot Agent → AI → developer project**

The agent is responsible for safely interacting with:
* Project files
* Folders
* Terminal
* Git
* Tests
* Build tools
* Security analysis
* Local AI models

The agent does not need a graphical Windows/macOS application.
The primary interface on the laptop is the command-line interface: `contextpilot` starts the agent.

---

# 2. PROBLEM STATEMENT

Developers frequently switch between their phone, IDE, terminal, Git tools, testing tools, and AI assistants. ContextPilot provides a phone-first interface while keeping the actual development environment on the laptop.

The laptop agent solves the core execution tasks:
* understanding the local project
* communicating with the phone
* safely executing approved actions
* connecting the local/open-source AI model to developer tools
* reporting real-time results back to the phone

---

# 3. PRODUCT VISION

ContextPilot should allow a developer to control meaningful development workflows from their phone without giving an AI uncontrolled access to the laptop.

Core experience:
**Ask → Understand → Plan → Review → Approve → Execute → Test → Report**

---

# 4. OBJECTIVES

## Primary
1. Run ContextPilot locally through a CLI.
2. Detect the active project.
3. Generate a QR pairing code.
4. Establish secure local communication with the phone.
5. Receive natural-language requests.
6. Provide project context to the AI.
7. Generate structured plans.
8. Request approval before meaningful changes.
9. Execute controlled tools.
10. Stream progress to the phone.
11. Return results.
12. Run tests.
13. Provide Git changes.
14. Perform security checks.

## Secondary
* Support local/open-source models (Ollama & Qwen-family coding models initially).
* Provide extensible tool architecture.
* Support future on-device AI.
* Provide reusable CLI configuration.

---

# 5. TARGET USERS

Primary users:
* Developers & student developers
* Hackathon participants
* AI-assisted programmers working with local repositories

---

# 6. PRODUCT SCOPE

ContextPilot NPM contains:
* CLI
* Agent runtime & Local network server
* QR pairing & Auth/session manager
* AI adapter & Project context manager
* Tool registry & Permission manager
* File-system tools, Terminal tools, Test runner, Git integration, Security scanner
* Event/operation manager, Logging, Configuration

---

# 7. MVP DEFINITION

The MVP allows this complete workflow:
1. Developer opens a project terminal and runs `contextpilot`.
2. ContextPilot detects the project and displays QR pairing code.
3. Phone scans QR code and connects.
4. Developer sends natural-language request from phone.
5. Agent sends request and project context to AI, producing a structured plan.
6. Phone displays plan and asks for approval. Developer approves.
7. Agent executes approved tools, streams progress, runs tests, and reports results.

---

# 8. CORE USER JOURNEY

1. Developer runs `contextpilot`.
2. CLI prints project info and QR code.
3. Phone scans QR code.
4. Developer prompts phone: *"Create an authentication feature."*
5. Agent analyzes project structure, generates a structured plan, and requests approval.
6. Developer approves on phone; agent creates files, runs tests, and reports Git diff.

---

# 9. FUNCTIONAL REQUIREMENTS

* **FR-01 CLI startup**: `contextpilot` command validates environment, loads config, and displays QR payload.
* **FR-02 Project detection**: Detects active workspace root without escaping boundary.
* **FR-03 Agent lifecycle**: Manages states (`Starting`, `Ready`, `Waiting`, `Connected`, `Busy`, `Error`).
* **FR-04 QR pairing**: Displays temporary pairing payload (host, port, token, project info).

---

# 10. CLI REQUIREMENTS

Provides `contextpilot`, `contextpilot doctor`, and `contextpilot mock-client`.

---

# 11. PROJECT DETECTION

Modular detection for Node.js, React, Next.js, Flutter, Python, Go, Rust, and Java.

---

# 12. PHONE PAIRING

Local network sequence with short-lived tokens and session generation.

---

# 13. NETWORK COMMUNICATION

HTTP for initial REST requests (`/api/pair`) and WebSocket (`ws://`) for real-time bi-directional events.

---

# 14. AGENT SESSION

Maintains authenticated session state (`sessionId`, `deviceId`, `connectedAt`, `lastActivity`).

---

# 15. AI INTEGRATION

Abstracted `AIAdapter` interface supporting local Ollama (`qwen2.5-coder`) and `MockAIAdapter` fallback.

---

# 16. TOOL SYSTEM

Controlled tool registry: `read_file`, `search_code`, `list_directory`, `create_file`, `create_folder`, `edit_file`, `delete_file`, `run_command`, `run_tests`, `git_status`, `git_diff`, `security_scan`.

---

# 17. FILE OPERATIONS

Strict zero-escape workspace path sandboxing preventing path traversal (`../../`).

---

# 18. TERMINAL OPERATIONS

Controlled shell execution with risk classification (`SAFE`, `REVIEW`, `DANGEROUS`).

---

# 19. TESTING OPERATIONS

Executes detected test runner commands and returns structured `TestResult`.

---

# 20. GIT OPERATIONS

Provides `git_status` and `git_diff`.

---

# 21. SECURITY ANALYSIS

Static scanner inspecting project for exposed credentials and unsafe configs.

---

# 22. APPROVAL SYSTEM

Requires explicit user approval for `REVIEW` and `DANGEROUS` actions.

---

# 23. OPERATION LIFECYCLE

Tracks operations through `queued` -> `planning` -> `awaiting_approval` -> `approved` -> `running` -> `completed`/`failed`.

---

# 24. REAL-TIME EVENTS

Streams JSON event frames over WebSocket.

---

# 25. ERROR HANDLING

Structured error output with standard error codes.

---

# 26. CONFIGURATION

Configurable via CLI options, env vars (`CONTEXTPILOT_PORT`, `OLLAMA_HOST`), and defaults.

---

# 27. LOGGING

Structured CLI logger with levels (`info`, `warn`, `error`, `debug`).

---

# 28. PRIVACY & SECURITY

Project code remains local; no cloud transmission required. Path sandboxing and token authentication enforced.

---

# 29. MVP ACCEPTANCE CRITERIA

* [x] `contextpilot` starts successfully.
* [x] Project is detected and workspace boundary is enforced.
* [x] QR pairing code is generated.
* [x] Phone/mock client can pair and establish WebSocket session.
* [x] Natural language prompts produce structured plans.
* [x] Approval requests are sent and processed.
* [x] Approved file operations execute safely.
* [x] Terminal, test, git, and security scan tools execute.
* [x] Real-time events stream to connected client.

---

# 30. OUT OF SCOPE FOR MVP

GUI app, VS Code extension, Cloud backend, Automatic git push/commit.
