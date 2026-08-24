import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/mock/mock_agent_service.dart';
import '../../domain/models/security_finding.dart';
import 'connection_provider.dart';
import 'project_provider.dart';

class SecurityNotifier extends StateNotifier<List<SecurityFinding>> {
  final MockAgentService _mockService;
  final Ref _ref;

  SecurityNotifier(this._mockService, this._ref)
    : super(_mockService.mockFindings);

  void fixFinding(SecurityFinding finding) {
    _mockService.fixSecurityFinding(finding);
    state = List<SecurityFinding>.from(_mockService.mockFindings);
    _ref.read(projectProvider.notifier).refreshProject();
  }

  void refreshFindings() {
    state = List<SecurityFinding>.from(_mockService.mockFindings);
  }
}

final securityProvider =
    StateNotifierProvider<SecurityNotifier, List<SecurityFinding>>((ref) {
      final mockService = ref.watch(mockAgentServiceProvider);
      return SecurityNotifier(mockService, ref);
    });
