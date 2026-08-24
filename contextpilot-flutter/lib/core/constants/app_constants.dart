class AppConstants {
  static const String appName = 'ContextPilot';
  static const String appVersion = '1.0.0 (Hackathon MVP)';

  // Protocol Defaults
  static const String defaultProtocolVersion = '1.0';
  static const int defaultPort = 8080;

}

enum ConnectionStatus {
  disconnected,
  connecting,
  pairing,
  connected,
  reconnecting,
  pairingFailed,
  agentUnavailable,
  protocolMismatch,
}

enum RiskLevel { safe, review, dangerous }

enum OperationStatus {
  queued,
  planning,
  awaitingApproval,
  approved,
  running,
  testing,
  completed,
  failed,
  cancelled,
}

enum FindingSeverity { critical, high, medium, low }
