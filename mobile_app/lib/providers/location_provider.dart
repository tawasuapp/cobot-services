import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../services/api_service.dart';
import '../services/location_service.dart';

class LocationProvider extends ChangeNotifier {
  final LocationService _locationService = LocationService();
  final ApiService _api = ApiService();

  // ── CONFIGURABLE: Change this to adjust tracking frequency ──
  static const Duration trackingInterval = Duration(seconds: 10);
  // ────────────────────────────────────────────────────────────

  Position? _currentPosition;
  bool _isTracking = false;
  Timer? _trackingTimer;

  /// Set these before calling startTracking()
  String? entityType; // 'vehicle' or 'user'
  String? entityId;

  Position? get currentPosition => _currentPosition;
  bool get isTracking => _isTracking;

  Future<void> startTracking() async {
    final hasPermission = await _locationService.checkAndRequestPermission();
    if (!hasPermission) {
      debugPrint('Location permission denied');
      return;
    }

    _isTracking = true;
    notifyListeners();

    // Get initial position immediately
    await _captureAndSend();

    // Then repeat at fixed interval
    _trackingTimer?.cancel();
    _trackingTimer = Timer.periodic(trackingInterval, (_) {
      _captureAndSend();
    });
  }

  void stopTracking() {
    _trackingTimer?.cancel();
    _trackingTimer = null;
    _isTracking = false;
    notifyListeners();
  }

  Future<void> _captureAndSend() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
      _currentPosition = position;
      notifyListeners();
      await _sendLocationUpdate(position);
    } catch (e) {
      debugPrint('Location capture failed: $e');
    }
  }

  Future<void> _sendLocationUpdate(Position position) async {
    if (entityType == null || entityId == null) {
      debugPrint('Location update skipped: no entityType/entityId set');
      return;
    }

    try {
      await _api.post(
        '/location/update',
        data: {
          'entity_type': entityType,
          'entity_id': entityId,
          'lat': position.latitude,
          'lng': position.longitude,
          'speed': position.speed,
          'heading': position.heading,
          'accuracy': position.accuracy,
        },
      );
      debugPrint('Location sent: ${position.latitude}, ${position.longitude}');
    } catch (e) {
      debugPrint('Location update failed: $e');
    }
  }

  Future<Position?> getCurrentPosition() async {
    final position = await _locationService.getCurrentPosition();
    if (position != null) {
      _currentPosition = position;
      notifyListeners();
    }
    return position;
  }

  @override
  void dispose() {
    stopTracking();
    super.dispose();
  }
}
