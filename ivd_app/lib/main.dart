import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';

import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/job_provider.dart';
import 'providers/location_provider.dart';
import 'providers/settings_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/driving_screen.dart';
import 'screens/arrived_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Force landscape for 1600x600 IVD display
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Full-screen immersive mode for in-vehicle display
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  // Also hide system overlays explicitly
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarDividerColor: Colors.transparent,
  ));

  runApp(const CobotIvdApp());
}

class CobotIvdApp extends StatelessWidget {
  const CobotIvdApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => JobProvider()),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()..load()),
      ],
      child: MaterialApp(
        title: 'Cobot IVD',
        debugShowCheckedModeBanner: false,
        theme: IvdTheme.darkTheme,
        home: const AuthGate(),
        routes: {
          '/login': (_) => const LoginScreen(),
          '/home': (_) => const HomeScreen(),
          '/driving': (_) => const DrivingScreen(),
          '/arrived': (_) => const ArrivedScreen(),
        },
      ),
    );
  }
}

/// Checks for an existing auth token on startup and routes accordingly.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _isChecking = true;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    // Request location permission upfront
    await _requestPermissions();

    final authProvider = context.read<AuthProvider>();
    final loggedIn = await authProvider.tryAutoLogin();

    if (loggedIn) {
      // Start continuous location tracking immediately
      if (mounted) {
        final loc = context.read<LocationProvider>();
        loc.entityType = 'vehicle';
        loc.entityId = authProvider.user?.id;
        loc.startTracking();
      }
    }

    if (!mounted) return;

    setState(() {
      _isChecking = false;
    });

    if (loggedIn) {
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  Future<void> _requestPermissions() async {
    // Check GPS service is enabled
    final gpsOn = await Geolocator.isLocationServiceEnabled();
    if (!gpsOn) {
      if (mounted) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: IvdTheme.surfaceDark,
            title: const Text('GPS Required', style: TextStyle(color: IvdTheme.textPrimary)),
            content: const Text(
              'Cobot IVD requires GPS to be enabled. Please turn on GPS in device settings.',
              style: TextStyle(color: IvdTheme.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () async {
                  await Geolocator.openLocationSettings();
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Open GPS Settings', style: TextStyle(fontSize: 18)),
              ),
            ],
          ),
        );
      }
    }

    // Check and request location permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      // Show dialog telling user to enable in settings
      if (mounted) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: IvdTheme.surfaceDark,
            title: const Text('Location Required', style: TextStyle(color: IvdTheme.textPrimary)),
            content: const Text(
              'Cobot IVD needs location access to track vehicle position and detect arrival at customer locations. Please enable location in device settings.',
              style: TextStyle(color: IvdTheme.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () async {
                  await Geolocator.openLocationSettings();
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Open Settings', style: TextStyle(fontSize: 18)),
              ),
            ],
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: IvdTheme.darkBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset('assets/logo.png', width: 80, height: 80),
            const SizedBox(height: 24),
            const Text(
              'COBOT SERVICES',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: IvdTheme.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 32),
            if (_isChecking)
              const CircularProgressIndicator(color: IvdTheme.primaryBlue),
          ],
        ),
      ),
    );
  }
}
