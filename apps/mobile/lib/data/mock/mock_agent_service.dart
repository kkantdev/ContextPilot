// Deprecated compatibility shell. The app no longer exposes or uses a mock transport.
import 'dart:async';
import '../../core/constants/app_constants.dart';
import '../../domain/models/chat_message.dart';
import '../../domain/models/connection_info.dart';
import '../../domain/models/operation.dart';
import '../../domain/models/project_info.dart';
import '../../domain/models/security_finding.dart';

class MockAgentService {
  final chatStream = const Stream<ChatMessage>.empty();
  final operationStream = const Stream<Operation>.empty();
  final statusStream = const Stream<ConnectionStatus>.empty();
  final currentConnection = ConnectionInfo(host: '', port: 8080, pairingToken: '', protocolVersion: '1.0', agentName: 'Not connected', projectId: '', projectName: 'No paired project');
  final currentProject = ProjectInfo(id: '', name: 'No paired project', path: '', framework: 'Unknown', language: 'Unknown', currentBranch: '', totalFiles: 0, healthScore: 0, lastActivity: '', securityFindingsCount: 0);
  final List<SecurityFinding> mockFindings = const [];
  Future<ConnectionInfo> connect(ConnectionInfo info) async => info;
  void processUserPrompt(String prompt) {}
  void executeOperation(Operation operation) {}
  void fixSecurityFinding(SecurityFinding finding) {}
}
