import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';

import '../models/job.dart';
import '../providers/job_provider.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';
import '../utils/helpers.dart';
import '../widgets/custom_button.dart';
import '../widgets/status_badge.dart';

/// New 10-step RO job flow:
/// 1. Start Driving → opens Google Maps, status → en_route
/// 2. Arrive at Location → auto-detect via GPS or manual
/// 3. Scan & Deploy Robot → scan robot QR, status → in_progress
/// 4. Take Robot Photo → camera only (photo of deployed robot)
/// 5. Scan Customer QR → verifies location, starts cleaning timer
/// 6. Robot Cleaning → no input needed, timer running
/// 7. Finish Cleaning & Upload Report → photo/gallery + notes, stops timer
/// 8. Scan Robot (Return) → scan robot QR to confirm return
/// 9. Take Robot Photo Inside VAN → camera only
/// 10. Job Completed

class JobDetailScreen extends StatefulWidget {
  const JobDetailScreen({super.key});

  @override
  State<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends State<JobDetailScreen> {
  bool _isUpdating = false;
  final _picker = ImagePicker();

  // Scan steps persisted from backend
  bool _robotDeployed = false;
  bool _robotPhotoTaken = false;
  bool _customerQrScanned = false;
  bool _reportUploaded = false;
  bool _robotReturned = false;
  bool _vanPhotoTaken = false;

  // Cleaning timer
  DateTime? _cleaningStartTime;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final job = ModalRoute.of(context)?.settings.arguments as Job?;
    if (job != null) _loadScanStatus(job.id);
  }

  Future<void> _loadScanStatus(String jobId) async {
    try {
      final res = await ApiService().get('/qr/job/$jobId/status');
      final data = res.data as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _robotDeployed = data['robot_deploy'] == true;
          _customerQrScanned = data['customer_location'] == true;
          _robotReturned = data['robot_return'] == true;
          // Infer photo steps from scan progression
          if (_customerQrScanned) _robotPhotoTaken = true;
          if (_robotReturned) _reportUploaded = true;
        });
      }
    } catch (_) {}
  }

  Future<void> _updateStatus(Job job, String newStatus) async {
    setState(() => _isUpdating = true);
    final success = await context.read<JobProvider>().updateJobStatus(job.id, newStatus);
    setState(() => _isUpdating = false);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Status updated to ${newStatus.replaceAll('_', ' ')}')),
      );
    }
  }

  Future<void> _scanQr(Job job, String scanType, String instruction) async {
    final result = await Navigator.of(context).pushNamed('/qr-scanner', arguments: {
      'job': job, 'scanType': scanType, 'instruction': instruction,
    });
    if (result == true && mounted) {
      await _loadScanStatus(job.id);
      // Refresh job status
      await context.read<JobProvider>().fetchTodaysJobs();
    }
  }

  Future<void> _takePhoto(String label, VoidCallback onDone) async {
    final picked = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (picked != null) {
      // Upload the photo
      try {
        final job = ModalRoute.of(context)?.settings.arguments as Job?;
        await ApiService().uploadFile(
          ApiConfig.reports,
          filePath: picked.path,
          fieldName: 'file',
          extraFields: {
            'job_id': job?.id ?? '',
            'report_type': 'photo',
            'description': label,
          },
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$label uploaded'), backgroundColor: Colors.green),
          );
          onDone();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to upload: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = ModalRoute.of(context)!.settings.arguments as Job;
    final jobs = context.watch<JobProvider>();
    final liveJob = jobs.todaysJobs.where((j) => j.id == job.id).firstOrNull ??
        jobs.operatorJobs.where((j) => j.id == job.id).firstOrNull ?? job;

    final scanAction = _getScanAction(liveJob);

    return Scaffold(
      appBar: AppBar(title: const Text('Job Details')),
      floatingActionButton: scanAction != null
          ? FloatingActionButton.extended(
              onPressed: scanAction['onPressed'] as VoidCallback,
              icon: Icon(scanAction['icon'] as IconData, color: Colors.white),
              label: Text(scanAction['label'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              backgroundColor: scanAction['color'] as Color?,
              foregroundColor: Colors.white,
            )
          : null,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(liveJob.jobNumber ?? 'Job', style: Theme.of(context).textTheme.titleLarge),
                StatusBadge(status: liveJob.status),
              ],
            ),
            const SizedBox(height: 16),

            // Customer info
            _SectionCard(title: 'Customer', icon: Icons.business, children: [
              _InfoRow('Name', liveJob.customer?.name ?? 'N/A'),
              _InfoRow('Address', liveJob.customer?.address ?? 'N/A'),
              if (liveJob.customer?.phone != null) _InfoRow('Phone', liveJob.customer!.phone!),
            ]),
            const SizedBox(height: 12),

            // Job info
            _SectionCard(title: 'Job Info', icon: Icons.work, children: [
              _InfoRow('Service', liveJob.serviceType),
              _InfoRow('Scheduled', '${Helpers.formatDate(liveJob.scheduledDateTime)} at ${liveJob.formattedTime}'),
              if (liveJob.priority != null) _InfoRow('Priority', liveJob.priority!),
              if (liveJob.estimatedDurationMinutes != null) _InfoRow('Duration', '${liveJob.estimatedDurationMinutes} min'),
              if (liveJob.robot != null) _InfoRow('Robot', '${liveJob.robot!.name} (${liveJob.robot!.serialNumber})'),
              if (liveJob.vehicle != null) _InfoRow('Vehicle', '${liveJob.vehicle!.name} - ${liveJob.vehicle!.plateNumber}'),
            ]),
            const SizedBox(height: 12),

            // Navigate button
            if (liveJob.customer?.latitude != null && liveJob.customer?.longitude != null)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => Helpers.openGoogleMapsNavigation(liveJob.customer!.latitude!, liveJob.customer!.longitude!),
                  icon: const Icon(Icons.navigation),
                  label: const Text('Navigate to Customer'),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                ),
              ),
            const SizedBox(height: 20),

            // 10-step progress tracker
            _SectionCard(title: 'Job Progress', icon: Icons.linear_scale, children: [
              _StepRow(1, 'Start Driving', _isStepDone(liveJob, 1), _isStepActive(liveJob, 1), Icons.directions_car),
              _StepRow(2, 'Arrive at Location', _isStepDone(liveJob, 2), _isStepActive(liveJob, 2), Icons.location_on),
              _StepRow(3, 'Scan & Deploy Robot', _isStepDone(liveJob, 3) || _robotDeployed, _isStepActive(liveJob, 3), Icons.qr_code_scanner),
              _StepRow(4, 'Take Robot Photo', _robotPhotoTaken, _isStepActive(liveJob, 4), Icons.camera_alt),
              _StepRow(5, 'Scan Customer QR', _customerQrScanned, _isStepActive(liveJob, 5), Icons.qr_code),
              _StepRow(6, 'Robot Cleaning', _isStepDone(liveJob, 6), _isStepActive(liveJob, 6), Icons.cleaning_services),
              _StepRow(7, 'Upload Report', _reportUploaded, _isStepActive(liveJob, 7), Icons.upload_file),
              _StepRow(8, 'Scan Robot (Return)', _robotReturned, _isStepActive(liveJob, 8), Icons.qr_code_scanner),
              _StepRow(9, 'Photo Robot in VAN', _vanPhotoTaken, _isStepActive(liveJob, 9), Icons.camera_alt),
              _StepRow(10, 'Job Completed', liveJob.status == 'completed', false, Icons.check_circle),
            ]),
            const SizedBox(height: 20),

            // Cleaning timer display
            if (_cleaningStartTime != null && !_reportUploaded)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.timer, color: Colors.orange.shade700),
                    const SizedBox(width: 12),
                    Text('Cleaning in progress...', style: TextStyle(color: Colors.orange.shade800, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            if (_cleaningStartTime != null && !_reportUploaded) const SizedBox(height: 12),

            // Action buttons
            ..._buildActionButtons(liveJob),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  int _getCurrentStep(Job job) {
    switch (job.status) {
      case 'assigned':
      case 'scheduled':
        return 1;
      case 'en_route':
        return 2;
      case 'arrived':
        if (!_robotDeployed) return 3;
        if (!_robotPhotoTaken) return 4;
        if (!_customerQrScanned) return 5;
        return 5;
      case 'in_progress':
        if (!_reportUploaded) return _customerQrScanned ? 7 : 6;
        if (!_robotReturned) return 8;
        if (!_vanPhotoTaken) return 9;
        return 10;
      case 'completed':
        return 10;
      default:
        return 1;
    }
  }

  bool _isStepDone(Job job, int step) {
    final statusOrder = {'assigned': 1, 'scheduled': 1, 'en_route': 2, 'arrived': 3, 'in_progress': 6, 'completed': 10};
    final current = statusOrder[job.status] ?? 0;
    return current > step;
  }

  bool _isStepActive(Job job, int step) => _getCurrentStep(job) == step;

  Map<String, dynamic>? _getScanAction(Job job) {
    // Step 3: Deploy robot
    if (job.status == 'arrived' && !_robotDeployed) {
      return {
        'label': 'Scan & Deploy Robot', 'color': Colors.teal, 'icon': Icons.qr_code_scanner,
        'onPressed': () => _scanQr(job, 'robot_deploy', 'Scan the QR code on the robot to deploy it'),
      };
    }
    // Step 4: Take robot photo
    if (job.status == 'arrived' && _robotDeployed && !_robotPhotoTaken) {
      return {
        'label': 'Take Robot Photo', 'color': Colors.indigo, 'icon': Icons.camera_alt,
        'onPressed': () => _takePhoto('Robot deployed photo', () => setState(() => _robotPhotoTaken = true)),
      };
    }
    // Step 5: Scan customer QR (starts timer)
    if ((job.status == 'arrived' || job.status == 'in_progress') && _robotPhotoTaken && !_customerQrScanned) {
      return {
        'label': 'Scan Customer QR', 'color': Colors.blue, 'icon': Icons.qr_code,
        'onPressed': () async {
          await _scanQr(job, 'customer_location', 'Scan the QR code at the customer location to start cleaning');
          if (mounted) setState(() => _cleaningStartTime = DateTime.now());
        },
      };
    }
    // Step 8: Return robot
    if (job.status == 'in_progress' && _reportUploaded && !_robotReturned) {
      return {
        'label': 'Scan Robot (Return)', 'color': Colors.orange, 'icon': Icons.qr_code_scanner,
        'onPressed': () => _scanQr(job, 'robot_return', 'Scan the robot QR to confirm return'),
      };
    }
    // Step 9: Photo robot in van
    if (job.status == 'in_progress' && _robotReturned && !_vanPhotoTaken) {
      return {
        'label': 'Photo Robot in VAN', 'color': Colors.deepPurple, 'icon': Icons.camera_alt,
        'onPressed': () => _takePhoto('Robot returned to VAN photo', () => setState(() => _vanPhotoTaken = true)),
      };
    }
    return null;
  }

  List<Widget> _buildActionButtons(Job job) {
    switch (job.status) {
      case 'assigned':
      case 'scheduled':
        return [
          CustomButton(
            label: 'Start Driving',
            icon: Icons.directions_car,
            isLoading: _isUpdating,
            onPressed: () async {
              await _updateStatus(job, 'en_route');
              if (job.customer?.latitude != null && job.customer?.longitude != null) {
                Helpers.openGoogleMapsNavigation(job.customer!.latitude!, job.customer!.longitude!);
              }
            },
          ),
        ];

      case 'en_route':
        return [
          CustomButton(
            label: "I've Arrived",
            icon: Icons.location_on,
            isLoading: _isUpdating,
            backgroundColor: Colors.purple,
            onPressed: () => _updateStatus(job, 'arrived'),
          ),
          const SizedBox(height: 8),
          const Text('GPS will auto-detect arrival when you\'re near the location.',
              textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey)),
        ];

      case 'arrived':
        if (_robotDeployed && _robotPhotoTaken && _customerQrScanned) {
          return [
            CustomButton(
              label: 'Start Robot Cleaning',
              icon: Icons.cleaning_services,
              backgroundColor: Colors.teal,
              onPressed: () => _updateStatus(job, 'in_progress'),
            ),
          ];
        }
        return [
          const Padding(
            padding: EdgeInsets.all(12),
            child: Text('Use the button below to proceed through the steps',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey)),
          ),
        ];

      case 'in_progress':
        if (!_reportUploaded) {
          if (!_customerQrScanned) {
            return [
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text('Complete the scan steps above first',
                    textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey)),
              ),
            ];
          }
          return [
            CustomButton(
              label: 'Finish Cleaning & Upload Report',
              icon: Icons.upload_file,
              backgroundColor: Colors.teal,
              onPressed: () async {
                final result = await Navigator.of(context).pushNamed('/report-upload', arguments: job);
                if (result == true && mounted) {
                  setState(() => _reportUploaded = true);
                }
              },
            ),
            const SizedBox(height: 8),
            const Text('Take a photo of the cleaning report and upload it.',
                style: TextStyle(fontSize: 12, color: Colors.grey), textAlign: TextAlign.center),
          ];
        }
        if (_robotReturned && _vanPhotoTaken) {
          return [
            CustomButton(
              label: 'Complete Job',
              icon: Icons.check_circle,
              isLoading: _isUpdating,
              backgroundColor: Colors.green,
              onPressed: () async {
                await _updateStatus(job, 'completed');
                if (mounted) Navigator.of(context).pop();
              },
            ),
          ];
        }
        return [
          const Padding(
            padding: EdgeInsets.all(12),
            child: Text('Use the button below to return the robot and take a photo',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey)),
          ),
        ];

      default:
        return [];
    }
  }
}

class _StepRow extends StatelessWidget {
  final int step;
  final String label;
  final bool isDone;
  final bool isActive;
  final IconData icon;

  const _StepRow(this.step, this.label, this.isDone, this.isActive, this.icon);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDone ? Colors.green : isActive ? Theme.of(context).primaryColor : Colors.grey.shade200,
            ),
            child: Center(
              child: isDone
                  ? const Icon(Icons.check, size: 16, color: Colors.white)
                  : Icon(icon, size: 14, color: isActive ? Colors.white : Colors.grey),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                color: isDone ? Colors.green : isActive ? Theme.of(context).primaryColor : Colors.grey,
              ),
            ),
          ),
          if (isActive)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: Theme.of(context).primaryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              child: Text('Current', style: TextStyle(fontSize: 10, color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;
  const _SectionCard({required this.title, required this.icon, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(icon, size: 20, color: Theme.of(context).primaryColor),
              const SizedBox(width: 8),
              Text(title, style: Theme.of(context).textTheme.titleMedium),
            ]),
            const Divider(height: 20),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 90, child: Text(label, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500))),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyLarge)),
        ],
      ),
    );
  }
}
