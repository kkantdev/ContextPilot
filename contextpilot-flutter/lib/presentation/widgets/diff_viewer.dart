import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_theme.dart';

class DiffViewer extends StatelessWidget {
  final String diffText;

  const DiffViewer({super.key, required this.diffText});

  @override
  Widget build(BuildContext context) {
    final lines = diffText.split('\n');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: lines.map((line) => _buildDiffLine(line)).toList(),
      ),
    );
  }

  Widget _buildDiffLine(String line) {
    Color lineBg = Colors.transparent;
    Color textColor = AppColors.textSecondary;

    if (line.startsWith('+')) {
      lineBg = AppColors.success.withOpacity(0.12);
      textColor = AppColors.success;
    } else if (line.startsWith('-')) {
      lineBg = AppColors.danger.withOpacity(0.12);
      textColor = AppColors.danger;
    } else if (line.startsWith('@@')) {
      textColor = AppColors.accent;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
      decoration: BoxDecoration(
        color: lineBg,
        borderRadius: BorderRadius.circular(2),
      ),
      child: Text(
        line,
        style: GoogleFonts.firaCode(fontSize: 12, color: textColor),
      ),
    );
  }
}
