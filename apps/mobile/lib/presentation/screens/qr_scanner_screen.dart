import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/theme/app_theme.dart';
import '../../data/protocol/qr_parser.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen>
    with WidgetsBindingObserver {
  late final MobileScannerController _controller;
  bool _hasScanned = false;
  bool _isStarting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = MobileScannerController(
      autoStart: false,
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initCamera();
    });
  }

  Future<void> _initCamera() async {
    if (_isStarting || _hasScanned) return;
    if (mounted) setState(() => _isStarting = true);

    try {
      final permission = await Permission.camera.status;
      if (!permission.isGranted) {
        final requested = await Permission.camera.request();
        if (!requested.isGranted) {
          throw MobileScannerException(
            errorCode: MobileScannerErrorCode.permissionDenied,
            errorDetails: MobileScannerErrorDetails(
              message: 'Camera permission denied by user',
            ),
          );
        }
        await Future.delayed(const Duration(milliseconds: 300));
      }

      await _controller.start();

      // Add 100ms delay after camera start to ensure camera is fully ready
      await Future.delayed(const Duration(milliseconds: 100));

      // Verify camera is actually running after permission grant
      if (!_controller.value.isInitialized || !_controller.value.isRunning) {
        throw MobileScannerException(
          errorCode: MobileScannerErrorCode.genericError,
          errorDetails: MobileScannerErrorDetails(
            message: 'Camera failed to initialize properly',
          ),
        );
      }
    } on MobileScannerException catch (e) {
      debugPrint('[QrScannerScreen] Camera start error: $e');
      // Re-throw MobileScannerException so error state can handle it properly
      if (mounted) {
        setState(() {});
      }
      rethrow;
    } catch (e) {
      debugPrint('[QrScannerScreen] Camera start error: $e');
      if (mounted) {
        setState(() {});
      }
    } finally {
      if (mounted) {
        setState(() => _isStarting = false);
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.paused) {
      if (_controller.value.isInitialized) {
        _controller.stop();
      }
    } else if (state == AppLifecycleState.resumed) {
      // Always attempt restart on resume if not already scanned and not running
      if (!_hasScanned && !_controller.value.isRunning) {
        _initCamera();
      }
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned) return;
    final barcode = capture.barcodes.firstOrNull;
    final rawValue = barcode?.rawValue;
    if (rawValue == null || rawValue.isEmpty) return;

    _hasScanned = true;
    _controller.stop();
    _onPayloadReceived(rawValue);
  }

  void _onPayloadReceived(String rawJson) {
    try {
      final connectionInfo = QrParser.parse(rawJson);
      if (!mounted) return;
      Navigator.of(context).pop(connectionInfo);
    } catch (e) {
      setState(() => _hasScanned = false);
      _initCamera();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            'Invalid QR code format. Make sure you scan a ContextPilot pairing code.',
          ),
          backgroundColor: AppColors.danger,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }


  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Scan QR Code'),
        actions: [
          ValueListenableBuilder(
            valueListenable: _controller,
            builder: (context, state, child) {
              return IconButton(
                tooltip: 'Toggle torch',
                icon: Icon(
                  state.torchState == TorchState.on
                      ? Icons.flash_on_rounded
                      : Icons.flash_off_rounded,
                  color: state.torchState == TorchState.on
                      ? AppColors.primary
                      : AppColors.textSecondary,
                ),
                onPressed: state.isInitialized
                    ? () => _controller.toggleTorch()
                    : null,
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  MobileScanner(
                    controller: _controller,
                    onDetect: _onDetect,
                    errorBuilder: (context, error) {
                      return _buildCameraErrorState(error);
                    },
                    placeholderBuilder: (context) {
                      return Container(
                        color: AppColors.background,
                        child: const Center(
                          child: CircularProgressIndicator(
                            color: AppColors.primary,
                          ),
                        ),
                      );
                    },
                  ),
                  _buildScanOverlay(),
                  if (_hasScanned)
                    Container(
                      color: Colors.black45,
                      child: const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(color: AppColors.success),
                            SizedBox(height: 16),
                            Text(
                              'Connecting…',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Pairing Instructions',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Run "npx contextpilot start" on your laptop CLI to generate a pairing QR code.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      height: 1.4,
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

  Widget _buildCameraErrorState(MobileScannerException error) {
    final isPermissionDenied =
        error.errorCode == MobileScannerErrorCode.permissionDenied;
    final isUnsupported = error.errorCode == MobileScannerErrorCode.unsupported;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isPermissionDenied
                  ? Icons.camera_alt_outlined
                  : isUnsupported
                  ? Icons.camera_enhance_outlined
                  : Icons.videocam_off_rounded,
              size: 64,
              color: AppColors.danger,
            ),
            const SizedBox(height: 16),
            Text(
              isPermissionDenied
                  ? 'Camera Permission Required'
                  : isUnsupported
                  ? 'Camera Unsupported'
                  : 'Camera Access Needed',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isPermissionDenied
                  ? 'ContextPilot needs camera permission to scan the QR code.\nPlease grant permission or tap Start Camera below.'
                  : isUnsupported
                  ? 'No physical camera detected on this device or emulator.'
                  : 'Tap "Start Camera" below to grant permissions and open the camera viewer.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            if (!isUnsupported)
              ElevatedButton.icon(
                onPressed: () async {
                  if (isPermissionDenied) {
                    // For permission denied, try to open app settings
                    final opened = await openAppSettings();
                    if (!opened) {
                      // If settings couldn't be opened, try init camera again
                      _initCamera();
                    }
                  } else {
                    // For other errors, just try to init camera again
                    _initCamera();
                  }
                },
                icon: Icon(
                  isPermissionDenied
                      ? Icons.settings_rounded
                      : Icons.camera_alt_rounded,
                ),
                label: Text(
                  isPermissionDenied
                      ? 'Grant Permission'
                      : 'Start Camera / Grant Permission',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildScanOverlay() {
    return CustomPaint(
      size: const Size(double.infinity, double.infinity),
      painter: _ScanOverlayPainter(frameSize: 240),
    );
  }
}

class _ScanOverlayPainter extends CustomPainter {
  final double frameSize;

  _ScanOverlayPainter({required this.frameSize});

  @override
  void paint(Canvas canvas, Size size) {
    final overlayPaint = Paint()..color = Colors.black.withOpacity(0.55);
    final clearPaint = Paint()..blendMode = BlendMode.clear;
    final framePaint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    // Dark overlay
    canvas.saveLayer(Offset.zero & size, Paint());
    canvas.drawRect(Offset.zero & size, overlayPaint);

    // Clear frame cut-out
    final frameRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2 - 40),
      width: frameSize,
      height: frameSize,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(frameRect, const Radius.circular(16)),
      clearPaint,
    );
    canvas.restore();

    // Frame border
    canvas.drawRRect(
      RRect.fromRectAndRadius(frameRect, const Radius.circular(16)),
      framePaint,
    );

    // Corner accents
    const cornerLen = 28.0;
    final cp = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    // Top-left
    canvas.drawLine(
      frameRect.topLeft,
      frameRect.topLeft + const Offset(cornerLen, 0),
      cp,
    );
    canvas.drawLine(
      frameRect.topLeft,
      frameRect.topLeft + const Offset(0, cornerLen),
      cp,
    );
    // Top-right
    canvas.drawLine(
      frameRect.topRight,
      frameRect.topRight + const Offset(-cornerLen, 0),
      cp,
    );
    canvas.drawLine(
      frameRect.topRight,
      frameRect.topRight + const Offset(0, cornerLen),
      cp,
    );
    // Bottom-left
    canvas.drawLine(
      frameRect.bottomLeft,
      frameRect.bottomLeft + const Offset(cornerLen, 0),
      cp,
    );
    canvas.drawLine(
      frameRect.bottomLeft,
      frameRect.bottomLeft + const Offset(0, -cornerLen),
      cp,
    );
    // Bottom-right
    canvas.drawLine(
      frameRect.bottomRight,
      frameRect.bottomRight + const Offset(-cornerLen, 0),
      cp,
    );
    canvas.drawLine(
      frameRect.bottomRight,
      frameRect.bottomRight + const Offset(0, -cornerLen),
      cp,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
