import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Holds system-wide settings fetched from the backend (e.g. arrival radius).
///
/// The dashboard exposes these values at /settings (Settings > System Settings).
/// We pull them into the IVD app so behavior such as auto-arrival uses the
/// admin-configured threshold instead of a hardcoded constant.
class SettingsProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  // Sensible defaults — match the dashboard's defaults so behavior is the
  // same when the backend is unreachable.
  double _arrivalRadiusMeters = 100;
  int _locationUpdateIntervalSeconds = 30;
  int _lateArrivalThresholdMinutes = 15;
  bool _loaded = false;

  double get arrivalRadiusMeters => _arrivalRadiusMeters;
  int get locationUpdateIntervalSeconds => _locationUpdateIntervalSeconds;
  int get lateArrivalThresholdMinutes => _lateArrivalThresholdMinutes;
  bool get isLoaded => _loaded;

  Future<void> load() async {
    try {
      final res = await _apiService.get('/settings');
      final data = res.data as Map<String, dynamic>?;
      if (data != null) {
        _arrivalRadiusMeters = _toDouble(data['arrival_radius'], _arrivalRadiusMeters);
        _locationUpdateIntervalSeconds = _toInt(
            data['location_update_interval'], _locationUpdateIntervalSeconds);
        _lateArrivalThresholdMinutes = _toInt(
            data['late_arrival_threshold'], _lateArrivalThresholdMinutes);
      }
      _loaded = true;
      notifyListeners();
    } catch (e) {
      debugPrint('SettingsProvider: failed to load settings: $e');
      _loaded = true; // proceed with defaults
      notifyListeners();
    }
  }

  static double _toDouble(dynamic v, double fallback) {
    if (v == null) return fallback;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? fallback;
  }

  static int _toInt(dynamic v, int fallback) {
    if (v == null) return fallback;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString()) ?? fallback;
  }
}
