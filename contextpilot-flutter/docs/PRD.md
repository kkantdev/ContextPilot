# ContextPilot Flutter — PRD (Product Requirements Document)

**Version:** 1.0  
**Status:** Hackathon MVP  
**Project:** ContextPilot Flutter Mobile App  
**Platform:** Android (primary), iOS (future)  
**Purpose:** Phone-first AI developer control center paired with ContextPilot Laptop Agent.

---

# 1. PRODUCT OVERVIEW

ContextPilot Flutter is the mobile control center of the ContextPilot system. It allows a developer to connect to a ContextPilot Agent running on their laptop and use natural language to inspect, understand, modify, test, and secure a software project — all from their phone.

The Flutter app communicates with the laptop-side ContextPilot Agent over the **local network** using the ContextPilot protocol.

```
Phone (Flutter App)
       ↓ Local Wi-Fi
ContextPilot Laptop Agent (npm)
       ↓
Project files / terminal / Git / tests / local AI
```

---

# 2. PROBLEM

Developers repeatedly context-switch between IDE, terminal, Git, test output, and AI assistants. Existing AI tools are desktop-IDE-centric. ContextPilot enables a phone-first workflow where the developer controls a real project from their phone while the laptop agent performs controlled operations.

---

# 3. VISION

Make the phone a **secure, understandable, and useful control surface** for AI-assisted development.

Core experience: *Tell ContextPilot what you want → understand the plan → approve actions → watch the laptop agent work → review the result.*

---

# 4. GOALS

**Primary:**
1. Connect phone to laptop agent via QR code pairing.
2. Display connected project status clearly.
3. Send natural-language developer requests.
4. Show AI-generated plan from agent.
5. Require explicit approval before meaningful file changes or risky operations.
6. Show real-time operation progress.
7. Show created/modified files, test results, Git changes, and security findings.

**Secondary:**
- Voice input (future).
- Conversation history for current session.
- Project health summary and quick actions.

---

# 5. NON-GOALS (MVP)

- Cloud backend, user accounts, billing.
- Full desktop application or VS Code extension.
- Direct unrestricted filesystem/shell access from Flutter.
- Multi-user collaboration or remote internet-based access.
- Permanent cloud storage of project code.

---

# 6. TARGET USERS

- Student developers and hackathon participants.
- Developers working with Flutter, React, Node.js, Python, and similar projects.
- AI-assisted developers wanting a phone-first workflow.

---

# 7. MVP SCOPE

### Connection
- Scan QR code to discover and pair with laptop agent.
- Show connection status persistently (`Connecting`, `Connected`, `Reconnecting`, `Disconnected`).
- Handle pairing token errors and protocol mismatch gracefully.

### Project
- Display connected project name, framework, language, branch.

### AI Interaction
- Natural-language text prompt input.
- Conversation view with AI response cards (plan, explanation, result).
- Plan display with step-by-step breakdown.

### Safety & Approval
- Approval screen before any `REVIEW` or `DANGEROUS` action.
- Show exactly what will happen (files, commands, risk level).
- Approve / Reject / Cancel controls.

### Results
- File changes summary.
- Test result summary.
- Git diff summary.
- Security findings display.

---

# 8. SCREEN INVENTORY

| # | Screen | Purpose |
|---|--------|---------|
| 1 | Splash | App startup loading |
| 2 | Onboarding | 2–3 screen intro flow (skippable) |
| 3 | Home | Project status + quick actions |
| 4 | Connect Laptop | CTA to scan QR |
| 5 | QR Scanner | Scan agent QR code |
| 6 | Chat / Ask | Natural language prompt & conversation |
| 7 | Approval | Review and approve/reject step |
| 8 | Operation Progress | Live event timeline |
| 9 | Activity | Recent operations list |
| 10 | Project Overview | Project info, git, security status |
| 11 | Security Scan | Findings by severity |
| 12 | Security Detail | Per-finding explanation & fix action |
| 13 | Settings | Config, theme, connection info |

---

# 9. MVP ACCEPTANCE CRITERIA

- [ ] App launches successfully.
- [ ] QR scanner parses ContextPilot QR payload.
- [ ] App connects to local agent via WebSocket.
- [ ] Connection status is persistently visible.
- [ ] Project info is received and displayed.
- [ ] Natural-language request is sent and AI response displayed.
- [ ] Structured plan received from agent is rendered.
- [ ] Approval request is shown with file/tool/risk details.
- [ ] Approve and reject actions are wired to agent.
- [ ] Real-time operation progress events stream to UI.
- [ ] Operation completion/failure shown.
- [ ] File changes displayed.
- [ ] Test results displayed.
- [ ] Git status/diff shown.
- [ ] Security findings shown by severity.
- [ ] Disconnection handled gracefully with reconnect option.
- [ ] No cloud backend required.
- [ ] No unrestricted filesystem access implemented in Flutter.

---

# 10. FUTURE SCOPE

- On-device LLM / voice-first workflow.
- Screenshot understanding and Camera/OCR for error messages.
- GitHub integration (PRs, issues).
- Remote project access and multi-project management.
- Team collaboration and advanced autonomous execution.
