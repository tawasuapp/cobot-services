import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';

import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/job_provider.dart';
import 'providers/location_provider.dart';
import 'screens/camera_screen.dart';
import 'screens/job_detail_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'screens/permissions_screen.dart';
import 'screens/qr_scanner_screen.dart';
import 'screens/report_upload_screen.dart';
import 'services/app_settings_service.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
  } catch (e) {
    debugPrint('Firebase init skipped: $e');
  }

  // Load cached admin settings (arrival radius, GPS interval) before the UI
  // renders so the first job flow uses sensible values even offline.
  await AppSettingsService.instance.loadCached();

  runApp(const CobotApp());
}

class CobotApp extends StatelessWidget {
  const CobotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => JobProvider()),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
      ],
      child: MaterialApp(
        title: 'Cobot Operator',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const _AppGate(),
        routes: {
          '/login': (_) => const LoginScreen(),
          '/home': (_) => MainShell(key: MainShell.shellKey),
          '/job-detail': (_) => const JobDetailScreen(),
          '/qr-scanner': (_) => const QrScannerScreen(),
          '/camera': (_) => const CameraScreen(),
          '/report-upload': (_) => const ReportUploadScreen(),
        },
      ),
    );
  }
}

/// First checks permissions, then checks auth.
class _AppGate extends StatefulWidget {
  const _AppGate();

  @override
  State<_AppGate> createState() => _AppGateState();
}

class _AppGateState extends State<_AppGate> {
  bool? _permissionsGranted; // null = still checking
  bool _authChecked = false;

  @override
  void initState() {
    super.initState();
    _checkPermissionsQuickly();
  }

  Future<void> _checkPermissionsQuickly() async {
    try {
      final locPerm = await Permission.locationWhenInUse.isGranted;
      final gpsOn = await Geolocator.isLocationServiceEnabled();
      final cam = await Permission.camera.isGranted;
      final notif = await Permission.notification.isGranted;

      if (mounted) {
        if (locPerm && gpsOn && cam && notif) {
          setState(() => _permissionsGranted = true);
          _initAuth();
        } else {
          setState(() => _permissionsGranted = false);
        }
      }
    } catch (e) {
      // If permission check fails, show the permissions screen
      if (mounted) setState(() => _permissionsGranted = false);
    }
  }

  void _onPermissionsGranted() {
    setState(() => _permissionsGranted = true);
    _initAuth();
  }

  Future<void> _initAuth() async {
    try {
      final auth = context.read<AuthProvider>();
      await auth.tryAutoLogin();

      if (auth.isLoggedIn) {
        // Refresh admin settings (arrival radius, GPS interval) on session
        // start so the app picks up dashboard changes without a reinstall.
        unawaited(AppSettingsService.instance.refreshFromServer());
        try {
          await NotificationService().initialize();
        } catch (e) {
          debugPrint('Notification init skipped: $e');
        }
        if (mounted) {
          final locProvider = context.read<LocationProvider>();
          locProvider.entityType = 'user';
          locProvider.entityId = auth.currentUser?.id;
          locProvider.startTracking();
        }
      }
    } catch (e) {
      debugPrint('Auth init failed: $e');
    } finally {
      if (mounted) setState(() => _authChecked = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Still checking permissions — show loading
    if (_permissionsGranted == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    // Permissions not granted — show permissions screen
    if (_permissionsGranted == false) {
      return PermissionsScreen(onAllGranted: _onPermissionsGranted);
    }

    // Auth not checked yet — show loading
    if (!_authChecked) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final auth = context.watch<AuthProvider>();
    return auth.isLoggedIn ? MainShell(key: MainShell.shellKey) : const LoginScreen();
  }
}
