import 'operation.dart';

enum MessageType {
  userPrompt,
  aiExplanation,
  aiPlan,
  aiAction,
  aiResult,
  systemNotification,
}

class ChatMessage {
  final String id;
  final String text;
  final MessageType type;
  final DateTime timestamp;
  final String? relatedOperationId;
  final Operation? operation;

  ChatMessage({
    required this.id,
    required this.text,
    required this.type,
    required this.timestamp,
    this.relatedOperationId,
    this.operation,
  });
}
