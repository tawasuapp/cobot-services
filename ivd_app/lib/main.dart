import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/job_provider.dart';
import 'providers/location_provider.dart';
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
    final authProvider = context.read<AuthProvider>();
    final loggedIn = await authProvider.tryAutoLogin();

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: IvdTheme.darkBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.precision_manufacturing,
              size: 80,
              color: IvdTheme.primaryBlue,
            ),
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
