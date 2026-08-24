class ProjectInfo {
  final String id;
  final String name;
  final String path;
  final String framework;
  final String language;
  final String currentBranch;
  final int totalFiles;
  final double healthScore;
  final String lastActivity;
  final int securityFindingsCount;

  ProjectInfo({
    required this.id,
    required this.name,
    required this.path,
    required this.framework,
    required this.language,
    required this.currentBranch,
    required this.totalFiles,
    required this.healthScore,
    required this.lastActivity,
    required this.securityFindingsCount,
  });

  ProjectInfo copyWith({
    String? id,
    String? name,
    String? path,
    String? framework,
    String? language,
    String? currentBranch,
    int? totalFiles,
    double? healthScore,
    String? lastActivity,
    int? securityFindingsCount,
  }) {
    return ProjectInfo(
      id: id ?? this.id,
      name: name ?? this.name,
      path: path ?? this.path,
      framework: framework ?? this.framework,
      language: language ?? this.language,
      currentBranch: currentBranch ?? this.currentBranch,
      totalFiles: totalFiles ?? this.totalFiles,
      healthScore: healthScore ?? this.healthScore,
      lastActivity: lastActivity ?? this.lastActivity,
      securityFindingsCount:
          securityFindingsCount ?? this.securityFindingsCount,
    );
  }
}
