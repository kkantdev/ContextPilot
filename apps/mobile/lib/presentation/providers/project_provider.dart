import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/protocol/websocket_client.dart';
import '../../domain/models/project_info.dart';
import 'connection_provider.dart';

final _emptyProject = ProjectInfo(id: '', name: 'Waiting for paired project', path: '', framework: 'Unknown', language: 'Unknown', currentBranch: 'Not a Git repository', totalFiles: 0, healthScore: 0, lastActivity: 'Connect to an agent', securityFindingsCount: 0);

class ProjectNotifier extends StateNotifier<ProjectInfo> {
  StreamSubscription<Map<String, dynamic>>? _sub;
  ProjectNotifier(WebSocketProtocolClient client) : super(_emptyProject) {
    _sub = client.messageStream.listen((msg) {
      if (msg['type'] != 'authenticated') return;
      final p = (msg['payload'] as Map<String, dynamic>? ?? {})['project'] as Map<String, dynamic>? ?? {};
      state = ProjectInfo(id: p['id'] as String? ?? '', name: p['name'] as String? ?? 'Unknown project', path: p['rootPath'] as String? ?? '', framework: p['framework'] as String? ?? 'Unknown', language: p['language'] as String? ?? 'Unknown', currentBranch: p['branch'] as String? ?? 'Not a Git repository', totalFiles: p['totalFiles'] as int? ?? 0, healthScore: 0, lastActivity: 'Paired now', securityFindingsCount: 0);
    });
  }
  void refreshProject() {}
  @override void dispose() { _sub?.cancel(); super.dispose(); }
}
final projectProvider = StateNotifierProvider<ProjectNotifier, ProjectInfo>((ref) => ProjectNotifier(ref.watch(wsClientProvider)));
