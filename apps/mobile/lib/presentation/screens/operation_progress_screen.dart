import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/operation.dart';
import '../providers/operation_provider.dart';
import '../widgets/risk_chip.dart';

class OperationProgressScreen extends ConsumerStatefulWidget {
  final Operation operation;

  const OperationProgressScreen({super.key, required this.operation});

  @override
  ConsumerState<OperationProgressScreen> createState() =>
      _OperationProgressScreenState();
}

class _OperationProgressScreenState
    extends ConsumerState<OperationProgressScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _autoScroll = true;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_autoScroll && _scrollController.hasClients) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 100),
          curve: Curves.easeOut,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final operationState = ref.watch(operationProvider);

    // Read current live updated operation if matching ID
    final liveOp = operationState.history.firstWhere(
      (op) => op.id == widget.operation.id,
      orElse: () => widget.operation,
    );

    // Auto-scroll when new terminal output arrives
    if (liveOp.isStreamingCommand && liveOp.terminalOutput.isNotEmpty) {
      _scrollToBottom();
    }

    final isRunning = liveOp.status == OperationStatus.running;
    final canCancel = isRunning && liveOp.isStreamingCommand;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          liveOp.isStreamingCommand ? 'Live Terminal' : 'Operation Progress',
        ),
        actions: [
          if (canCancel)
            IconButton(
              onPressed: () {
                ref.read(operationProvider.notifier).cancelOperation(liveOp);
              },
              icon: const Icon(Icons.stop, color: AppColors.danger),
              tooltip: 'Cancel Command',
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Header with status and command info
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStatusBadge(liveOp.status),
                      RiskChip(riskLevel: liveOp.riskLevel),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (liveOp.isStreamingCommand &&
                      liveOp.commandText != null) ...[
                    Text(
                      'Command:',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.terminal,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              liveOp.commandText!,
                              style: GoogleFonts.firaCode(
                                fontSize: 14,
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    Text(
                      liveOp.title,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                  if (liveOp.exitCode != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Exit Code: ${liveOp.exitCode}',
                      style: GoogleFonts.firaCode(
                        fontSize: 12,
                        color: liveOp.exitCode == 0
                            ? AppColors.success
                            : AppColors.danger,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Terminal output area
            Expanded(
              child: liveOp.isStreamingCommand
                  ? _buildTerminalOutput(liveOp)
                  : _buildOperationSteps(liveOp),
            ),

            // Auto-scroll toggle and bottom actions
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                children: [
                  if (liveOp.isStreamingCommand) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Switch(
                              value: _autoScroll,
                              onChanged: (value) {
                                setState(() {
                                  _autoScroll = value;
                                });
                              },
                              activeColor: AppColors.primary,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Auto-scroll',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                        if (canCancel)
                          OutlinedButton.icon(
                            onPressed: () {
                              ref
                                  .read(operationProvider.notifier)
                                  .cancelOperation(liveOp);
                            },
                            icon: const Icon(Icons.stop, size: 16),
                            label: const Text('Cancel'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.danger,
                              side: const BorderSide(color: AppColors.danger),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        liveOp.status == OperationStatus.completed
                            ? 'Done'
                            : liveOp.status == OperationStatus.failed
                            ? 'Back (Failed)'
                            : liveOp.status == OperationStatus.cancelled
                            ? 'Back (Cancelled)'
                            : 'Back to Control Center',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTerminalOutput(Operation operation) {
    if (operation.terminalOutput.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (operation.status == OperationStatus.running) ...[
              const CircularProgressIndicator(color: AppColors.primary),
              const SizedBox(height: 16),
              Text(
                'Waiting for command output...',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
            ] else ...[
              const Icon(Icons.terminal, size: 48, color: AppColors.textMuted),
              const SizedBox(height: 16),
              Text(
                'No output received',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      color: AppColors.background,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: operation.terminalOutput.length,
        itemBuilder: (context, index) {
          final line = operation.terminalOutput[index];
          final isStderr = line.stream == 'stderr';

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 1),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Stream indicator
                Container(
                  width: 4,
                  height: 20,
                  decoration: BoxDecoration(
                    color: isStderr ? AppColors.danger : AppColors.success,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                // Output text
                Expanded(
                  child: SelectableText(
                    line.data,
                    style: GoogleFonts.firaCode(
                      fontSize: 13,
                      color: isStderr
                          ? AppColors.danger.withOpacity(0.9)
                          : AppColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildOperationSteps(Operation operation) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Execution Steps',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          ...operation.steps.map(
            (step) => Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    _buildStepIcon(step.status),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            step.title,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (step.detail != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              step.detail!,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (operation.errorSummary != null) ...[
            const SizedBox(height: 16),
            Card(
              color: AppColors.danger.withOpacity(0.1),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.error, color: AppColors.danger, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        operation.errorSummary!,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: AppColors.danger,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStepIcon(StepStatus status) {
    switch (status) {
      case StepStatus.pending:
        return const Icon(
          Icons.radio_button_unchecked,
          color: AppColors.textMuted,
          size: 20,
        );
      case StepStatus.running:
        return const SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.primary,
          ),
        );
      case StepStatus.completed:
        return const Icon(
          Icons.check_circle,
          color: AppColors.success,
          size: 20,
        );
      case StepStatus.failed:
        return const Icon(Icons.error, color: AppColors.danger, size: 20);
    }
  }

  Widget _buildStatusBadge(OperationStatus status) {
    String label;
    Color color;
    IconData? icon;

    switch (status) {
      case OperationStatus.running:
        label = 'RUNNING';
        color = AppColors.primary;
        icon = Icons.play_arrow;
        break;
      case OperationStatus.completed:
        label = 'COMPLETED';
        color = AppColors.success;
        icon = Icons.check;
        break;
      case OperationStatus.failed:
        label = 'FAILED';
        color = AppColors.danger;
        icon = Icons.error;
        break;
      case OperationStatus.cancelled:
        label = 'CANCELLED';
        color = AppColors.warning;
        icon = Icons.stop;
        break;
      case OperationStatus.awaitingApproval:
        label = 'AWAITING APPROVAL';
        color = AppColors.warning;
        icon = Icons.pending;
        break;
      default:
        label = status.name.toUpperCase();
        color = AppColors.textMuted;
        icon = Icons.info;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
