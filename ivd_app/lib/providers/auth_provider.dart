import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  User? _user;
  bool _isLoading = false;
  String? _errorMessage;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get errorMessage => _errorMessage;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.post(
        ApiConfig.login,
        data: {
          'email': email,
          'password': password,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final token = data['token'] as String;
      await _apiService.setToken(token);

      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Login failed: $e';
      debugPrint('LOGIN ERROR: $e');
      notifyListeners();
      return false;
    }
  }

  void setUser(User user) {
    _user = user;
    notifyListeners();
  }

  Future<void> logout() async {
    await _apiService.clearToken();
    _user = null;
    notifyListeners();
  }

  Future<bool> tryAutoLogin() async {
    final token = await _apiService.getToken();
    if (token == null) return false;

    try {
      final response = await _apiService.get('/auth/me');
      final data = response.data as Map<String, dynamic>;
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      notifyListeners();
      return true;
    } catch (e) {
      await _apiService.clearToken();
      return false;
    }
  }
}
