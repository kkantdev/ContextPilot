import '../../core/constants/app_constants.dart';
import 'file_change.dart';

class ApprovalRequest {
  final String id;
  final String operationId;
  final String title;
  final String description;
  final RiskLevel riskLevel;
  final List<FileChange> affectedFiles;
  final List<String> commandsToExecute;
  final DateTime timestamp;

  ApprovalRequest({
    required this.id,
    required this.operationId,
    required this.title,
    required this.description,
    required this.riskLevel,
    required this.affectedFiles,
    required this.commandsToExecute,
    required this.timestamp,
  });
}
