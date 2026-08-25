import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';

class StatusBadge extends StatelessWidget {
  final ConnectionStatus status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _getStatusConfig(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: config.color.withValues(alpha: 0.4), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: config.color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            config.label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: config.color,
            ),
          ),
        ],
      ),
    );
  }

  _StatusConfig _getStatusConfig(ConnectionStatus status) {
    switch (status) {
      case ConnectionStatus.connected:
        return _StatusConfig('Connected', AppColors.success);
      case ConnectionStatus.connecting:
        return _StatusConfig('Connecting...', AppColors.warning);
      case ConnectionStatus.pairing:
        return _StatusConfig('Pairing...', AppColors.primary);
      case ConnectionStatus.reconnecting:
        return _StatusConfig('Reconnecting', AppColors.warning);
      case ConnectionStatus.disconnected:
        return _StatusConfig('Disconnected', AppColors.textMuted);
      case ConnectionStatus.pairingFailed:
        return _StatusConfig('Pairing Failed', AppColors.danger);
      case ConnectionStatus.agentUnavailable:
        return _StatusConfig('Agent Offline', AppColors.danger);
      case ConnectionStatus.protocolMismatch:
        return _StatusConfig('Protocol Mismatch', AppColors.danger);
    }
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  _StatusConfig(this.label, this.color);
}
