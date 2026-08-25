import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../../domain/models/connection_info.dart';

class QrPayloadException implements Exception {
  final String message;
  QrPayloadException(this.message);

  @override
  String toString() => 'QrPayloadException: $message';
}

class QrParser {
  static ConnectionInfo parse(String rawPayload) {
    debugPrint('[QrParser] Raw Scanned String: $rawPayload');

    try {
      final Map<String, dynamic> json = jsonDecode(rawPayload);

      final host = (json['host'] ?? '').toString().trim();
      final pairingToken = (json['pairingToken'] ?? '').toString().trim();

      if (host.isEmpty || pairingToken.isEmpty) {
        throw QrPayloadException(
          'Missing required pairing fields (host or pairingToken)',
        );
      }

      int port = 8765;
      if (json['port'] is int) {
        port = json['port'] as int;
      } else if (json['port'] != null) {
        port = int.tryParse(json['port'].toString()) ?? 8765;
      }

      final info = ConnectionInfo(
        host: host,
        port: port,
        pairingToken: pairingToken,
        protocolVersion: (json['protocolVersion'] ?? '1.0').toString(),
        agentName: (json['agentName'] ?? 'Laptop Agent').toString(),
        projectId: (json['projectId'] ?? 'project_default').toString(),
        projectName: (json['projectName'] ?? 'ContextPilot Project').toString(),
        isSecure: json['isSecure'] == true,
      );

      debugPrint(
        '[QrParser] Successfully Parsed ConnectionInfo: '
        'host=${info.host}, port=${info.port}, pairingToken=${info.pairingToken}, '
        'projectId=${info.projectId}, projectName=${info.projectName}',
      );

      return info;
    } catch (e) {
      debugPrint('[QrParser] Error parsing payload: $e');
      if (e is QrPayloadException) rethrow;
      throw QrPayloadException(
        'Invalid QR JSON payload format: ${e.toString()}',
      );
    }
  }
}
