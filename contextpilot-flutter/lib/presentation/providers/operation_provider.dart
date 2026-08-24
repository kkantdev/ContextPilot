import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_constants.dart';
import '../../data/mock/mock_agent_service.dart';
import '../../data/protocol/websocket_client.dart';
import '../../domain/models/approval_request.dart';
import '../../domain/models/file_change.dart';
import '../../domain/models/operation.dart';
import 'connection_provider.dart';

class OperationState {
  final Operation? activeOperation;
  final List<Operation> history;

  OperationState({this.activeOperation, this.history = const []});

  OperationState copyWith({
    Operation? activeOperation,
    List<Operation>? history,
    bool clearActive = false,
  }) {
    return OperationState(
      activeOperation: clearActive
          ? null
          : activeOperation ?? this.activeOperation,
      history: history ?? this.history,
    );
  }
}

class OperationNotifier extends StateNotifier<OperationState> {
  final MockAgentService _mockService;
  final WebSocketProtocolClient _wsClient;
  final bool Function() _isMockMode;
  final String? Function() _getSessionId;

  StreamSubscription<Map<String, dynamic>>? _liveSub;

  OperationNotifier(
    this._mockService,
    this._wsClient,
    this._isMockMode,
    this._getSessionId,
  ) : super(OperationState()) {
    // Mock operation stream
    _mockService.operationStream.listen((op) {
      if (_isMockMode()) _upsertOperation(op);
    });

    // Live agent operation event stream
    _liveSub = _wsClient.messageStream.listen(_handleLiveMessage);
  }

  // ── Public actions ──────────────────────────────────────────────────────

  /// Approves the pending operation. Routes to mock or live transport.
  void approveOperation(Operation op) {
    if (_isMockMode()) {
      _mockService.executeOperation(op);
    } else {
      final approvalId = op.approvalRequest?.id ?? '';
      final Map<String, dynamic> msg = {
        'type': 'approval_response',
        'operationId': op.id,
        'payload': {
          'approvalId': approvalId,
          'approved': true,
          'reason': 'Approved by user',
        },
      };

      final sessionId = _getSessionId();
      if (sessionId != null && sessionId.isNotEmpty) {
        msg['sessionId'] = sessionId;
      }

      _wsClient.send(msg);
      // Optimistically mark as running
      _upsertOperation(op.copyWith(status: OperationStatus.running));
    }
  }

  /// Rejects the pending operation.
  void rejectOperation(Operation op) {
    if (!_isMockMode()) {
      final approvalId = op.approvalRequest?.id ?? '';
      final Map<String, dynamic> msg = {
        'type': 'approval_response',
        'operationId': op.id,
        'payload': {
          'approvalId': approvalId,
          'approved': false,
          'reason': 'Rejected by user',
        },
      };

      final sessionId = _getSessionId();
      if (sessionId != null && sessionId.isNotEmpty) {
        msg['sessionId'] = sessionId;
      }

      _wsClient.send(msg);
    }

    _upsertOperation(op.copyWith(status: OperationStatus.cancelled));
  }

  /// Cancels a running streaming command operation.
  void cancelOperation(Operation op) {
    if (_isMockMode()) return;

    final Map<String, dynamic> msg = {
      'type': 'cancel_request',
      'payload': {'requestId': op.id},
    };

    final sessionId = _getSessionId();
    if (sessionId != null && sessionId.isNotEmpty) {
      msg['sessionId'] = sessionId;
    }

    _wsClient.send(msg);
    // Optimistically mark as cancelled
    _upsertOperation(op.copyWith(status: OperationStatus.cancelled));
  }

  // ── Live message handler ────────────────────────────────────────────────

  void _handleLiveMessage(Map<String, dynamic> msg) {
    if (_isMockMode()) return;

    final type = msg['type'] as String?;
    if (type == null) return;

    final opId = msg['operationId'] as String?;
    if (opId == null && type != 'error') return;

    final payload = msg['payload'] as Map<String, dynamic>? ?? {};

    switch (type) {
      // ── Plan → create operation in awaitingApproval ───────────────────────
      case 'plan_created':
        final plan = payload['plan'] as Map<String, dynamic>? ?? {};
        final summary = plan['summary'] as String? ?? 'Agent plan';
        final steps = (plan['steps'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();

        final approvalRequired = steps.any(
          (s) => s['requiresApproval'] == true,
        );
        final riskLevel = _highestRisk(steps);

        final opSteps = steps
            .map(
              (s) => OperationStep(
                id: s['stepId'] as String? ?? '',
                title: s['description'] as String? ?? '',
                status: StepStatus.pending,
              ),
            )
            .toList();

        ApprovalRequest? approvalReq;
        if (approvalRequired) {
          approvalReq = ApprovalRequest(
            id: 'appr_${opId}_plan',
            operationId: opId!,
            title: summary,
            description: summary,
            riskLevel: riskLevel,
            affectedFiles: [],
            commandsToExecute: [],
            timestamp: DateTime.now(),
          );
        }

        final op = Operation(
          id: opId!,
          title: summary,
          prompt: summary,
          status: approvalRequired
              ? OperationStatus.awaitingApproval
              : OperationStatus.running,
          riskLevel: riskLevel,
          steps: opSteps,
          approvalRequest: approvalReq,
          startTime: DateTime.now(),
        );
        _upsertOperation(op);
        break;

      // ── Approval required for a specific step ─────────────────────────────
      case 'approval_required':
        final approvalId = payload['approvalId'] as String? ?? '';
        final description =
            payload['description'] as String? ?? 'Approve action';
        final riskLevel = _parseRiskLevel(payload['riskLevel'] as String?);
        final affectedFiles = _parseFileChanges(
          payload['affectedFiles'] as List<dynamic>?,
        );

        final approvalReq = ApprovalRequest(
          id: approvalId,
          operationId: opId!,
          title: description,
          description: description,
          riskLevel: riskLevel,
          affectedFiles: affectedFiles,
          commandsToExecute: (payload['commands'] as List<dynamic>? ?? [])
              .cast<String>(),
          timestamp: DateTime.now(),
        );

        final existing = _findOp(opId);
        final op = (existing ?? _newOp(opId, description, riskLevel)).copyWith(
          status: OperationStatus.awaitingApproval,
          approvalRequest: approvalReq,
        );
        _upsertOperation(op);
        break;

      // ── Step started ──────────────────────────────────────────────────────
      case 'tool_started':
        final stepId = payload['stepId'] as String?;
        final description = payload['description'] as String? ?? '';
        final existing = _findOp(opId!);
        if (existing == null) break;

        final updatedSteps = existing.steps.map((s) {
          if (s.id == stepId) {
            return s.copyWith(status: StepStatus.running, detail: description);
          }
          return s;
        }).toList();

        _upsertOperation(
          existing.copyWith(
            status: OperationStatus.running,
            steps: updatedSteps,
          ),
        );
        break;

      // ── Step completed ────────────────────────────────────────────────────
      case 'tool_completed':
        final stepId = payload['stepId'] as String?;
        final result = payload['result'] as Map<String, dynamic>? ?? {};
        final success = result['success'] as bool? ?? true;
        final existing = _findOp(opId!);
        if (existing == null) break;

        final updatedSteps = existing.steps.map((s) {
          if (s.id == stepId) {
            return s.copyWith(
              status: success ? StepStatus.completed : StepStatus.failed,
              completedAt: DateTime.now(),
            );
          }
          return s;
        }).toList();

        _upsertOperation(existing.copyWith(steps: updatedSteps));
        break;

      // ── Operation fully completed ─────────────────────────────────────────
      case 'operation_completed':
        final existing = _findOp(opId!);
        if (existing == null) break;

        final finalSteps = existing.steps
            .map(
              (s) => s.copyWith(
                status: s.status == StepStatus.failed
                    ? StepStatus.failed
                    : StepStatus.completed,
                completedAt: s.completedAt ?? DateTime.now(),
              ),
            )
            .toList();

        _upsertOperation(
          existing.copyWith(
            status: OperationStatus.completed,
            steps: finalSteps,
            endTime: DateTime.now(),
          ),
        );
        break;

      // ── Operation failed ──────────────────────────────────────────────────
      case 'operation_failed':
        final error = payload['error'] as String? ?? 'Operation failed';
        final existing = _findOp(opId!);
        if (existing == null) break;

        _upsertOperation(
          existing.copyWith(
            status: OperationStatus.failed,
            errorSummary: error,
            endTime: DateTime.now(),
          ),
        );
        break;

      // ── Operation cancelled ───────────────────────────────────────────────
      case 'operation_cancelled':
        final existing = _findOp(opId!);
        if (existing == null) break;
        _upsertOperation(
          existing.copyWith(
            status: OperationStatus.cancelled,
            endTime: DateTime.now(),
          ),
        );
        break;

      // ── Command streaming events ──────────────────────────────────────────
      case 'command.start':
        final requestId = payload['requestId'] as String? ?? '';
        final action = payload['action'] as String? ?? '';
        final projectDir = payload['projectDir'] as String? ?? '';

        // Find operation by requestId (could be same as operationId)
        final existing = _findOpByIdOrRequestId(opId, requestId);
        if (existing != null) {
          _upsertOperation(
            existing.copyWith(
              commandText: action,
              isStreamingCommand: true,
              status: OperationStatus.running,
            ),
          );
        } else if (requestId.isNotEmpty) {
          // Create new operation for direct command execution
          final newOp = Operation(
            id: requestId,
            title: 'Command: $action',
            prompt: action,
            status: OperationStatus.running,
            riskLevel: RiskLevel.safe,
            steps: [],
            startTime: DateTime.now(),
            commandText: action,
            isStreamingCommand: true,
          );
          _upsertOperation(newOp);
        }
        break;

      case 'command.output':
        final requestId = payload['requestId'] as String? ?? '';
        final stream = payload['stream'] as String? ?? 'stdout';
        final data = payload['data'] as String? ?? '';

        final existing = _findOpByIdOrRequestId(opId, requestId);
        if (existing != null) {
          _upsertOperation(existing.addTerminalOutput(stream, data));
        }
        break;

      case 'command.completed':
        final requestId = payload['requestId'] as String? ?? '';
        final exitCode = payload['exitCode'] as int? ?? 0;

        final existing = _findOpByIdOrRequestId(opId, requestId);
        if (existing != null) {
          _upsertOperation(
            existing.copyWith(
              status: OperationStatus.completed,
              exitCode: exitCode,
              endTime: DateTime.now(),
            ),
          );
        }
        break;

      case 'command.error':
        final requestId = payload['requestId'] as String? ?? '';
        final error = payload['error'] as String? ?? 'Command failed';
        final exitCode = payload['exitCode'] as int?;

        final existing = _findOpByIdOrRequestId(opId, requestId);
        if (existing != null) {
          _upsertOperation(
            existing.copyWith(
              status: OperationStatus.failed,
              errorSummary: error,
              exitCode: exitCode,
              endTime: DateTime.now(),
            ),
          );
        }
        break;

      case 'command.cancelled':
        final requestId = payload['requestId'] as String? ?? '';

        final existing = _findOpByIdOrRequestId(opId, requestId);
        if (existing != null) {
          _upsertOperation(
            existing.copyWith(
              status: OperationStatus.cancelled,
              endTime: DateTime.now(),
            ),
          );
        }
        break;

      default:
        break;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  void _upsertOperation(Operation op) {
    final updated = List<Operation>.from(state.history);
    final idx = updated.indexWhere((o) => o.id == op.id);
    if (idx != -1) {
      updated[idx] = op;
    } else {
      updated.insert(0, op);
    }
    state = state.copyWith(activeOperation: op, history: updated);
  }

  Operation? _findOp(String opId) {
    try {
      return state.history.firstWhere((o) => o.id == opId);
    } catch (_) {
      return null;
    }
  }

  /// Find operation by operationId or requestId (for streaming commands)
  Operation? _findOpByIdOrRequestId(String? opId, String requestId) {
    if (opId != null) {
      final byOpId = _findOp(opId);
      if (byOpId != null) return byOpId;
    }

    if (requestId.isNotEmpty) {
      return _findOp(requestId);
    }

    return null;
  }

  Operation _newOp(String opId, String title, RiskLevel risk) => Operation(
    id: opId,
    title: title,
    prompt: title,
    status: OperationStatus.planning,
    riskLevel: risk,
    steps: [],
    startTime: DateTime.now(),
  );

  RiskLevel _highestRisk(List<Map<String, dynamic>> steps) {
    if (steps.any(
      (s) => (s['riskLevel'] as String?)?.toUpperCase() == 'DANGEROUS',
    )) {
      return RiskLevel.dangerous;
    }
    if (steps.any(
      (s) => (s['riskLevel'] as String?)?.toUpperCase() == 'REVIEW',
    )) {
      return RiskLevel.review;
    }
    return RiskLevel.safe;
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
      final ct = f['changeType'] as String? ?? 'modified';
      final changeType = ct == 'created'
          ? ChangeType.created
          : ct == 'deleted'
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

final operationProvider =
    StateNotifierProvider<OperationNotifier, OperationState>((ref) {
      final mockService = ref.watch(mockAgentServiceProvider);
      final wsClient = ref.watch(wsClientProvider);
      final connState = ref.watch(connectionProvider);
      return OperationNotifier(
        mockService,
        wsClient,
        () => connState.isMockMode,
        () => connState.sessionId,
      );
    });
