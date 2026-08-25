# ContextPilot

ContextPilot is a phone-first local developer-agent tool. The ContextPilot mobile app (Flutter) pairs with the ContextPilot laptop agent (Node.js/npm) over a local network, so a developer can use their phone to inspect, understand, modify, test, and secure a software project running on their laptop.

## Repository Structure

```
ContextPilot/
├── apps/
│   └── mobile/        # Flutter mobile application
├── packages/
│   └── agent/         # Node.js / npm laptop agent
├── docs/
│   ├── PRD/           # Product Requirements Documents
│   ├── TRD/           # Technical Requirements Documents
│   ├── UI-UX/         # UI/UX specification
│   ├── AI-Memory/     # AI memory / continuity documents
│   └── architecture/  # architecture documentation
├── LICENSE
└── .gitignore
```

See `apps/mobile/README.md` and `packages/agent/README.md` for project-specific instructions.