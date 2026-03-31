import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../config/api_config.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';

class LocationProvider extends ChangeNotifier {
  final LocationService _locationService = LocationService();
  final ApiService _api = ApiService();

  Position? _currentPosition;
  bool _isTracking = false;
  StreamSubscription<Position>? _positionSubscription;

  Position? get currentPosition => _currentPosition;
  bool get isTracking => _isTracking;

  Future<void> startTracking() async {
    final hasPermission = await _locationService.checkAndRequestPermission();
    if (!hasPermission) return;

    _isTracking = true;
    notifyListeners();

    _positionSubscription?.cancel();
    _positionSubscription = _locationService.getPositionStream().listen(
      (position) {
        _currentPosition = position;
        _sendLocationUpdate(position);
        notifyListeners();
      },
    );
  }

  void stopTracking() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
    _isTracking = false;
    notifyListeners();
  }

  Future<void> _sendLocationUpdate(Position position) async {
    try {
      await _api.post(
        ApiConfig.locationUpdate,
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'speed': position.speed,
          'timestamp': position.timestamp.toIso8601String(),
        },
      );
    } catch (_) {
      // Silently fail - location updates are best-effort
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
