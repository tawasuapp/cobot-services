import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_service.dart';

/// Singleton that mirrors the admin dashboard's System Settings
/// (admin.cobot.qa/settings). Values are fetched from `GET /settings` and
/// cached in SharedPreferences so they are available immediately on cold
/// start — on connect, we refresh in the background so the app stays in
/// sync with whatever ops changes on the dashboard.
class AppSettingsService {
  AppSettingsService._();
  static final AppSettingsService instance = AppSettingsService._();

  // Defaults — must match the Settings page defaults.
  static const int _defaultArrivalRadiusMeters = 100;
  static const int _defaultLocationIntervalSeconds = 30;

  static const _kArrivalRadius = 'settings_arrival_radius';
  static const _kLocationInterval = 'settings_location_update_interval';

  int _arrivalRadiusMeters = _defaultArrivalRadiusMeters;
  int _locationIntervalSeconds = _defaultLocationIntervalSeconds;
  bool _loaded = false;

  int get arrivalRadiusMeters => _arrivalRadiusMeters;
  Duration get locationUpdateInterval =>
      Duration(seconds: _locationIntervalSeconds.clamp(5, 600));

  /// Load the cached values from disk. Cheap — safe to await on startup.
  Future<void> loadCached() async {
    if (_loaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      _arrivalRadiusMeters =
          prefs.getInt(_kArrivalRadius) ?? _defaultArrivalRadiusMeters;
      _locationIntervalSeconds =
          prefs.getInt(_kLocationInterval) ?? _defaultLocationIntervalSeconds;
    } catch (_) {}
    _loaded = true;
  }

  /// Fetch latest from the backend and persist. Safe to call any time.
  Future<void> refreshFromServer() async {
    try {
      final res = await ApiService().get('/settings');
      final data = res.data;
      if (data is Map) {
        final ar = int.tryParse('${data['arrival_radius']}');
        final li = int.tryParse('${data['location_update_interval']}');
        final prefs = await SharedPreferences.getInstance();
        if (ar != null && ar > 0) {
          _arrivalRadiusMeters = ar;
          await prefs.setInt(_kArrivalRadius, ar);
        }
        if (li != null && li > 0) {
          _locationIntervalSeconds = li;
          await prefs.setInt(_kLocationInterval, li);
        }
        _loaded = true;
      }
    } catch (e) {
      debugPrint('AppSettingsService refresh failed: $e');
    }
  }
}
