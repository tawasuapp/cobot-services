import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionsScreen extends StatefulWidget {
  final VoidCallback onAllGranted;
  const PermissionsScreen({super.key, required this.onAllGranted});

  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen> with WidgetsBindingObserver {
  bool _locationGranted = false;
  bool _cameraGranted = false;
  bool _notificationGranted = false;
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPermissions();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final locationPerm = await Permission.locationWhenInUse.isGranted;
    final gpsEnabled = await Geolocator.isLocationServiceEnabled();
    final camera = await Permission.camera.isGranted;
    final notification = await Permission.notification.isGranted;

    final location = locationPerm && gpsEnabled;

    if (mounted) {
      setState(() {
        _locationGranted = location;
        _cameraGranted = camera;
        _notificationGranted = notification;
        _checking = false;
      });

      if (location && camera && notification) {
        widget.onAllGranted();
      }
    }
  }

  Future<void> _requestAll() async {
    // Location permission
    if (!_locationGranted) {
      final perm = await Permission.locationWhenInUse.request();
      if (perm.isPermanentlyDenied) {
        await openAppSettings();
        return;
      }
      if (perm.isGranted) {
        await Permission.locationAlways.request();
      }
      final gpsOn = await Geolocator.isLocationServiceEnabled();
      if (!gpsOn) {
        await Geolocator.openLocationSettings();
      }
    }

    // Camera
    if (!_cameraGranted) {
      final perm = await Permission.camera.request();
      if (perm.isPermanentlyDenied) {
        await openAppSettings();
        return;
      }
    }

    // Notifications
    if (!_notificationGranted) {
      await Permission.notification.request();
    }

    await _checkPermissions();

    // If still not all granted, show warning
    if (mounted && !(_locationGranted && _cameraGranted && _notificationGranted)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('All permissions are required to use this app'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),
              Icon(Icons.security, size: 64, color: Theme.of(context).primaryColor),
              const SizedBox(height: 24),
              Text('Permissions Required', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              const Text(
                'Cobot Operator needs the following permissions to navigate to customer sites, scan robot and location QR codes, and receive job notifications.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
              const SizedBox(height: 32),

              _PermissionTile(
                icon: Icons.location_on,
                title: 'Location (GPS must be ON)',
                subtitle: 'Track your route and detect arrival at customer locations. GPS must be enabled.',
                granted: _locationGranted,
                color: Colors.blue,
              ),
              const SizedBox(height: 12),
              _PermissionTile(
                icon: Icons.camera_alt,
                title: 'Camera',
                subtitle: 'Scan QR codes and capture cleaning reports',
                granted: _cameraGranted,
                color: Colors.teal,
              ),
              const SizedBox(height: 12),
              _PermissionTile(
                icon: Icons.notifications,
                title: 'Notifications',
                subtitle: 'Receive alerts when assigned new jobs or arriving at locations',
                granted: _notificationGranted,
                color: Colors.orange,
              ),

              const Spacer(),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _requestAll,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Grant Permissions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => openAppSettings(),
                child: const Text('Open Settings', style: TextStyle(fontSize: 13)),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _PermissionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool granted;
  final Color color;

  const _PermissionTile({required this.icon, required this.title, required this.subtitle, required this.granted, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: granted ? Colors.green.shade50 : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: granted ? Colors.green.shade200 : Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: granted ? Colors.green.shade100 : color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(granted ? Icons.check : icon, color: granted ? Colors.green : color, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: granted ? Colors.green.shade800 : Colors.grey.shade800)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 12, color: granted ? Colors.green.shade600 : Colors.grey.shade600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
