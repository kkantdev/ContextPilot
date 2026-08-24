import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_constants.dart';
import '../../data/mock/mock_agent_service.dart';
import '../../data/protocol/websocket_client.dart';
import '../../domain/models/connection_info.dart';

class ConnectionState {
  final ConnectionInfo info;
  final String? errorMessage;
  final String? sessionId;
  bool get isMockMode => false;
  const ConnectionState({required this.info, this.errorMessage, this.sessionId});
  ConnectionState copyWith({ConnectionInfo? info, String? errorMessage, String? sessionId}) => ConnectionState(info: info ?? this.info, errorMessage: errorMessage, sessionId: sessionId ?? this.sessionId);
}

class ConnectionNotifier extends StateNotifier<ConnectionState> {
  final WebSocketProtocolClient _client;
  StreamSubscription<ConnectionStatus>? _statusSub;
  StreamSubscription<Map<String, dynamic>>? _messageSub;
  ConnectionNotifier(this._client) : super(ConnectionState(info: ConnectionInfo(host: '', port: AppConstants.defaultPort, pairingToken: '', protocolVersion: AppConstants.defaultProtocolVersion, agentName: 'Not connected', projectId: '', projectName: 'No paired project')));

  Future<bool> connect(ConnectionInfo info) async {
    await _statusSub?.cancel(); await _messageSub?.cancel();
    state = state.copyWith(info: info.copyWith(status: ConnectionStatus.connecting), errorMessage: null);
    _statusSub = _client.statusStream.listen((status) => state = state.copyWith(info: state.info.copyWith(status: status)));
    _messageSub = _client.messageStream.listen(_handleMessage);
    final success = await _client.connect(info);
    if (!success) state = state.copyWith(info: info.copyWith(status: ConnectionStatus.pairingFailed), errorMessage: _client.connectionErrorMessage);
    return success;
  }

  void _handleMessage(Map<String, dynamic> message) {
    if (message['type'] == 'authenticated') {
      final payload = message['payload'] as Map<String, dynamic>? ?? {};
      final project = payload['project'] as Map<String, dynamic>? ?? {};
      final session = payload['session'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(info: state.info.copyWith(status: ConnectionStatus.connected, projectName: project['name'] as String? ?? state.info.projectName, projectId: project['id'] as String? ?? state.info.projectId), sessionId: session['sessionId'] as String?, errorMessage: null);
    } else if (message['type'] == 'error') { state = state.copyWith(errorMessage: (message['payload'] as Map?)?['message'] as String? ?? 'Agent error'); }
  }
  void disconnect() { _client.disconnect(); state = state.copyWith(sessionId: null); }
  @override void dispose() { _statusSub?.cancel(); _messageSub?.cancel(); _client.dispose(); super.dispose(); }
}

final wsClientProvider = Provider<WebSocketProtocolClient>((ref) => WebSocketProtocolClient());
final mockAgentServiceProvider = Provider<MockAgentService>((ref) => MockAgentService());
final connectionProvider = StateNotifierProvider<ConnectionNotifier, ConnectionState>((ref) => ConnectionNotifier(ref.watch(wsClientProvider)));
