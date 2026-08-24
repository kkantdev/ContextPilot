import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_constants.dart';
import '../../data/mock/mock_agent_service.dart';
import '../../data/protocol/websocket_client.dart';
import '../../domain/models/approval_request.dart';
import '../../domain/models/chat_message.dart';
import '../../domain/models/file_change.dart';
import '../../domain/models/operation.dart';
import 'connection_provider.dart';

class ChatNotifier extends StateNotifier<List<ChatMessage>> {
  final MockAgentService _mockService;
  final WebSocketProtocolClient _wsClient;
  final bool Function() _isMockMode;
  final String? Function() _getSessionId;

  StreamSubscription<Map<String, dynamic>>? _liveSub;

  ChatNotifier(
    this._mockService,
    this._wsClient,
    this._isMockMode,
    this._getSessionId,
  ) : super([
        ChatMessage(
          id: 'init_welcome',
          text:
              'Connected to ContextPilot Laptop Agent. Ask me to create features, inspect code, run tests, or perform security scans.',
          type: MessageType.aiExplanation,
          timestamp: DateTime.now().subtract(const Duration(minutes: 2)),
        ),
      ]) {
    // Always listen to mock chat stream
    _mockService.chatStream.listen((msg) {
      if (_isMockMode()) {
        state = [...state, msg];
      }
    });

    // Listen to live agent messages for chat-relevant events
    _liveSub = _wsClient.messageStream.listen(_handleLiveMessage);
  }

  /// Sends a prompt via the appropriate transport.
  void sendMessage(String prompt) {
    if (prompt.trim().isEmpty) return;
    if (_isMockMode()) {
      _mockService.processUserPrompt(prompt);
    } else {
      // Add user bubble immediately
      final userMsg = ChatMessage(
        id: 'user_${DateTime.now().millisecondsSinceEpoch}',
        text: prompt,
        type: MessageType.userPrompt,
        timestamp: DateTime.now(),
      );
      state = [...state, userMsg];

      final Map<String, dynamic> request = {
        'type': 'user_request',
        'payload': {'prompt': prompt},
      };

      final activeSessionId = _getSessionId();
      if (activeSessionId != null && activeSessionId.isNotEmpty) {
        request['sessionId'] = activeSessionId;
      }

      // Send to live agent
      _wsClient.send(request);
    }
  }

  /// Sends a structured command request to the agent.
  void sendCommand(
    String action, {
    Map<String, dynamic>? args,
    String? requestId,
  }) {
    if (action.trim().isEmpty) return;

    if (_isMockMode()) {
      // For mock mode, convert command to user prompt
      _mockService.processUserPrompt('Run command: $action');
    } else {
      // Add command bubble immediately to show user what was triggered
      final commandMsg = ChatMessage(
        id: 'cmd_${DateTime.now().millisecondsSinceEpoch}',
        text: '> $action',
        type: MessageType.userPrompt,
        timestamp: DateTime.now(),
      );
      state = [...state, commandMsg];

      final Map<String, dynamic> request = {
        'type': 'action_request',
        'payload': {
          'action': action,
          if (args != null && args.isNotEmpty) 'args': args,
          if (requestId != null) 'requestId': requestId,
        },
      };

      final activeSessionId = _getSessionId();
      if (activeSessionId != null && activeSessionId.isNotEmpty) {
        request['sessionId'] = activeSessionId;
      }

      // Send to live agent
      _wsClient.send(request);
    }
  }

  /// Sends a cancellation request for a running command.
  void cancelCommand(String requestId) {
    if (_isMockMode()) return;

    final Map<String, dynamic> request = {
      'type': 'cancel_request',
      'payload': {'requestId': requestId},
    };

    final activeSessionId = _getSessionId();
    if (activeSessionId != null && activeSessionId.isNotEmpty) {
      request['sessionId'] = activeSessionId;
    }

    // Send to live agent
    _wsClient.send(request);
  }

  /// Parses live agent messages into chat bubbles.
  void _handleLiveMessage(Map<String, dynamic> msg) {
    if (_isMockMode()) return;

    final type = msg['type'] as String?;
    if (type == null) return;

    final opId = msg['operationId'] as String?;
    final payload = msg['payload'] as Map<String, dynamic>? ?? {};

    switch (type) {
      // ── AI produced a plan ────────────────────────────────────────────────
      case 'plan_created':
        final plan = payload['plan'] as Map<String, dynamic>? ?? {};
        final summary = plan['summary'] as String? ?? 'Plan ready';
        final steps = (plan['steps'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();

        final opSteps = steps
            .map(
              (s) => OperationStep(
                id: s['stepId'] as String? ?? '',
                title: s['description'] as String? ?? '',
                status: StepStatus.pending,
              ),
            )
            .toList();

        final op = Operation(
          id: opId ?? 'op_${DateTime.now().millisecondsSinceEpoch}',
          title: summary,
          prompt: summary,
          status: OperationStatus.planning,
          riskLevel: _parseRiskLevel(
            steps.isNotEmpty ? steps.first['riskLevel'] as String? : null,
          ),
          steps: opSteps,
          startTime: DateTime.now(),
        );

        state = [
          ...state,
          ChatMessage(
            id: 'plan_${op.id}',
            text: summary,
            type: MessageType.aiPlan,
            timestamp: DateTime.now(),
            relatedOperationId: op.id,
            operation: op,
          ),
        ];
        break;

      // ── Agent needs approval before proceeding ────────────────────────────
      case 'approval_required':
        final approvalId = payload['approvalId'] as String? ?? '';
        final description =
            payload['description'] as String? ?? 'Approve action';
        final riskStr = payload['riskLevel'] as String?;
        final risk = _parseRiskLevel(riskStr);

        final affectedFiles = _parseFileChanges(
          payload['affectedFiles'] as List<dynamic>?,
        );

        final approvalReq = ApprovalRequest(
          id: approvalId,
          operationId: opId ?? '',
          title: description,
          description: description,
          riskLevel: risk,
          affectedFiles: affectedFiles,
          commandsToExecute: (payload['commands'] as List<dynamic>? ?? [])
              .cast<String>(),
          timestamp: DateTime.now(),
        );

        final op = Operation(
          id: opId ?? approvalId,
          title: description,
          prompt: description,
          status: OperationStatus.awaitingApproval,
          riskLevel: risk,
          steps: [],
          approvalRequest: approvalReq,
          startTime: DateTime.now(),
        );

        state = [
          ...state,
          ChatMessage(
            id: 'appr_${approvalId}',
            text: 'Approval required: $description',
            type: MessageType.aiPlan,
            timestamp: DateTime.now(),
            relatedOperationId: op.id,
            operation: op,
          ),
        ];
        break;

      // ── Operation finished successfully ───────────────────────────────────
      case 'operation_completed':
        final results = payload['results'] as List<dynamic>? ?? [];
        final summary = results.isNotEmpty
            ? 'Operation completed with ${results.length} result(s).'
            : 'Operation completed successfully.';
        state = [
          ...state,
          ChatMessage(
            id: 'done_${opId ?? DateTime.now().millisecondsSinceEpoch}',
            text: summary,
            type: MessageType.aiResult,
            timestamp: DateTime.now(),
            relatedOperationId: opId,
          ),
        ];
        break;

      // ── Operation failed ──────────────────────────────────────────────────
      case 'operation_failed':
        final error = payload['error'] as String? ?? 'Operation failed.';
        state = [
          ...state,
          ChatMessage(
            id: 'fail_${opId ?? DateTime.now().millisecondsSinceEpoch}',
            text: '❌ $error',
            type: MessageType.aiResult,
            timestamp: DateTime.now(),
            relatedOperationId: opId,
          ),
        ];
        break;

      // ── Agent error ───────────────────────────────────────────────────────
      case 'error':
        final errMsg = payload['message'] as String? ?? 'Unknown agent error.';
        state = [
          ...state,
          ChatMessage(
            id: 'err_${DateTime.now().millisecondsSinceEpoch}',
            text: '⚠️ Agent error: $errMsg',
            type: MessageType.systemNotification,
            timestamp: DateTime.now(),
          ),
        ];
        break;

      // ── Command streaming events ─────────────────────────────────────────
      case 'command.start':
        final requestId = payload['requestId'] as String? ?? '';
        final action = payload['action'] as String? ?? '';
        state = [
          ...state,
          ChatMessage(
            id: 'cmd_start_$requestId',
            text: '🚀 Starting: $action',
            type: MessageType.systemNotification,
            timestamp: DateTime.now(),
            relatedOperationId: requestId,
          ),
        ];
        break;

      case 'command.completed':
        final requestId = payload['requestId'] as String? ?? '';
        final exitCode = payload['exitCode'] as int? ?? 0;
        state = [
          ...state,
          ChatMessage(
            id: 'cmd_complete_$requestId',
            text: '✅ Command completed (exit code: $exitCode)',
            type: MessageType.aiResult,
            timestamp: DateTime.now(),
            relatedOperationId: requestId,
          ),
        ];
        break;

      case 'command.error':
        final requestId = payload['requestId'] as String? ?? '';
        final error = payload['error'] as String? ?? 'Command failed';
        final exitCode = payload['exitCode'] as int?;
        final errorMsg = exitCode != null
            ? '$error (exit code: $exitCode)'
            : error;
        state = [
          ...state,
          ChatMessage(
            id: 'cmd_error_$requestId',
            text: '❌ $errorMsg',
            type: MessageType.aiResult,
            timestamp: DateTime.now(),
            relatedOperationId: requestId,
          ),
        ];
        break;

      case 'command.cancelled':
        final requestId = payload['requestId'] as String? ?? '';
        state = [
          ...state,
          ChatMessage(
            id: 'cmd_cancelled_$requestId',
            text: '⏹️ Command cancelled',
            type: MessageType.systemNotification,
            timestamp: DateTime.now(),
            relatedOperationId: requestId,
          ),
        ];
        break;

      default:
        break;
    }
  }

  void clearHistory() {
    state = [];
  }

  RiskLevel _parseRiskLevel(String? raw) {
    switch (raw?.toUpperCase()) {
      case 'DANGEROUS':
        return RiskLevel.dangerous;
      case 'REVIEW':
        return RiskLevel.review;
      default:
        return RiskLevel.safe;
    }
  }

  List<FileChange> _parseFileChanges(List<dynamic>? raw) {
    if (raw == null) return [];
    return raw.cast<Map<String, dynamic>>().map((f) {
      final path = f['path'] as String? ?? '';
      final changeTypeStr = f['changeType'] as String? ?? 'modified';
      final changeType = changeTypeStr == 'created'
          ? ChangeType.created
          : changeTypeStr == 'deleted'
          ? ChangeType.deleted
          : ChangeType.modified;
      return FileChange(
        path: path,
        fileName: path.split('/').last,
        changeType: changeType,
        additions: f['additions'] as int? ?? 0,
        deletions: f['deletions'] as int? ?? 0,
        diffContent: f['diff'] as String? ?? '',
      );
    }).toList();
  }

  @override
  void dispose() {
    _liveSub?.cancel();
    super.dispose();
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, List<ChatMessage>>((
  ref,
) {
  final mockService = ref.watch(mockAgentServiceProvider);
  final wsClient = ref.watch(wsClientProvider);
  final connState = ref.watch(connectionProvider);
  return ChatNotifier(
    mockService,
    wsClient,
    () => connState.isMockMode,
    () => connState.sessionId,
  );
});
