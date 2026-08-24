import '../../core/constants/app_constants.dart';

class SecurityFinding {
  final String id;
  final String title;
  final FindingSeverity severity;
  final String filePath;
  final int lineNumber;
  final String explanation;
  final String recommendedFix;
  final String patchSnippet;
  final bool isFixed;

  SecurityFinding({
    required this.id,
    required this.title,
    required this.severity,
    required this.filePath,
    required this.lineNumber,
    required this.explanation,
    required this.recommendedFix,
    required this.patchSnippet,
    this.isFixed = false,
  });

  SecurityFinding copyWith({
    String? id,
    String? title,
    FindingSeverity? severity,
    String? filePath,
    int? lineNumber,
    String? explanation,
    String? recommendedFix,
    String? patchSnippet,
    bool? isFixed,
  }) {
    return SecurityFinding(
      id: id ?? this.id,
      title: title ?? this.title,
      severity: severity ?? this.severity,
      filePath: filePath ?? this.filePath,
      lineNumber: lineNumber ?? this.lineNumber,
      explanation: explanation ?? this.explanation,
      recommendedFix: recommendedFix ?? this.recommendedFix,
      patchSnippet: patchSnippet ?? this.patchSnippet,
      isFixed: isFixed ?? this.isFixed,
    );
  }
}
