import 'package:flutter/material.dart' hide ConnectionState;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/connection_info.dart';
import '../providers/connection_provider.dart';
import 'main_navigation_screen.dart';
import 'qr_scanner_screen.dart';

class ConnectScreen extends ConsumerStatefulWidget {
  const ConnectScreen({super.key});

  @override
  ConsumerState<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends ConsumerState<ConnectScreen> {
  final TextEditingController _hostController = TextEditingController();
  final TextEditingController _portController = TextEditingController(
    text: '8080',
  );
  final TextEditingController _tokenController = TextEditingController();

  bool _isConnecting = false;

  void _onScanPressed() async {
    final ConnectionInfo? result = await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const QrScannerScreen()));

    if (result != null) {
      _connectWithInfo(result);
    }
  }

  void _connectWithInfo(ConnectionInfo info) async {
    setState(() => _isConnecting = true);

    final success = await ref.read(connectionProvider.notifier).connect(info);

    setState(() => _isConnecting = false);

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
      );
    }
  }

  void _manualConnect() {
    final info = ConnectionInfo(
      host: _hostController.text.trim(),
      port: int.tryParse(_portController.text.trim()) ?? 8080,
      pairingToken: _tokenController.text.trim(),
      protocolVersion: '1.0',
      agentName: 'Laptop Agent',
      projectId: '',
      projectName: '',
      status: ConnectionStatus.connecting,
    );
    _connectWithInfo(info);
  }

  @override
  Widget build(BuildContext context) {
    final connectionState = ref.watch(connectionProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Connect to Laptop'), centerTitle: true),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (connectionState.info.status == ConnectionStatus.connecting ||
                  connectionState.info.status ==
                      ConnectionStatus.reconnecting ||
                  connectionState.errorMessage != null) ...[
                _buildConnectionStatusBanner(connectionState),
                const SizedBox(height: 16),
              ],
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.qr_code_scanner_rounded,
                        size: 48,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Scan Laptop QR Code',
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Instantly pair your phone with the ContextPilot Laptop Agent running on LAN.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _isConnecting ? null : _onScanPressed,
                        icon: const Icon(Icons.camera_alt_rounded),
                        label: const Text('Scan QR Code'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Laptop Network Address',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: TextField(
                              controller: _hostController,
                              style: GoogleFonts.firaCode(fontSize: 13),
                              decoration: InputDecoration(
                                labelText: 'Host IP',
                                isDense: true,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            flex: 2,
                            child: TextField(
                              controller: _portController,
                              style: GoogleFonts.firaCode(fontSize: 13),
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Port',
                                isDense: true,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _tokenController,
                        style: GoogleFonts.firaCode(fontSize: 13),
                        decoration: InputDecoration(
                          labelText: 'Pairing Token',
                          isDense: true,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _isConnecting ? null : _manualConnect,
                          icon: _isConnecting
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.primary,
                                  ),
                                )
                              : const Icon(Icons.link_rounded),
                          label: Text(
                            _isConnecting ? 'Connecting...' : 'Connect via IP',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConnectionStatusBanner(ConnectionState connectionState) {
    final reconnecting =
        connectionState.info.status == ConnectionStatus.reconnecting;
    final message =
        connectionState.errorMessage ??
        (reconnecting ? 'Connection lost. Reconnecting...' : 'Connecting...');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (reconnecting ? Colors.red : Colors.orange).withOpacity(0.16),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: reconnecting ? Colors.red : Colors.orange),
      ),
      child: Row(
        children: [
          const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(message)),
          if (connectionState.errorMessage != null)
            TextButton(
              onPressed: _isConnecting ? null : _manualConnect,
              child: const Text('Retry'),
            ),
        ],
      ),
    );
  }
}
