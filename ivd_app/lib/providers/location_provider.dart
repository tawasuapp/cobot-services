import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/location_service.dart';
import '../services/api_service.dart';
import '../services/arrival_detection_service.dart';
import '../config/api_config.dart';
import '../models/job.dart';

class LocationProvider extends ChangeNotifier {
  final LocationService _locationService = LocationService();
  final ApiService _apiService = ApiService();
  final ArrivalDetectionService _arrivalService = ArrivalDetectionService();

  Timer? _locationTimer;
  Position? _currentPosition;
  bool _isTracking = false;
  bool _hasArrived = false;

  Position? get currentPosition => _currentPosition;
  bool get isTracking => _isTracking;
  bool get hasArrived => _hasArrived;

  double? get latitude => _currentPosition?.latitude;
  double? get longitude => _currentPosition?.longitude;

  /// Starts background location tracking every 30 seconds.
  /// Sends location to the backend and checks for arrival at the active job.
  Future<void> startTracking({Job? activeJob}) async {
    final hasPermission = await _locationService.checkAndRequestPermission();
    if (!hasPermission) return;

    _isTracking = true;
    _hasArrived = false;
    notifyListeners();

    // Get initial position immediately
    await _updateLocation(activeJob: activeJob);

    // Then update every 30 seconds
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _updateLocation(activeJob: activeJob),
    );
  }

  Future<void> _updateLocation({Job? activeJob}) async {
    try {
      final position = await _locationService.getCurrentPosition();
      if (position == null) return;

      _currentPosition = position;
      notifyListeners();

      // Send location to backend
      await _apiService.post(
        ApiConfig.locationUpdate,
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'speed': position.speed,
          'timestamp': position.timestamp.toIso8601String(),
        },
      );

      // Check arrival if there is an active job being driven to
      if (activeJob != null && !_hasArrived) {
        final arrived = await _arrivalService.checkArrival(
          currentLat: position.latitude,
          currentLng: position.longitude,
          job: activeJob,
        );

        if (arrived) {
          _hasArrived = true;
          notifyListeners();
        }
      }
    } catch (e) {
      // Silently handle errors; location tracking should not crash the app
      debugPrint('Location update error: $e');
    }
  }

  void stopTracking() {
    _locationTimer?.cancel();
    _locationTimer = null;
    _isTracking = false;
    _hasArrived = false;
    notifyListeners();
  }

  void resetArrival() {
    _hasArrived = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }
}
