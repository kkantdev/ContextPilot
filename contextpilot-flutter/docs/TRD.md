# ContextPilot Flutter — TRD (Technical Requirements Document)

**Version:** 1.0  
**Status:** Hackathon MVP  
**Platform:** Android (primary)  
**Language:** Dart / Flutter 3.44.6  
**Dart SDK:** ^3.12.2  

---

# 1. TECHNICAL ARCHITECTURE

```
Presentation Layer
 ├── screens/         (UI pages)
 ├── widgets/         (reusable components)
 └── providers/       (Riverpod state)

Domain Layer
 └── models/          (data models: ConnectionInfo, Operation, etc.)

Data Layer
 ├── protocol/        (WebSocket client, QR parser)
 └── mock/            (MockAgentService for offline dev)

Core Layer
 ├── theme/           (AppTheme, colors, typography)
 └── constants/       (AppConstants)
```

---

# 2. DEPENDENCIES

| Package | Version | Purpose |
|---------|---------|---------|
| `flutter_riverpod` | ^2.5.1 | State management |
| `web_socket_channel` | ^3.0.1 | WebSocket transport |
| `google_fonts` | ^6.2.1 | Typography |
| `flutter_animate` | ^4.5.0 | Micro-animations |
| `mobile_scanner` | ^5.2.3 | QR code scanning |
| `uuid` | ^4.4.0 | Unique operation IDs |
| `intl` | ^0.19.0 | Date/time formatting |
| `shared_preferences` | ^2.2.3 | Light local persistence |
| `flutter_spinkit` | ^5.2.1 | Loading indicators |

---

# 3. STATE MANAGEMENT

Riverpod is used as the state management solution. State is split across focused providers:

| Provider | Responsibility |
|----------|---------------|
| `ConnectionProvider` | WebSocket connection lifecycle, session state |
| `ProjectProvider` | Connected project info |
| `ChatProvider` | Conversation messages |
| `OperationProvider` | Active operations and step events |
| `SecurityProvider` | Security scan findings |

---

# 4. NETWORK ARCHITECTURE

- **Transport**: `web_socket_channel` over `ws://` to the local ContextPilot Laptop Agent.
- **Discovery**: Host/port parsed from QR payload; no fixed IP.
- **Protocol Version**: `1.0` (validated on `authenticated` message).
- **QR Parser**: `lib/data/protocol/qr_parser.dart` — validates payload schema and extracts `host`, `port`, `pairingToken`, `projectName`.
- **WebSocket Client**: `lib/data/protocol/websocket_client.dart` — handles `pairing`, `user_request`, `approval_response` sends and processes incoming `ProtocolMessage` frames.

---

# 5. PROTOCOL INTEGRATION

See `docs/PROTOCOL.md` for shared message schemas.

Flutter sends:
- `pairing` (pairingToken, deviceId)
- `user_request` (prompt)
- `approval_response` (approvalId, approved, reason)

Flutter receives and renders:
- `authenticated` → session setup
- `plan_created` → render plan steps
- `approval_required` → show ApprovalScreen
- `tool_started`, `tool_completed` → OperationProgressScreen timeline
- `operation_completed`, `operation_failed`, `operation_cancelled` → result display
- `error` → error handling

---

# 6. SECURITY ARCHITECTURE

1. Pairing token extracted from QR payload — not stored after session established.
2. Session ID stored in-memory only within `ConnectionProvider`.
3. `shared_preferences` used only for safe non-sensitive preferences (theme).
4. No source code or project files stored on device.
5. No cloud API calls made for core functionality.

---

# 7. BUILD ENVIRONMENT (Android)

| Item | Value |
|------|-------|
| Flutter Version | 3.44.6 (stable) |
| Dart Version | 3.12.2 |
| Android SDK | 36.0.0 |
| Java / JDK | OpenJDK 17.0.19 (Homebrew) |
| JDK Path | `/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home` |
| Gradle Task | `assembleDebug` |
| Build Output | `build/app/outputs/flutter-apk/app-debug.apk` |

**IMPORTANT:** Flutter `jdk-dir` must be set to the Homebrew OpenJDK 17 path:
```bash
flutter config --jdk-dir="/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home"
```

The default Android Studio JBR path (`/Applications/Android Studio.app/Contents/jbr/Contents/Home`) is **invalid** on this system — Android Studio is not installed.

---

# 8. PERFORMANCE TARGETS

- App cold start < 2s.
- QR scan recognition < 1s.
- WebSocket connection established < 500ms after pairing.
- Operation event latency < 200ms from agent.
- No blocking UI during long operations (all async).

---

# 9. TESTING ARCHITECTURE

- **Framework**: `flutter_test` (SDK).
- **Status**: Basic test scaffolding in `test/` directory.
- Unit tests: `NOT RUN — REQUIRES SETUP`.
- Widget tests: `NOT RUN — REQUIRES SETUP`.
- Integration tests: `NOT RUN — REQUIRES SETUP`.
