import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../providers/security_provider.dart';
import 'security_detail_screen.dart';

class SecurityScreen extends ConsumerWidget {
  const SecurityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final findings = ref.watch(securityProvider);
    final unfixed = findings.where((f) => !f.isFixed).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Security & Code Health')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Overview Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: unfixed.isEmpty
                              ? AppColors.success.withOpacity(0.15)
                              : AppColors.danger.withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Icon(
                            unfixed.isEmpty
                                ? Icons.verified_user_rounded
                                : Icons.gpp_maybe_rounded,
                            size: 32,
                            color: unfixed.isEmpty
                                ? AppColors.success
                                : AppColors.danger,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              unfixed.isEmpty
                                  ? 'Project Clean'
                                  : '${unfixed.length} Vulnerabilities Found',
                              style: GoogleFonts.inter(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              unfixed.isEmpty
                                  ? 'No active security issues detected.'
                                  : 'Review findings below to apply fixes.',
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
                ),
              ),
              const SizedBox(height: 24),

              Text(
                'Security Findings (${findings.length})',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              ...findings.map(
                (finding) => Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(14),
                    title: Row(
                      children: [
                        _buildSeverityBadge(finding.severity),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            finding.title,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 6),
                        Text(
                          finding.filePath,
                          style: GoogleFonts.firaCode(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          finding.explanation,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    trailing: finding.isFixed
                        ? const Icon(
                            Icons.check_circle_rounded,
                            color: AppColors.success,
                            size: 20,
                          )
                        : const Icon(
                            Icons.chevron_right_rounded,
                            color: AppColors.textMuted,
                          ),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              SecurityDetailScreen(finding: finding),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSeverityBadge(FindingSeverity severity) {
    Color color = AppColors.warning;
    String label = 'HIGH';

    if (severity == FindingSeverity.critical) {
      color = AppColors.danger;
      label = 'CRITICAL';
    } else if (severity == FindingSeverity.medium) {
      color = AppColors.warning;
      label = 'MEDIUM';
    } else if (severity == FindingSeverity.low) {
      color = AppColors.info;
      label = 'LOW';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: GoogleFonts.jetBrainsMono(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}
