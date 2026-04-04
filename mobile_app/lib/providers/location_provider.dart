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

  /// Set these before starting tracking so location updates
  /// are tagged with the right entity (vehicle or user)
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

    _positionSubscription?.cancel();
    _positionSubscription = _locationService.getPositionStream().listen(
      (position) {
        _currentPosition = position;
        _sendLocationUpdate(position);
        notifyListeners();
      },
      onError: (e) {
        debugPrint('Location stream error: $e');
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
    if (entityType == null || entityId == null) {
      debugPrint('Location update skipped: no entityType/entityId set');
      return;
    }

    try {
      await _api.post(
        ApiConfig.locationUpdate,
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
