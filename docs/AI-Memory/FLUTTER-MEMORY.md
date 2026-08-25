# ContextPilot — Flutter Mobile App Memory

> **Current-implementation memory for the mobile app only.** Source of truth is `apps/mobile/`.

## Purpose

The Flutter app is the phone-side control surface for ContextPilot. It pairs with a laptop agent over a local network (WebSocket), lets the user send natural-language prompts or structured command actions, shows real-time terminal output, requests/tracks approval for risky actions, and presents project, activity, and security status. The app does not access the laptop filesystem directly.

## Architecture

- Riverpod (`StateNotifierProvider`) for state; a single WebSocket connection (`WebSocketProtocolClient`) is the live transport.
- Layers: `core/` (constants, theme), `data/` (mock + protocol + models), `domain/models/`, `presentation/` (providers + screens + widgets).
- Flow: Splash -> Onboarding -> Connect (QR or manual) -> MainNavigation (5-tab shell).

## Folder structure

    apps/mobile/lib/
      core/       constants, theme
      data/       mock, protocol (qr_parser, websocket_client)
      domain/     models (ConnectionInfo, ChatMessage, Operation, ApprovalRequest, ...)
      presentation/  providers, screens, widgets

## Screens

- **splash_screen.dart** — branded splash; auto-navigates after ~2.2s.
- **onboarding_screen.dart** — intro before connecting.
- **connect_screen.dart** — connect via QR scan or manual host/port/token entry.
- **qr_scanner_screen.dart** — camera QR scan using `mobile_scanner`.
- **main_navigation_screen.dart** — `IndexedStack` shell with bottom nav (Home, Ask, Activity, Project, Settings).
- **home_screen.dart** — overview + developer-commands quick grid + navigation callback.
- **chat_screen.dart** — chat UI (prompts, results, command status).
- **activity_screen.dart** — activity/operation history.
- **approval_screen.dart** — pending approval for REVIEW/DANGEROUS steps.
- **operation_progress_screen.dart** — live terminal output with stdout/stderr coloring, auto-scroll, cancel.
- **project_screen.dart** — project details.
- **security_screen.dart** / **security_detail_screen.dart** — security findings.
- **settings_screen.dart** — app settings.

## Navigation

- Material `Navigator` transitions (push / pushReplacement) between splash, onboarding, connect, and the main shell.
- Main shell uses an `IndexedStack` with a 5-item `BottomNavigationBar` (Home, Ask, Activity, Project, Settings) driven by local tab-index state.

## State management

All via Riverpod `StateNotifierProvider`:

- `connectionProvider` -> `ConnectionNotifier` / `ConnectionState`.
- `chatProvider` -> `ChatNotifier` / `List<ChatMessage>`.
- `operationProvider` -> `OperationNotifier` / `OperationState`.
- `projectProvider`, `securityProvider` follow the same pattern.
- `wsClientProvider` supplies the single `WebSocketProtocolClient`.
- A mock provider exists (`mockAgentServiceProvider`) but mock mode is off (`isMockMode` resolves to `false`).

## Network layer

- `WebSocketProtocolClient.connect(ConnectionInfo)` builds `Uri.parse(info.wsUrl)` (e.g. `ws://host:port`), connects, sends an initial `pairing` message, then listens.
- Handles `type == 'authenticated'` -> connected; error codes `PROTOCOL_VERSION_UNSUPPORTED` / `PAIRING_TOKEN_EXPIRED` / `INVALID_PAIRING_TOKEN` map to `protocolMismatch` / `pairingFailed`.
- Reconnect: max 5 retries, backoff `[1000, 2000, 4000, 8000, 16000]` ms; emits `reconnecting`.
- `send(Map)` guards on connected state; an intentional disconnect cancels timers and closes the sink.
- Human-friendly errors for timeout (same-Wi-Fi guidance), connection refused (firewall/network), and generic failures.

## QR / pairing

- `QrParser.parse(rawPayload)` JSON-decodes the scanned string, requires non-empty `host` and `pairingToken`, defaults `port` to `8765`, and builds `ConnectionInfo` (also reads `protocolVersion`, `agentName`, `projectId`, `projectName`, `isSecure`).
- `connect_screen` scans via `qr_scanner_screen` and passes the result to the connection provider.

## Workspace selection

- The app does not select the workspace; the agent's start directory is the workspace. `project_screen` shows the project info returned by the agent after pairing.

## Command UI

- `home_screen.dart` shows a quick grid of developer commands (Flutter/npm/Git/Docker/Python actions).
- `chatProvider.sendCommand(action, {args, requestId})` sends an `action_request` WebSocket message (with optional `sessionId`) and shows a `> action` chat bubble.
- Structured commands start a live terminal view.

## Output UI

- `operation_progress_screen.dart` renders `command.output` chunks, color-coding stdout vs stderr, with auto-scroll toggle, status badges, and a cancel button.
- `ChatNotifier` renders `command.start`, `command.completed`, `command.error`, `command.cancelled` into chat.

## Error handling

- Connection errors are surfaced via banners and `ConnectionState.errorMessage`.
- Malformed WS messages are ignored silently; transport errors trigger reconnect.
- Command/operation failures are rendered as error cards in chat/activity.

## Android permissions

From `apps/mobile/android/app/src/main/AndroidManifest.xml`:

- `android.permission.CAMERA` (QR scanning).
- `android.permission.INTERNET` (WebSocket to the agent).
- Camera hardware feature declared with `required="false"` (installable on non-camera devices).

## Dependencies

From `apps/mobile/pubspec.yaml`: `flutter_riverpod ^2.6.1`, `web_socket_channel ^3.0.3`, `google_fonts ^6.3.3`, `flutter_animate ^4.5.0`, `mobile_scanner ^7.4.0`, `uuid ^4.5.1`, `intl ^0.20.3`, `shared_preferences ^2.3.2`, `flutter_spinkit ^5.2.1`, `permission_handler ^11.4.0`. Dev: `flutter_lints ^6.0.0`.

## Important files

- `lib/main.dart` — entry, `ProviderScope` + `MaterialApp`, home `SplashScreen`.
- `lib/data/protocol/websocket_client.dart` — transport.
- `lib/data/protocol/qr_parser.dart` — pairing payload.
- `lib/presentation/providers/connection_provider.dart`, `chat_provider.dart`, `operation_provider.dart` — core state.
- `lib/presentation/screens/operation_progress_screen.dart` — live terminal.
- `lib/presentation/screens/connect_screen.dart`, `main_navigation_screen.dart` — pairing + navigation.

## Current features

QR + manual pairing, live WebSocket transport with reconnect, 5-tab shell, chat with prompts and command actions, live terminal output, approval flow, activity/history, project view, security views, settings.

## Known issues

- `AppConstants.defaultPort` is `8080` but the agent defaults to `8765`; the manual connect screen defaults the port field to `8080` too (QR carries the real port, so this only affects manual entry).
- `MockAgentService` is a deprecated no-op shell; `isMockMode` is effectively always `false`.
- `apps/mobile/README.md` references the pre-organization path (`../contextpilot-npm`).
- Long-running UI states rely on streamed `command.*` events; a mid-stream disconnect resets to reconnecting.

## Planned features

Not implemented (from PRD/UI-UX only): on-device LLM, voice-first workflow, screenshot/camera understanding, GitHub integration, remote access, and any additional command-grid actions beyond the Home quick-command list.
