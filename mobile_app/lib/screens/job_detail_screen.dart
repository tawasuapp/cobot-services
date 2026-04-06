import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/job.dart';
import '../providers/job_provider.dart';
import '../services/api_service.dart';
import '../utils/helpers.dart';
import '../widgets/custom_button.dart';
import '../widgets/status_badge.dart';

/// Full RO job flow:
/// 1. assigned → "Start Driving" (opens Google Maps, status → en_route)
/// 2. en_route → "I've Arrived" (or auto-detect, status → arrived)
/// 3. arrived → Scan Customer QR (verify location)
/// 4. arrived (verified) → Scan Robot QR (deploy robot, status → in_progress)
/// 5. in_progress → Robot cleaning... screenshot/extract report
/// 6. in_progress → Upload Report
/// 7. in_progress → Scan Robot QR (return robot)
/// 8. in_progress → Scan Vehicle QR (confirm robot back in vehicle)
/// 9. → Complete Job (status → completed)

class JobDetailScreen extends StatefulWidget {
  const JobDetailScreen({super.key});

  @override
  State<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends State<JobDetailScreen> {
  bool _isUpdating = false;

  // Track sub-steps — persisted via backend qr_scan_logs
  bool _customerQrScanned = false;
  bool _robotDeployed = false;
  bool _reportUploaded = false;
  bool _robotReturned = false;
  bool _vehicleQrScanned = false;

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
          _customerQrScanned = data['customer_location'] == true;
          _robotDeployed = data['robot_deploy'] == true;
          _robotReturned = data['robot_return'] == true;
          _vehicleQrScanned = data['vehicle_return'] == true;
        });
      }
    } catch (_) {
      // Endpoint may not exist yet on older backends — ignore
    }
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
    final result = await Navigator.of(context).pushNamed(
      '/qr-scanner',
      arguments: {'job': job, 'scanType': scanType, 'instruction': instruction},
    );

    if (result == true && mounted) {
      setState(() {
        switch (scanType) {
          case 'customer_location':
            _customerQrScanned = true;
            break;
          case 'robot_deploy':
            _robotDeployed = true;
            break;
          case 'robot_return':
            _robotReturned = true;
            break;
          case 'vehicle_return':
            _vehicleQrScanned = true;
            break;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = ModalRoute.of(context)!.settings.arguments as Job;
    final jobs = context.watch<JobProvider>();
    final liveJob = jobs.todaysJobs.where((j) => j.id == job.id).firstOrNull ??
        jobs.operatorJobs.where((j) => j.id == job.id).firstOrNull ??
        job;

    final currentStep = _getCurrentStep(liveJob);
    final scanAction = _getScanAction(liveJob);

    return Scaffold(
      appBar: AppBar(title: const Text('Job Details')),
      // Contextual floating Scan button — only shown when a scan step is active
      floatingActionButton: scanAction != null
          ? FloatingActionButton.extended(
              onPressed: scanAction['onPressed'] as VoidCallback,
              icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
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

            // Progress stepper
            _SectionCard(title: 'Job Progress', icon: Icons.linear_scale, children: [
              _StepRow(1, 'Start Driving', _isStepDone(liveJob, 1), _isStepActive(liveJob, 1)),
              _StepRow(2, 'Arrive at Location', _isStepDone(liveJob, 2), _isStepActive(liveJob, 2)),
              _StepRow(3, 'Scan Customer QR', _isStepDone(liveJob, 3) || _customerQrScanned, _isStepActive(liveJob, 3)),
              _StepRow(4, 'Scan & Deploy Robot', _isStepDone(liveJob, 4) || _robotDeployed, _isStepActive(liveJob, 4)),
              _StepRow(5, 'Robot Cleaning', _isStepDone(liveJob, 5), _isStepActive(liveJob, 5)),
              _StepRow(6, 'Upload Report', _reportUploaded || _isStepDone(liveJob, 6), _isStepActive(liveJob, 6)),
              _StepRow(7, 'Scan Robot (Return)', _robotReturned, _isStepActive(liveJob, 7)),
              _StepRow(8, 'Scan Vehicle (Confirm)', _vehicleQrScanned, _isStepActive(liveJob, 8)),
              _StepRow(9, 'Complete Job', liveJob.status == 'completed', false),
            ]),
            const SizedBox(height: 20),

            // Action buttons
            ..._buildActionButtons(liveJob),
            const SizedBox(height: 80), // Space for FAB
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
        if (!_customerQrScanned) return 3;
        if (!_robotDeployed) return 4;
        return 5; // Both scanned, ready to start cleaning
      case 'in_progress':
        if (!_reportUploaded) return 6;
        if (!_robotReturned) return 7;
        if (!_vehicleQrScanned) return 8;
        return 9;
      case 'completed':
        return 9;
      default:
        return 1;
    }
  }

  bool _isStepDone(Job job, int step) {
    final statusOrder = {'assigned': 1, 'scheduled': 1, 'en_route': 2, 'arrived': 3, 'in_progress': 5, 'completed': 9};
    final current = statusOrder[job.status] ?? 0;
    return current > step;
  }

  bool _isStepActive(Job job, int step) => _getCurrentStep(job) == step;

  Map<String, dynamic>? _getScanAction(Job job) {
    if (job.status == 'arrived' && !_customerQrScanned) {
      return {
        'label': 'Scan Customer QR',
        'color': Colors.indigo,
        'onPressed': () => _scanQr(job, 'customer_location', 'Scan the QR code at the customer location'),
      };
    }
    if (job.status == 'arrived' && _customerQrScanned && !_robotDeployed) {
      return {
        'label': 'Scan Robot to Deploy',
        'color': Colors.teal,
        'onPressed': () => _scanQr(job, 'robot_deploy', 'Scan the QR code on the robot to deploy it'),
      };
    }
    if (job.status == 'in_progress' && _reportUploaded && !_robotReturned) {
      return {
        'label': 'Scan Robot (Return)',
        'color': Colors.orange,
        'onPressed': () => _scanQr(job, 'robot_return', 'Scan the robot QR to confirm return'),
      };
    }
    if (job.status == 'in_progress' && _robotReturned && !_vehicleQrScanned) {
      return {
        'label': 'Scan Vehicle (Confirm)',
        'color': Colors.deepPurple,
        'onPressed': () => _scanQr(job, 'vehicle_return', 'Scan the vehicle QR to confirm robot is loaded'),
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
        ];

      case 'arrived':
        if (_customerQrScanned && _robotDeployed) {
          return [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Robot deployed. Waiting for cleaning to finish...', textAlign: TextAlign.center, style: TextStyle(fontSize: 16, color: Colors.grey)),
            ),
            CustomButton(
              label: 'Robot Cleaning Started',
              icon: Icons.play_circle,
              backgroundColor: Colors.teal,
              onPressed: () => _updateStatus(job, 'in_progress'),
            ),
          ];
        }
        return [
          // Scan buttons are shown via FAB
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Use the Scan button below to proceed', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey)),
          ),
        ];

      case 'in_progress':
        final buttons = <Widget>[];

        if (!_reportUploaded) {
          buttons.add(CustomButton(
            label: 'Upload Cleaning Report',
            icon: Icons.camera_alt,
            backgroundColor: Colors.teal,
            onPressed: () async {
              final result = await Navigator.of(context).pushNamed('/report-upload', arguments: job);
              if (result == true && mounted) {
                setState(() => _reportUploaded = true);
              }
            },
          ));
          buttons.add(const SizedBox(height: 8));
          buttons.add(const Text('Take a screenshot of the robot cleaning report and upload it.',
              style: TextStyle(fontSize: 12, color: Colors.grey), textAlign: TextAlign.center));
        } else if (!_robotReturned || !_vehicleQrScanned) {
          buttons.add(const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Report uploaded. Use the Scan button to return the robot and confirm vehicle loading.',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey)),
          ));
        } else {
          buttons.add(CustomButton(
            label: 'Complete Job',
            icon: Icons.check_circle,
            isLoading: _isUpdating,
            backgroundColor: Colors.green,
            onPressed: () async {
              await _updateStatus(job, 'completed');
              if (mounted) Navigator.of(context).pop();
            },
          ));
        }
        return buttons;

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

  const _StepRow(this.step, this.label, this.isDone, this.isActive);

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
                  : Text('$step', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isActive ? Colors.white : Colors.grey)),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              color: isDone ? Colors.green : isActive ? Theme.of(context).primaryColor : Colors.grey,
            ),
          ),
          if (isActive) ...[
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: Theme.of(context).primaryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              child: Text('Current', style: TextStyle(fontSize: 10, color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
            ),
          ],
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
