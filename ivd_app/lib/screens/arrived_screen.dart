import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/job_provider.dart';
import '../config/theme.dart';
import '../widgets/ivd_button.dart';

class ArrivedScreen extends StatelessWidget {
  const ArrivedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final jobProvider = context.watch<JobProvider>();
    final job = jobProvider.currentJob;
    final customerName = job?.customer.name ?? 'Customer';

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 80, vertical: 32),
          child: Column(
            children: [
              const SizedBox(height: 16),
              // Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  color: IvdTheme.successGreen.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: IvdTheme.successGreen.withValues(alpha: 0.4),
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      size: 72,
                      color: IvdTheme.successGreen,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'ARRIVED',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: IvdTheme.successGreen,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      customerName,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w500,
                        color: IvdTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              // Instructions
              const Text(
                'You have arrived at the customer location.',
                style: TextStyle(
                  fontSize: 20,
                  color: IvdTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Please continue on your MOBILE APP to:',
                style: TextStyle(
                  fontSize: 18,
                  color: IvdTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              _buildChecklistItem(Icons.qr_code_scanner, 'Scan QR codes'),
              const SizedBox(height: 10),
              _buildChecklistItem(Icons.smart_toy, 'Deploy robot'),
              const SizedBox(height: 10),
              _buildChecklistItem(Icons.upload_file, 'Upload reports'),
              const Spacer(),
              // Action button
              IvdButton(
                label: 'CONTINUE ON MOBILE APP',
                icon: Icons.phone_android,
                onPressed: () {
                  if (job != null) {
                    jobProvider.completeJob(job.id);
                  }
                  Navigator.of(context).pushReplacementNamed('/home');
                },
                backgroundColor: IvdTheme.primaryBlue,
                minHeight: 68,
                fontSize: 20,
                expanded: true,
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_active,
                      color: IvdTheme.accentBlue.withValues(alpha: 0.7), size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Notification sent to your phone.',
                    style: TextStyle(
                      fontSize: 16,
                      color: IvdTheme.textSecondary.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChecklistItem(IconData icon, String text) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: IvdTheme.accentBlue, size: 22),
        const SizedBox(width: 12),
        Text(
          text,
          style: const TextStyle(
            fontSize: 18,
            color: IvdTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
