import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';
import '../config/theme.dart';
import '../models/user.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/ivd_button.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Toggle between QR and typed login
  bool _showQrLogin = true;

  // QR Login state
  String? _sessionId;
  bool _qrLoading = false;
  String? _qrError;
  Timer? _pollTimer;

  // Type Login state
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;
  bool _rememberMe = true;

  final _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
    _createQrSession();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // ─── QR Login ──────────────────────────────────────────

  Future<void> _createQrSession() async {
    setState(() {
      _qrLoading = true;
      _qrError = null;
      _sessionId = null;
    });
    _pollTimer?.cancel();

    try {
      final response = await _apiService.post(ApiConfig.ivdSession);
      final sessionId = response.data['sessionId'] as String;
      setState(() {
        _sessionId = sessionId;
        _qrLoading = false;
      });
      _startPolling(sessionId);
    } catch (e) {
      setState(() {
        _qrLoading = false;
        _qrError = 'Failed to create session. Check connection.';
      });
    }
  }

  void _startPolling(String sessionId) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) async {
      try {
        final response = await _apiService.get('${ApiConfig.ivdSession}/$sessionId');
        final data = response.data;
        if (data['status'] == 'approved') {
          _pollTimer?.cancel();
          final token = data['token'] as String;
          final userData = data['user'] as Map<String, dynamic>;

          await _apiService.setToken(token);
          final user = User.fromJson(userData);

          if (mounted) {
            context.read<AuthProvider>().setUser(user);
            Navigator.of(context).pushReplacementNamed('/home');
          }
        }
      } catch (e) {
        // 404 means session expired
        if (e.toString().contains('404')) {
          _pollTimer?.cancel();
          if (mounted) {
            setState(() => _qrError = 'Session expired. Tap to refresh.');
          }
        }
      }
    });
  }

  // ─── Type Login ──────���─────────────────────────────────

  Future<void> _loadSavedCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    final savedEmail = prefs.getString('saved_email');
    final savedPassword = prefs.getString('saved_password');
    if (savedEmail != null) {
      _emailController.text = savedEmail;
      _passwordController.text = savedPassword ?? '';
      setState(() => _rememberMe = true);
    }
  }

  Future<void> _saveCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    if (_rememberMe) {
      await prefs.setString('saved_email', _emailController.text.trim());
      await prefs.setString('saved_password', _passwordController.text);
    } else {
      await prefs.remove('saved_email');
      await prefs.remove('saved_password');
    }
  }

  Future<void> _handleTypedLogin() async {
    if (!_formKey.currentState!.validate()) return;
    await _saveCredentials();

    if (!mounted) return;
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  // ─── Build ─────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: size.width * 0.05,
              vertical: 20,
            ),
            child: _showQrLogin ? _buildQrLogin(size) : _buildTypedLogin(size),
          ),
        ),
      ),
    );
  }

  Widget _buildQrLogin(Size size) {
    final qrData = _sessionId != null
        ? jsonEncode({'type': 'ivd_login', 'sessionId': _sessionId})
        : '';

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Left: branding
            Column(
              children: [
                Icon(Icons.precision_manufacturing, size: size.height * 0.2, color: IvdTheme.primaryBlue),
                const SizedBox(height: 12),
                const Text(
                  'COBOT SERVICES',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: IvdTheme.textPrimary, letterSpacing: 2),
                ),
                const SizedBox(height: 4),
                const Text('In-Vehicle Display', style: TextStyle(fontSize: 16, color: IvdTheme.textSecondary)),
              ],
            ),
            SizedBox(width: size.width * 0.06),
            // Right: QR code
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: IvdTheme.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: IvdTheme.primaryBlue.withValues(alpha: 0.3)),
              ),
              child: Column(
                children: [
                  const Text(
                    'Scan with Cobot Operator App',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: IvdTheme.textPrimary),
                  ),
                  const SizedBox(height: 16),
                  if (_qrLoading)
                    const SizedBox(
                      width: 180, height: 180,
                      child: Center(child: CircularProgressIndicator(color: IvdTheme.primaryBlue)),
                    )
                  else if (_qrError != null)
                    GestureDetector(
                      onTap: _createQrSession,
                      child: SizedBox(
                        width: 180, height: 180,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.refresh, size: 40, color: IvdTheme.warningOrange),
                              const SizedBox(height: 8),
                              Text(_qrError!, style: const TextStyle(fontSize: 14, color: IvdTheme.warningOrange), textAlign: TextAlign.center),
                            ],
                          ),
                        ),
                      ),
                    )
                  else if (_sessionId != null)
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: QrImageView(
                        data: qrData,
                        version: QrVersions.auto,
                        size: 180,
                        backgroundColor: Colors.white,
                      ),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextButton.icon(
                        onPressed: _createQrSession,
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Refresh QR'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        TextButton(
          onPressed: () => setState(() => _showQrLogin = false),
          child: const Text('Type Login Instead', style: TextStyle(color: IvdTheme.accentBlue, fontSize: 16)),
        ),
      ],
    );
  }

  Widget _buildTypedLogin(Size size) {
    final authProvider = context.watch<AuthProvider>();

    return Form(
      key: _formKey,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left: branding
          Expanded(
            flex: 2,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.precision_manufacturing, size: size.height * 0.2, color: IvdTheme.primaryBlue),
                const SizedBox(height: 12),
                const FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text('COBOT SERVICES', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: IvdTheme.textPrimary, letterSpacing: 2)),
                ),
                const SizedBox(height: 4),
                const Text('In-Vehicle Display', style: TextStyle(fontSize: 16, color: IvdTheme.textSecondary)),
              ],
            ),
          ),
          SizedBox(width: size.width * 0.04),
          // Right: login form
          Expanded(
            flex: 3,
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: size.width * 0.02, vertical: size.height * 0.05),
              decoration: BoxDecoration(
                color: IvdTheme.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: IvdTheme.primaryBlue.withValues(alpha: 0.3)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Driver Login', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: IvdTheme.textPrimary), textAlign: TextAlign.center),
                  SizedBox(height: size.height * 0.04),
                  SizedBox(
                    height: 52,
                    child: TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      style: const TextStyle(fontSize: 16),
                      decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email, size: 20), contentPadding: EdgeInsets.symmetric(vertical: 0, horizontal: 12)),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your email' : null,
                    ),
                  ),
                  SizedBox(height: size.height * 0.03),
                  SizedBox(
                    height: 52,
                    child: TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      style: const TextStyle(fontSize: 16),
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock, size: 20),
                        contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                        suffixIcon: IconButton(icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, size: 20), onPressed: () => setState(() => _obscurePassword = !_obscurePassword)),
                      ),
                      validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
                      onFieldSubmitted: (_) => _handleTypedLogin(),
                    ),
                  ),
                  SizedBox(height: size.height * 0.02),
                  Row(
                    children: [
                      SizedBox(height: 24, width: 24, child: Checkbox(value: _rememberMe, onChanged: (v) => setState(() => _rememberMe = v ?? false), activeColor: IvdTheme.primaryBlue)),
                      const SizedBox(width: 8),
                      const Text('Remember me', style: TextStyle(fontSize: 14, color: IvdTheme.textSecondary)),
                    ],
                  ),
                  if (authProvider.errorMessage != null) ...[
                    const SizedBox(height: 8),
                    Text(authProvider.errorMessage!, style: const TextStyle(color: IvdTheme.errorRed, fontSize: 13), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                  SizedBox(height: size.height * 0.03),
                  IvdButton(label: authProvider.isLoading ? 'Logging in...' : 'LOGIN', icon: Icons.login, onPressed: authProvider.isLoading ? null : _handleTypedLogin, expanded: true, minHeight: 52, fontSize: 18),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => setState(() => _showQrLogin = true),
                    child: const Text('Login with QR Code', style: TextStyle(color: IvdTheme.accentBlue, fontSize: 14)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
