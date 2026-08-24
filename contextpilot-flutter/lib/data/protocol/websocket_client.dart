import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/constants/app_constants.dart';
import '../../domain/models/connection_info.dart';

class WebSocketProtocolClient {
  static const int maxRetries = 5;
  static const List<int> retryDelaysMs = [1000, 2000, 4000, 8000, 16000];
  WebSocketChannel? _channel;
  StreamSubscription? _channelSubscription;
  Timer? _reconnectTimer;
  ConnectionInfo? _lastConnectionInfo;
  Object? _lastError;
  int _retryCount = 0;
  bool _intentionalDisconnect = false;
  final StreamController<Map<String, dynamic>> _messageController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<ConnectionStatus> _statusController =
      StreamController<ConnectionStatus>.broadcast();

  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  Stream<ConnectionStatus> get statusStream => _statusController.stream;

  bool _isConnected = false;
  bool get isConnected => _isConnected;
  int get retryCount => _retryCount;
  String get connectionErrorMessage => getConnectionErrorMessage(_lastError);

  Future<bool> connect(ConnectionInfo info) async {
    _intentionalDisconnect = false;
    _lastConnectionInfo = info;
    _retryCount = 0;
    _reconnectTimer?.cancel();
    return _attemptConnect();
  }

  Future<bool> _attemptConnect() async {
    final info = _lastConnectionInfo;
    if (info == null || _intentionalDisconnect) return false;
    try {
      _statusController.add(
        _retryCount == 0
            ? ConnectionStatus.connecting
            : ConnectionStatus.reconnecting,
      );
      final Uri uri = Uri.parse(info.wsUrl);

      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready.timeout(const Duration(seconds: 10));

      _isConnected = true;
      _retryCount = 0;
      _lastError = null;
      _statusController.add(ConnectionStatus.pairing);

      // Send pairing message matching the npm agent's expected protocol
      send({
        'type': 'pairing',
        'payload': {
          'pairingToken': info.pairingToken,
          'deviceId': 'flutter-phone-${info.projectId}',
          'deviceName': 'ContextPilot Mobile App',
        },
      });

      _channelSubscription = _channel!.stream.listen(
        (data) {
          try {
            final Map<String, dynamic> json = jsonDecode(data.toString());
            _messageController.add(json);

            // Update connection status from protocol messages
            final type = json['type'] as String?;
            if (type == 'authenticated') {
              _isConnected = true;
              _statusController.add(ConnectionStatus.connected);
            } else if (type == 'error') {
              final code = json['payload']?['code'] as String? ?? '';
              if (code == 'PROTOCOL_VERSION_UNSUPPORTED') {
                _statusController.add(ConnectionStatus.protocolMismatch);
              } else if (code == 'PAIRING_TOKEN_EXPIRED' ||
                  code == 'INVALID_PAIRING_TOKEN') {
                _statusController.add(ConnectionStatus.pairingFailed);
              }
            }
          } catch (_) {
            // Malformed message — ignore silently
          }
        },
        onError: _handleDisconnection,
        onDone: _handleDisconnection,
      );

      return true;
    } catch (e) {
      _lastError = e;
      _isConnected = false;
      _statusController.add(
        e is TimeoutException || e is SocketException
            ? ConnectionStatus.agentUnavailable
            : ConnectionStatus.pairingFailed,
      );
      _scheduleRetry();
      return false;
    }
  }

  void _handleDisconnection([Object? error, StackTrace? stackTrace]) {
    if (_intentionalDisconnect) return;
    _lastError = error;
    _isConnected = false;
    _statusController.add(ConnectionStatus.disconnected);
    _scheduleRetry();
  }

  void _scheduleRetry() {
    if (_intentionalDisconnect ||
        _lastConnectionInfo == null ||
        _retryCount >= maxRetries) {
      return;
    }
    final delay = retryDelaysMs[_retryCount++];
    _statusController.add(ConnectionStatus.reconnecting);
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(milliseconds: delay), _attemptConnect);
  }

  String getConnectionErrorMessage([Object? error]) {
    if (error is TimeoutException) {
      return 'Connection timeout. Make sure your phone and laptop are on the same Wi-Fi network.';
    }
    if (error is SocketException) {
      if (error.message.toLowerCase().contains('refused')) {
        return 'Connection refused. Check that the agent is running, Windows Firewall allows the port, and both devices use the same network.';
      }
      return 'Network error. Check your Wi-Fi connection.';
    }
    if (error is String && error.isNotEmpty) return error;
    return 'Cannot reach laptop agent. Verify the network connection and try again.';
  }

  void send(Map<String, dynamic> message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  void disconnect() {
    _intentionalDisconnect = true;
    _reconnectTimer?.cancel();
    _channelSubscription?.cancel();
    _channel?.sink.close();
    _isConnected = false;
    _statusController.add(ConnectionStatus.disconnected);
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _statusController.close();
  }
}
