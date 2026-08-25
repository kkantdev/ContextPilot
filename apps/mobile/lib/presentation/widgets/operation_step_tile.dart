import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_theme.dart';
import '../../domain/models/operation.dart';

class OperationStepTile extends StatelessWidget {
  final OperationStep step;

  const OperationStepTile({super.key, required this.step});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          _buildStatusIcon(),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: step.status == StepStatus.running
                        ? FontWeight.bold
                        : FontWeight.w500,
                    color: step.status == StepStatus.pending
                        ? AppColors.textMuted
                        : AppColors.textPrimary,
                  ),
                ),
                if (step.detail != null)
                  Text(
                    step.detail!,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIcon() {
    switch (step.status) {
      case StepStatus.completed:
        return Container(
          padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            color: AppColors.success,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check, size: 12, color: Colors.white),
        );
      case StepStatus.running:
        return const SpinKitRing(
          color: AppColors.primary,
          size: 18,
          lineWidth: 2.5,
        );
      case StepStatus.failed:
        return Container(
          padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            color: AppColors.danger,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.close, size: 12, color: Colors.white),
        );
      case StepStatus.pending:
        return Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.border, width: 2),
          ),
        );
    }
  }
}
