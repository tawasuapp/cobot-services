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
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: size.width * 0.05,
              vertical: 16,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Header
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.symmetric(vertical: size.height * 0.03),
                  decoration: BoxDecoration(
                    color: IvdTheme.successGreen.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: IvdTheme.successGreen.withValues(alpha: 0.4)),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.check_circle, size: size.height * 0.1, color: IvdTheme.successGreen),
                      const SizedBox(height: 8),
                      const Text('ARRIVED', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: IvdTheme.successGreen, letterSpacing: 2)),
                      const SizedBox(height: 4),
                      Text(customerName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: IvdTheme.textPrimary)),
                    ],
                  ),
                ),
                SizedBox(height: size.height * 0.03),
                const Text('You have arrived at the customer location.', style: TextStyle(fontSize: 18, color: IvdTheme.textPrimary)),
                SizedBox(height: size.height * 0.02),
                const Text('Please continue on your MOBILE APP to:', style: TextStyle(fontSize: 16, color: IvdTheme.textSecondary)),
                SizedBox(height: size.height * 0.02),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildChecklistItem(Icons.qr_code_scanner, 'Scan QR'),
                    const SizedBox(width: 24),
                    _buildChecklistItem(Icons.smart_toy, 'Deploy robot'),
                    const SizedBox(width: 24),
                    _buildChecklistItem(Icons.upload_file, 'Upload reports'),
                  ],
                ),
                SizedBox(height: size.height * 0.04),
                IvdButton(
                  label: 'CONTINUE ON MOBILE APP',
                  icon: Icons.phone_android,
                  onPressed: () {
                    if (context.mounted) {
                      Navigator.of(context).pushReplacementNamed('/home');
                    }
                  },
                  backgroundColor: IvdTheme.primaryBlue,
                  minHeight: 56,
                  fontSize: 18,
                  expanded: true,
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.notifications_active, color: IvdTheme.accentBlue.withValues(alpha: 0.7), size: 16),
                    const SizedBox(width: 6),
                    Text('Notification sent to your phone.', style: TextStyle(fontSize: 14, color: IvdTheme.textSecondary.withValues(alpha: 0.8))),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChecklistItem(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: IvdTheme.accentBlue, size: 20),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(fontSize: 16, color: IvdTheme.textPrimary)),
      ],
    );
  }
}
