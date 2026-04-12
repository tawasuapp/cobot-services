import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:math';
import '../providers/job_provider.dart';
import '../providers/location_provider.dart';
import '../providers/settings_provider.dart';
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
        // Apply the admin-configured arrival radius (set in dashboard
        // Settings > System > Arrival Radius) before tracking starts so
        // auto-arrival fires at the correct distance.
        final settings = context.read<SettingsProvider>();
        final loc = context.read<LocationProvider>();
        loc.arrivalRadiusMeters = settings.arrivalRadiusMeters;
        loc.startTracking(activeJob: job);
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

    if (!mounted) return;
    final choice = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 6),
                child: Text(
                  'Open with',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Colors.black87),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _navAppTile(
                    onTap: () => Navigator.pop(ctx, 'google'),
                    assetPath: 'assets/google_maps.png',
                    label: 'Maps',
                    fallbackBg: const Color(0xFF34A853),
                    fallbackLetter: 'M',
                  )),
                  const SizedBox(width: 12),
                  Expanded(child: _navAppTile(
                    onTap: () => Navigator.pop(ctx, 'waze'),
                    assetPath: 'assets/waze.png',
                    label: 'Waze',
                    fallbackBg: const Color(0xFF33CCFF),
                    fallbackLetter: 'W',
                  )),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (choice == null) return;

    if (choice == 'google') {
      // Use native Android intent with explicit package to bypass chooser
      const channel = MethodChannel('com.powerweb.cobotivd/navigation');
      try {
        final success = await channel.invokeMethod('openGoogleMapsNavigation', {'lat': lat, 'lng': lng});
        if (success == true) return;
      } catch (_) {}
      // Fallback: web URL
      final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      // Waze navigation
      final wazeUri = Uri.parse('waze://?ll=$lat,$lng&navigate=yes');
      try { await launchUrl(wazeUri); return; } catch (_) {}
      // Not installed
      final storeUri = Uri.parse('market://details?id=com.waze');
      try { await launchUrl(storeUri); } catch (_) {}
    }
  }

  /// Tile used in the "Open with" navigation picker.
  /// Shows the app's real PNG logo when present at [assetPath]; falls back
  /// to a colored letter tile so the UI still works if the brand asset
  /// hasn't been dropped into assets/ yet.
  Widget _navAppTile({
    required VoidCallback onTap,
    required String assetPath,
    required String label,
    required Color fallbackBg,
    required String fallbackLetter,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        child: Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                width: 68,
                height: 68,
                child: Image.asset(
                  assetPath,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: fallbackBg,
                    alignment: Alignment.center,
                    child: Text(
                      fallbackLetter,
                      style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(fontSize: 14, color: Colors.black87, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  /// Distance in meters between two GPS coordinates (Haversine).
  double _distanceMeters(double lat1, double lon1, double lat2, double lon2) {
    const earthRadius = 6371000.0;
    double toRad(double d) => d * pi / 180;
    final dLat = toRad(lat2 - lat1);
    final dLon = toRad(lon2 - lon1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(toRad(lat1)) * cos(toRad(lat2)) * sin(dLon / 2) * sin(dLon / 2);
    return 2 * earthRadius * atan2(sqrt(a), sqrt(1 - a));
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
                  // Auto-arrival status indicator. Replaces the old manual
                  // "I've Arrived" button — drivers should never confirm
                  // arrival themselves; the system marks them arrived once
                  // GPS reports they are within the configured radius of the
                  // customer location (admin-set in dashboard Settings).
                  if (job != null && _currentPosition() != null)
                    _buildArrivalStatus(job, _currentPosition()!,
                        context.watch<SettingsProvider>().arrivalRadiusMeters),
                  const SizedBox(height: 16),
                  // Single primary action: open the navigation app.
                  IvdButton(
                    label: 'OPEN MAPS',
                    icon: Icons.map,
                    onPressed: _openMaps,
                    backgroundColor: IvdTheme.primaryBlue,
                    minHeight: 68,
                    fontSize: 20,
                    expanded: true,
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

  /// Read the operator's current GPS position from the LocationProvider.
  /// Returns `(lat, lng)` or null if no fix yet.
  ({double lat, double lng})? _currentPosition() {
    final loc = context.watch<LocationProvider>();
    final p = loc.currentPosition;
    if (p == null) return null;
    return (lat: p.latitude, lng: p.longitude);
  }

  /// Banner showing distance to destination + auto-arrival status.
  /// Replaces the old manual "I've Arrived" button — drivers no longer
  /// confirm arrival themselves.
  Widget _buildArrivalStatus(
      dynamic job, ({double lat, double lng}) pos, double radiusMeters) {
    final destLat = job.customer.latitude as double;
    final destLng = job.customer.longitude as double;
    final distance = _distanceMeters(pos.lat, pos.lng, destLat, destLng);
    final within = distance <= radiusMeters;
    final color = within ? IvdTheme.successGreen : IvdTheme.accentBlue;
    final label = within
        ? 'Arrived — confirming with system…'
        : '${distance.toStringAsFixed(0)} m to destination · auto-arrival within ${radiusMeters.toStringAsFixed(0)} m';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.5), width: 1.5),
      ),
      child: Row(
        children: [
          Icon(within ? Icons.check_circle : Icons.gps_fixed, color: color, size: 26),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: 18, color: color, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
