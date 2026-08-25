import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/operation.dart';

import '../providers/chat_provider.dart';
import '../providers/connection_provider.dart';
import '../providers/operation_provider.dart';
import '../providers/project_provider.dart';
import '../widgets/status_badge.dart';

import 'approval_screen.dart';

class HomeScreen extends ConsumerWidget {
  final Function(int) onNavigateTab;

  const HomeScreen({super.key, required this.onNavigateTab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectionState = ref.watch(connectionProvider);
    final project = ref.watch(projectProvider);
    final operationState = ref.watch(operationProvider);

    final pendingApprovalOp = operationState.history.firstWhere(
      (op) => op.status == OperationStatus.awaitingApproval,
      orElse: () => operationState.history.firstWhere(
        (op) => op.status == OperationStatus.running,
        orElse: () => operationState.history.isNotEmpty
            ? operationState.history.first
            : _getDummyOp(),
      ),
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.terminal_rounded,
                          color: AppColors.primary,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'ContextPilot',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  StatusBadge(status: connectionState.info.status),
                ],
              ),
              const SizedBox(height: 20),

              // Project Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              project.framework,
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          Row(
                            children: [
                              const Icon(
                                Icons.fork_right_rounded,
                                size: 16,
                                color: AppColors.accent,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                project.currentBranch,
                                style: GoogleFonts.firaCode(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        project.name,
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        project.path,
                        style: GoogleFonts.firaCode(
                          fontSize: 11,
                          color: AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildStatItem(
                            'Health Score',
                            '${project.healthScore}%',
                            AppColors.success,
                          ),
                          _buildStatItem(
                            'Files',
                            '${project.totalFiles}',
                            AppColors.textPrimary,
                          ),
                          _buildStatItem(
                            'Security',
                            '${project.securityFindingsCount} Issues',
                            AppColors.warning,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Action Required Banner if pending approval
              if (pendingApprovalOp.status ==
                      OperationStatus.awaitingApproval &&
                  pendingApprovalOp.approvalRequest != null)
                GestureDetector(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ApprovalScreen(
                          approvalRequest: pendingApprovalOp.approvalRequest!,
                          operation: pendingApprovalOp,
                        ),
                      ),
                    );
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: AppColors.warning.withOpacity(0.5),
                        width: 1.5,
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.shield_outlined,
                          color: AppColors.warning,
                          size: 28,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Approval Required',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.warning,
                                ),
                              ),
                              Text(
                                pendingApprovalOp.title,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.arrow_forward_ios_rounded,
                          size: 14,
                          color: AppColors.warning,
                        ),
                      ],
                    ),
                  ),
                ),

              // Primary Prompt Action
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => onNavigateTab(1), // Navigate to Ask Tab
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: AppColors.primary,
                  ),
                  icon: const Icon(Icons.auto_awesome_rounded),
                  label: const Text('Ask ContextPilot'),
                ),
              ),
              const SizedBox(height: 24),

              // Quick Actions
              Text(
                'Quick Developer Actions',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 2.2,
                children: [
                  _buildQuickActionTile(
                    context,
                    ref,
                    title: 'Create Feature',
                    icon: Icons.code_rounded,
                    color: AppColors.primary,
                    onTap: () {
                      ref
                          .read(chatProvider.notifier)
                          .sendMessage('Create a new feature for this project');
                      onNavigateTab(1);
                    },
                  ),
                  _buildQuickActionTile(
                    context,
                    ref,
                    title: 'Run Unit Tests',
                    icon: Icons.play_circle_outline_rounded,
                    color: AppColors.success,
                    onTap: () {
                      ref
                          .read(chatProvider.notifier)
                          .sendMessage('Run project unit tests');
                      onNavigateTab(1);
                    },
                  ),
                  _buildQuickActionTile(
                    context,
                    ref,
                    title: 'Security Scan',
                    icon: Icons.security_rounded,
                    color: AppColors.warning,
                    onTap: () {
                      ref
                          .read(chatProvider.notifier)
                          .sendMessage('Run a security scan on the codebase');
                      onNavigateTab(1);
                    },
                  ),
                  _buildQuickActionTile(
                    context,
                    ref,
                    title: 'Analyze Health',
                    icon: Icons.analytics_rounded,
                    color: AppColors.accent,
                    onTap: () {
                      ref
                          .read(chatProvider.notifier)
                          .sendMessage(
                            'Analyze project health and code quality',
                          );
                      onNavigateTab(1);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Recent Activity
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recent Activity',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  TextButton(
                    onPressed: () => onNavigateTab(2),
                    child: Text(
                      'View All',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              if (operationState.history.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Center(
                      child: Text(
                        'No recent operations yet.',
                        style: GoogleFonts.inter(color: AppColors.textMuted),
                      ),
                    ),
                  ),
                )
              else
                ...operationState.history
                    .take(3)
                    .map(
                      (op) => Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: _getOperationIcon(op.status),
                          title: Text(
                            op.title,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          subtitle: Text(
                            '${op.steps.where((s) => s.status == StepStatus.completed).length}/${op.steps.length} steps completed',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          trailing: const Icon(
                            Icons.chevron_right_rounded,
                            color: AppColors.textMuted,
                          ),
                          onTap: () => onNavigateTab(2),
                        ),
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color valueColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionTile(
    BuildContext context,
    WidgetRef ref, {
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border, width: 1),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _getOperationIcon(OperationStatus status) {
    switch (status) {
      case OperationStatus.completed:
        return const Icon(
          Icons.check_circle_rounded,
          color: AppColors.success,
          size: 22,
        );
      case OperationStatus.running:
        return const Icon(
          Icons.sync_rounded,
          color: AppColors.primary,
          size: 22,
        );
      case OperationStatus.awaitingApproval:
        return const Icon(
          Icons.shield_rounded,
          color: AppColors.warning,
          size: 22,
        );
      case OperationStatus.failed:
        return const Icon(
          Icons.cancel_rounded,
          color: AppColors.danger,
          size: 22,
        );
      default:
        return const Icon(
          Icons.hourglass_empty_rounded,
          color: AppColors.textMuted,
          size: 22,
        );
    }
  }

  Operation _getDummyOp() {
    return Operation(
      id: 'dummy',
      title: 'No operations pending',
      prompt: '',
      status: OperationStatus.completed,
      riskLevel: RiskLevel.safe,
      steps: [],
      startTime: DateTime.now(),
    );
  }
}
