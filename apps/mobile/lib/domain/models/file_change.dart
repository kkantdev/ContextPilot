enum ChangeType { created, modified, deleted }

class FileChange {
  final String path;
  final String fileName;
  final ChangeType changeType;
  final int additions;
  final int deletions;
  final String? diffContent;

  FileChange({
    required this.path,
    required this.fileName,
    required this.changeType,
    required this.additions,
    required this.deletions,
    this.diffContent,
  });
}
