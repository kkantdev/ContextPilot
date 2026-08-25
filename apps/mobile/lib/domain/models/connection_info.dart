import '../../core/constants/app_constants.dart';

class ConnectionInfo {
  final String host;
  final int port;
  final String pairingToken;
  final String protocolVersion;
  final String agentName;
  final String projectId;
  final String projectName;
  final bool isSecure;
  final ConnectionStatus status;
  final DateTime? lastConnected;

  ConnectionInfo({
    required this.host,
    required this.port,
    required this.pairingToken,
    required this.protocolVersion,
    required this.agentName,
    required this.projectId,
    required this.projectName,
    this.isSecure = false,
    this.status = ConnectionStatus.disconnected,
    this.lastConnected,
  });

  ConnectionInfo copyWith({
    String? host,
    int? port,
    String? pairingToken,
    String? protocolVersion,
    String? agentName,
    String? projectId,
    String? projectName,
    bool? isSecure,
    ConnectionStatus? status,
    DateTime? lastConnected,
  }) {
    return ConnectionInfo(
      host: host ?? this.host,
      port: port ?? this.port,
      pairingToken: pairingToken ?? this.pairingToken,
      protocolVersion: protocolVersion ?? this.protocolVersion,
      agentName: agentName ?? this.agentName,
      projectId: projectId ?? this.projectId,
      projectName: projectName ?? this.projectName,
      isSecure: isSecure ?? this.isSecure,
      status: status ?? this.status,
      lastConnected: lastConnected ?? this.lastConnected,
    );
  }

  Map<String, dynamic> toJson() => {
    'host': host,
    'port': port,
    'pairingToken': pairingToken,
    'protocolVersion': protocolVersion,
    'agentName': agentName,
    'projectId': projectId,
    'projectName': projectName,
    'isSecure': isSecure,
  };

  factory ConnectionInfo.fromJson(Map<String, dynamic> json) {
    return ConnectionInfo(
      host: json['host'] ?? '192.168.1.50',
      port: json['port'] ?? 8080,
      pairingToken: json['pairingToken'] ?? '',
      protocolVersion: json['protocolVersion'] ?? '1.0',
      agentName: json['agentName'] ?? 'Laptop Agent',
      projectId: json['projectId'] ?? 'project_1',
      projectName: json['projectName'] ?? 'ContextPilot App',
      isSecure: json['isSecure'] ?? false,
    );
  }

  String get wsUrl {
    final scheme = isSecure ? 'wss' : 'ws';
    return '$scheme://$host:$port';
  }
}
