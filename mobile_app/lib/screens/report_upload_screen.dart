import 'dart:io';

import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../models/job.dart';
import '../services/api_service.dart';
import '../widgets/custom_button.dart';

class ReportUploadScreen extends StatefulWidget {
  const ReportUploadScreen({super.key});

  @override
  State<ReportUploadScreen> createState() => _ReportUploadScreenState();
}

class _ReportUploadScreenState extends State<ReportUploadScreen> {
  final _descriptionController = TextEditingController();
  String? _imagePath;
  bool _isUploading = false;
  double _uploadProgress = 0;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _captureImage() async {
    final result = await Navigator.of(context).pushNamed('/camera');
    if (result is String) {
      setState(() => _imagePath = result);
    }
  }

  Future<void> _uploadReport() async {
    if (_imagePath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please capture a photo first')),
      );
      return;
    }

    final job = ModalRoute.of(context)!.settings.arguments as Job;
    setState(() {
      _isUploading = true;
      _uploadProgress = 0;
    });

    try {
      await ApiService().uploadFile(
        ApiConfig.reports,
        filePath: _imagePath!,
        fieldName: 'file',
        extraFields: {
          'job_id': job.id,
          'description': _descriptionController.text.trim(),
        },
      );

      setState(() => _uploadProgress = 1.0);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Report uploaded successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to upload report. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Upload Report'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Service Report',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Capture a photo and describe the completed work.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),

            // Image preview
            if (_imagePath != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  File(_imagePath!),
                  width: double.infinity,
                  height: 240,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: _captureImage,
                icon: const Icon(Icons.refresh),
                label: const Text('Retake Photo'),
              ),
            ] else ...[
              GestureDetector(
                onTap: _captureImage,
                child: Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.grey.shade300,
                      width: 2,
                      strokeAlign: BorderSide.strokeAlignInside,
                    ),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt, size: 48, color: Colors.grey),
                      SizedBox(height: 8),
                      Text(
                        'Tap to capture photo',
                        style: TextStyle(color: Colors.grey, fontSize: 16),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),

            // Description
            Text(
              'Description',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Describe the work completed, any issues found, etc.',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 24),

            // Upload progress
            if (_isUploading) ...[
              LinearProgressIndicator(value: _uploadProgress > 0 ? _uploadProgress : null),
              const SizedBox(height: 16),
            ],

            // Upload button
            CustomButton(
              label: 'Upload Report',
              icon: Icons.cloud_upload,
              isLoading: _isUploading,
              onPressed: _uploadReport,
            ),
          ],
        ),
      ),
    );
  }
}
