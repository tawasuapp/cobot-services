import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/job.dart';
import '../providers/job_provider.dart';
import '../utils/helpers.dart';
import '../widgets/custom_button.dart';
import '../widgets/status_badge.dart';

class JobDetailScreen extends StatefulWidget {
  const JobDetailScreen({super.key});

  @override
  State<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends State<JobDetailScreen> {
  bool _isUpdating = false;

  Future<void> _updateStatus(Job job, String newStatus) async {
    setState(() => _isUpdating = true);
    final success =
        await context.read<JobProvider>().updateJobStatus(job.id, newStatus);
    setState(() => _isUpdating = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Status updated to $newStatus')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = ModalRoute.of(context)!.settings.arguments as Job;
    // Watch for live updates to this job
    final jobs = context.watch<JobProvider>();
    final liveJob = jobs.todaysJobs.where((j) => j.id == job.id).firstOrNull ??
        jobs.operatorJobs.where((j) => j.id == job.id).firstOrNull ??
        job;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Details'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  liveJob.jobNumber ?? 'Job #${liveJob.id.substring(0, 8)}',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                StatusBadge(status: liveJob.status),
              ],
            ),
            const SizedBox(height: 20),

            // Customer info section
            _SectionCard(
              title: 'Customer',
              icon: Icons.business,
              children: [
                _InfoRow('Name', liveJob.customer?.name ?? 'N/A'),
                _InfoRow('Address', liveJob.customer?.address ?? 'N/A'),
                if (liveJob.customer?.contactPerson != null)
                  _InfoRow('Contact', liveJob.customer!.contactPerson!),
                if (liveJob.customer?.phone != null)
                  _InfoRow('Phone', liveJob.customer!.phone!),
              ],
            ),
            const SizedBox(height: 12),

            // Job info section
            _SectionCard(
              title: 'Job Info',
              icon: Icons.work,
              children: [
                _InfoRow('Service', liveJob.serviceType),
                _InfoRow('Scheduled', Helpers.formatDateTime(liveJob.scheduledDateTime)),
                if (liveJob.priority != null)
                  _InfoRow('Priority', liveJob.priority!),
                if (liveJob.estimatedDurationMinutes != null)
                  _InfoRow('Duration', '${liveJob.estimatedDurationMinutes} min'),
                if (liveJob.robot != null)
                  _InfoRow('Robot', '${liveJob.robot!.name} (${liveJob.robot!.serialNumber})'),
                if (liveJob.vehicle != null)
                  _InfoRow('Vehicle', '${liveJob.vehicle!.name} - ${liveJob.vehicle!.plateNumber}'),
                if (liveJob.notes != null) _InfoRow('Notes', liveJob.notes!),
              ],
            ),
            const SizedBox(height: 12),

            // Map preview button
            if (liveJob.customer?.latitude != null &&
                liveJob.customer?.longitude != null)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Helpers.openGoogleMapsNavigation(
                      liveJob.customer!.latitude!,
                      liveJob.customer!.longitude!,
                    );
                  },
                  icon: const Icon(Icons.map),
                  label: const Text('Open in Google Maps'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            const SizedBox(height: 24),

            // Action buttons based on status
            ..._buildActionButtons(liveJob),
          ],
        ),
      ),
    );
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
              if (job.customer?.latitude != null &&
                  job.customer?.longitude != null) {
                Helpers.openGoogleMapsNavigation(
                  job.customer!.latitude!,
                  job.customer!.longitude!,
                );
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
        return [
          CustomButton(
            label: 'Scan Customer QR',
            icon: Icons.qr_code_scanner,
            isLoading: _isUpdating,
            backgroundColor: Colors.indigo,
            onPressed: () {
              Navigator.of(context).pushNamed('/qr-scanner', arguments: job);
            },
          ),
        ];

      case 'in_progress':
        return [
          CustomButton(
            label: 'Upload Report',
            icon: Icons.camera_alt,
            backgroundColor: Colors.teal,
            onPressed: () {
              Navigator.of(context).pushNamed('/report-upload', arguments: job);
            },
          ),
          const SizedBox(height: 12),
          CustomButton(
            label: 'Complete Job',
            icon: Icons.check_circle,
            isLoading: _isUpdating,
            backgroundColor: Colors.green,
            onPressed: () => _updateStatus(job, 'completed'),
          ),
        ];

      default:
        return [];
    }
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: Theme.of(context).primaryColor),
                const SizedBox(width: 8),
                Text(title, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
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
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodyLarge),
          ),
        ],
      ),
    );
  }
}
