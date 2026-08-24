import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';

class RiskChip extends StatelessWidget {
  final RiskLevel riskLevel;

  const RiskChip({super.key, required this.riskLevel});

  @override
  Widget build(BuildContext context) {
    final config = _getRiskConfig(riskLevel);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: config.bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: config.borderColor, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(config.icon, size: 14, color: config.textColor),
          const SizedBox(width: 5),
          Text(
            config.label,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: config.textColor,
            ),
          ),
        ],
      ),
    );
  }

  _RiskConfig _getRiskConfig(RiskLevel level) {
    switch (level) {
      case RiskLevel.safe:
        return _RiskConfig(
          label: 'SAFE',
          icon: Icons.check_circle_outline,
          textColor: AppColors.riskSafe,
          bgColor: AppColors.riskSafe.withValues(alpha: 0.12),
          borderColor: AppColors.riskSafe.withValues(alpha: 0.4),
        );
      case RiskLevel.review:
        return _RiskConfig(
          label: 'REVIEW REQUIRED',
          icon: Icons.warning_amber_rounded,
          textColor: AppColors.riskReview,
          bgColor: AppColors.riskReview.withValues(alpha: 0.12),
          borderColor: AppColors.riskReview.withValues(alpha: 0.4),
        );
      case RiskLevel.dangerous:
        return _RiskConfig(
          label: 'DANGEROUS ACTION',
          icon: Icons.error_outline,
          textColor: AppColors.riskDangerous,
          bgColor: AppColors.riskDangerous.withValues(alpha: 0.12),
          borderColor: AppColors.riskDangerous.withValues(alpha: 0.5),
        );
    }
  }
}

class _RiskConfig {
  final String label;
  final IconData icon;
  final Color textColor;
  final Color bgColor;
  final Color borderColor;

  _RiskConfig({
    required this.label,
    required this.icon,
    required this.textColor,
    required this.bgColor,
    required this.borderColor,
  });
}
