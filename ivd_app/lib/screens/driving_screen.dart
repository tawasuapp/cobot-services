import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/job_provider.dart';
import '../providers/location_provider.dart';
import '../config/theme.dart';
import '../widgets/ivd_button.dart';

class DrivingScreen extends StatefulWidget {
  const DrivingScreen({super.key});

  @override
  State<DrivingScreen> createState() => _DrivingScreenState();
}

class _DrivingScreenState extends State<DrivingScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final job = context.read<JobProvider>().currentJob;
      if (job != null) {
        context.read<LocationProvider>().startTracking(activeJob: job);
      }
    });
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _openMaps() async {
    final job = context.read<JobProvider>().currentJob;
    if (job == null) return;

    final lat = job.customer.latitude;
    final lng = job.customer.longitude;
    final uri = Uri.parse('google.navigation:q=$lat,$lng&mode=d');

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      // Fallback to Google Maps web URL
      final webUri = Uri.parse(
          'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _manualArrival() async {
    final jobProvider = context.read<JobProvider>();
    final locationProvider = context.read<LocationProvider>();
    final job = jobProvider.currentJob;
    if (job == null) return;

    await jobProvider.markArrived(job.id);
    locationProvider.stopTracking();

    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/arrived');
    }
  }

  @override
  Widget build(BuildContext context) {
    final jobProvider = context.watch<JobProvider>();
    final locationProvider = context.watch<LocationProvider>();
    final job = jobProvider.currentJob;

    // Auto-navigate when arrival is detected
    if (locationProvider.hasArrived && job != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        await jobProvider.markArrived(job.id);
        locationProvider.resetArrival();
        locationProvider.stopTracking();
        if (mounted) {
          Navigator.of(context).pushReplacementNamed('/arrived');
        }
      });
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
        children: [
          // Top bar
          Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 32),
            color: IvdTheme.primaryBlue,
            child: Row(
              children: [
                const Icon(Icons.navigation, color: Colors.white, size: 28),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    'DRIVING TO: ${job?.customer.name ?? ""}',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.gps_fixed, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        locationProvider.isTracking ? 'GPS Active' : 'GPS Off',
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Main content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Navigation placeholder
                  Expanded(
                    child: Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: IvdTheme.cardDark,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: IvdTheme.primaryBlue.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.map,
                            size: 64,
                            color: IvdTheme.primaryBlue.withValues(alpha: 0.5),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Google Maps Navigation',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w600,
                              color: IvdTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Tap "Open Maps" to start turn-by-turn navigation',
                            style: TextStyle(
                              fontSize: 18,
                              color: IvdTheme.textSecondary,
                            ),
                          ),
                          if (job != null) ...[
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.location_on,
                                    color: IvdTheme.accentBlue, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  job.customer.address,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    color: IvdTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: IvdButton(
                          label: 'OPEN MAPS',
                          icon: Icons.map,
                          onPressed: _openMaps,
                          backgroundColor: IvdTheme.primaryBlue,
                          minHeight: 68,
                          fontSize: 20,
                          expanded: true,
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        child: IvdButton(
                          label: "I'VE ARRIVED",
                          icon: Icons.location_on,
                          onPressed: _manualArrival,
                          backgroundColor: IvdTheme.successGreen,
                          minHeight: 68,
                          fontSize: 20,
                          expanded: true,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }
}
