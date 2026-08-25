import '../../core/constants/app_constants.dart';
import 'approval_request.dart';
import 'file_change.dart';

enum StepStatus { pending, running, completed, failed }

/// Represents a single line of terminal output from a streaming command
class TerminalOutputLine {
  final String stream; // 'stdout' or 'stderr'
  final String data;
  final DateTime timestamp;

  TerminalOutputLine({
    required this.stream,
    required this.data,
    required this.timestamp,
  });

  TerminalOutputLine.fromJson(Map<String, dynamic> json)
    : stream = json['stream'] as String? ?? 'stdout',
      data = json['data'] as String? ?? '',
      timestamp = DateTime.now();

  Map<String, dynamic> toJson() => {
    'stream': stream,
    'data': data,
    'timestamp': timestamp.toIso8601String(),
  };
}

class OperationStep {
  final String id;
  final String title;
  final StepStatus status;
  final String? detail;
  final DateTime? completedAt;

  OperationStep({
    required this.id,
    required this.title,
    this.status = StepStatus.pending,
    this.detail,
    this.completedAt,
  });

  OperationStep copyWith({
    String? id,
    String? title,
    StepStatus? status,
    String? detail,
    DateTime? completedAt,
  }) {
    return OperationStep(
      id: id ?? this.id,
      title: title ?? this.title,
      status: status ?? this.status,
      detail: detail ?? this.detail,
      completedAt: completedAt ?? this.completedAt,
    );
  }
}

class Operation {
  final String id;
  final String title;
  final String prompt;
  final OperationStatus status;
  final RiskLevel riskLevel;
  final List<OperationStep> steps;
  final List<FileChange> changedFiles;
  final ApprovalRequest? approvalRequest;
  final DateTime startTime;
  final DateTime? endTime;
  final String? errorSummary;
  final List<String> logs;

  // ── Streaming Terminal Output ─────────────────────────────────────────
  final String? commandText;
  final List<TerminalOutputLine> terminalOutput;
  final int? exitCode;
  final bool isStreamingCommand;

  Operation({
    required this.id,
    required this.title,
    required this.prompt,
    required this.status,
    required this.riskLevel,
    required this.steps,
    this.changedFiles = const [],
    this.approvalRequest,
    required this.startTime,
    this.endTime,
    this.errorSummary,
    this.logs = const [],
    this.commandText,
    this.terminalOutput = const [],
    this.exitCode,
    this.isStreamingCommand = false,
  });

  Operation copyWith({
    String? id,
    String? title,
    String? prompt,
    OperationStatus? status,
    RiskLevel? riskLevel,
    List<OperationStep>? steps,
    List<FileChange>? changedFiles,
    ApprovalRequest? approvalRequest,
    DateTime? startTime,
    DateTime? endTime,
    String? errorSummary,
    List<String>? logs,
    String? commandText,
    List<TerminalOutputLine>? terminalOutput,
    int? exitCode,
    bool? isStreamingCommand,
  }) {
    return Operation(
      id: id ?? this.id,
      title: title ?? this.title,
      prompt: prompt ?? this.prompt,
      status: status ?? this.status,
      riskLevel: riskLevel ?? this.riskLevel,
      steps: steps ?? this.steps,
      changedFiles: changedFiles ?? this.changedFiles,
      approvalRequest: approvalRequest ?? this.approvalRequest,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      errorSummary: errorSummary ?? this.errorSummary,
      logs: logs ?? this.logs,
      commandText: commandText ?? this.commandText,
      terminalOutput: terminalOutput ?? this.terminalOutput,
      exitCode: exitCode ?? this.exitCode,
      isStreamingCommand: isStreamingCommand ?? this.isStreamingCommand,
    );
  }

  /// Helper to append a new terminal output line
  Operation addTerminalOutput(String stream, String data) {
    final newLine = TerminalOutputLine(
      stream: stream,
      data: data,
      timestamp: DateTime.now(),
    );
    return copyWith(terminalOutput: [...terminalOutput, newLine]);
  }

  /// Helper to get all stdout content as a single string
  String get stdoutContent {
    return terminalOutput
        .where((line) => line.stream == 'stdout')
        .map((line) => line.data)
        .join();
  }

  /// Helper to get all stderr content as a single string
  String get stderrContent {
    return terminalOutput
        .where((line) => line.stream == 'stderr')
        .map((line) => line.data)
        .join();
  }

  /// Helper to get combined terminal output as a single string
  String get allTerminalContent {
    return terminalOutput.map((line) => line.data).join();
  }
}
