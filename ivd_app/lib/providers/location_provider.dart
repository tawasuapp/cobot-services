import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/location_service.dart';
import '../services/api_service.dart';
import '../services/arrival_detection_service.dart';
import '../models/job.dart';

class LocationProvider extends ChangeNotifier {
  final LocationService _locationService = LocationService();
  final ApiService _apiService = ApiService();
  final ArrivalDetectionService _arrivalService = ArrivalDetectionService();

  // ── CONFIGURABLE ──
  static const Duration trackingInterval = Duration(seconds: 10);

  Timer? _locationTimer;
  Position? _currentPosition;
  bool _isTracking = false;
  bool _hasArrived = false;
  Job? _activeJob;

  // Set before starting tracking
  String? entityType; // 'vehicle' or 'user'
  String? entityId;

  Position? get currentPosition => _currentPosition;
  bool get isTracking => _isTracking;
  bool get hasArrived => _hasArrived;
  double? get latitude => _currentPosition?.latitude;
  double? get longitude => _currentPosition?.longitude;

  /// Start continuous location tracking.
  /// Call with activeJob when driving to enable arrival detection.
  Future<void> startTracking({Job? activeJob}) async {
    final hasPermission = await _locationService.checkAndRequestPermission();
    if (!hasPermission) {
      debugPrint('IVD Location: permission denied');
      return;
    }

    _activeJob = activeJob;
    _isTracking = true;
    _hasArrived = false;
    notifyListeners();

    await _captureAndSend();

    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(trackingInterval, (_) => _captureAndSend());
    debugPrint('IVD Location: tracking started (interval: ${trackingInterval.inSeconds}s)');
  }

  void setActiveJob(Job? job) {
    _activeJob = job;
    _hasArrived = false;
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

      // Send to backend with correct field names
      if (entityType != null && entityId != null) {
        await _apiService.post(
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
      }

      // Check arrival if driving to a job
      if (_activeJob != null && !_hasArrived) {
        final arrived = await _arrivalService.checkArrival(
          currentLat: position.latitude,
          currentLng: position.longitude,
          job: _activeJob!,
        );
        if (arrived) {
          _hasArrived = true;
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('IVD Location error: $e');
    }
  }

  void stopTracking() {
    _locationTimer?.cancel();
    _locationTimer = null;
    _isTracking = false;
    _hasArrived = false;
    _activeJob = null;
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
