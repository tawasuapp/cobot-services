import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../config/api_config.dart';
import '../models/job.dart';
import '../providers/job_provider.dart';
import '../services/api_service.dart';
import '../services/qr_service.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );

  bool _isProcessing = false;
  bool _torchEnabled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _getInstruction() {
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map && args['instruction'] != null) {
      return args['instruction'] as String;
    }
    return 'Point the camera at a QR code to scan';
  }

  Future<void> _handleIvdLogin(String sessionId) async {
    try {
      await ApiService().post(
        '/auth/ivd-approve',
        data: {'sessionId': sessionId},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('IVD connected successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to connect IVD: $e'),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    setState(() => _isProcessing = true);

    final rawData = barcode.rawValue!;

    // Check if this is an IVD login QR code
    try {
      final parsed = jsonDecode(rawData);
      if (parsed is Map && parsed['type'] == 'ivd_login') {
        await _handleIvdLogin(parsed['sessionId'] as String);
        return;
      }
    } catch (_) {
      // Not JSON or not IVD login — continue with normal QR flow
    }

    final result = QrService.parseQrData(rawData);

    if (!result.isValid) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.errorMessage ?? 'Invalid QR code'),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isProcessing = false);
      }
      return;
    }

    // Extract job and scanType from arguments
    // Arguments can be: Job, Map{job, scanType, instruction}, or null
    final args = ModalRoute.of(context)?.settings.arguments;
    Job? job;
    String? scanType;
    if (args is Job) {
      job = args;
    } else if (args is Map) {
      job = args['job'] as Job?;
      scanType = args['scanType'] as String?;
    }

    // Send to backend
    try {
      await ApiService().post(
        ApiConfig.qrScan,
        data: {
          'qrData': rawData,
          'jobId': job?.id,
          'scanType': scanType ?? result.type,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('QR verified successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        // Extract the actual error message from DioException
        String errorMsg = 'Failed to verify QR code';
        if (e is DioException && e.response?.data is Map) {
          errorMsg = e.response?.data['error'] ?? errorMsg;
        } else if (e is DioException) {
          errorMsg = e.message ?? errorMsg;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMsg),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR Code'),
        actions: [
          IconButton(
            icon: Icon(
              _torchEnabled ? Icons.flash_on : Icons.flash_off,
              color: Colors.white,
            ),
            onPressed: () {
              _controller.toggleTorch();
              setState(() => _torchEnabled = !_torchEnabled);
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),

          // Overlay with viewfinder
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 3),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),

          // Instruction text
          Positioned(
            bottom: 100,
            left: 0,
            right: 0,
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 40),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _getInstruction(),
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 14),
              ),
            ),
          ),

          // Processing indicator
          if (_isProcessing)
            Container(
              color: Colors.black45,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Verifying...',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
