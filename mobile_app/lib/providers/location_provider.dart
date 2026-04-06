import 'package:flutter/foundation.dart';
import 'package:flutter_background_geolocation/flutter_background_geolocation.dart' as bg;

import '../services/api_service.dart';

class LocationProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  // ── CONFIGURABLE ──
  static const int trackingIntervalSeconds = 10;
  // ──────────────────

  bg.Location? _currentLocation;
  bool _isTracking = false;

  String? entityType;
  String? entityId;

  bg.Location? get currentLocation => _currentLocation;
  bool get isTracking => _isTracking;

  double? get latitude => _currentLocation?.coords.latitude;
  double? get longitude => _currentLocation?.coords.longitude;

  Future<void> startTracking() async {
    if (entityType == null || entityId == null) {
      debugPrint('BG Location: Cannot start — entityType/entityId not set');
      return;
    }

    await bg.BackgroundGeolocation.ready(bg.Config(
      desiredAccuracy: bg.Config.DESIRED_ACCURACY_HIGH,
      distanceFilter: 0,
      locationUpdateInterval: trackingIntervalSeconds * 1000,
      fastestLocationUpdateInterval: trackingIntervalSeconds * 1000,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      notification: bg.Notification(
        title: 'Cobot Operator',
        text: 'Tracking your location',
        channelName: 'Location Tracking',
        smallIcon: 'mipmap/ic_launcher',
        sticky: true,
        priority: bg.Config.NOTIFICATION_PRIORITY_LOW,
      ),
      foregroundService: true,
      pausesLocationUpdatesAutomatically: false,
      isMoving: true,
      stopTimeout: 5,
      autoSync: false,
      debug: false,
      logLevel: bg.Config.LOG_LEVEL_OFF,
    ));

    bg.BackgroundGeolocation.onLocation(_onLocation);
    bg.BackgroundGeolocation.onMotionChange(_onMotionChange);

    await bg.BackgroundGeolocation.start();

    _isTracking = true;
    notifyListeners();
    debugPrint('BG Location: Started (interval: ${trackingIntervalSeconds}s, survives kill: true)');
  }

  void _onLocation(bg.Location location) {
    _currentLocation = location;
    notifyListeners();
    _sendLocationUpdate(location);
  }

  void _onMotionChange(bg.Location location) {
    debugPrint('BG Location: Motion change — isMoving: ${location.isMoving}');
    _currentLocation = location;
    notifyListeners();
    _sendLocationUpdate(location);
  }

  Future<void> _sendLocationUpdate(bg.Location location) async {
    if (entityType == null || entityId == null) return;

    try {
      await _api.post(
        '/location/update',
        data: {
          'entity_type': entityType,
          'entity_id': entityId,
          'lat': location.coords.latitude,
          'lng': location.coords.longitude,
          'speed': location.coords.speed,
          'heading': location.coords.heading,
          'accuracy': location.coords.accuracy,
        },
      );
      debugPrint('BG Location: Sent ${location.coords.latitude.toStringAsFixed(4)}, ${location.coords.longitude.toStringAsFixed(4)}');
    } catch (e) {
      debugPrint('BG Location: Send failed: $e');
    }
  }

  Future<void> stopTracking() async {
    await bg.BackgroundGeolocation.stop();
    _isTracking = false;
    notifyListeners();
    debugPrint('BG Location: Stopped');
  }

  @override
  void dispose() {
    stopTracking();
    super.dispose();
  }
}

/// Headless task — runs on Android even after app is killed.
@pragma('vm:entry-point')
void backgroundGeolocationHeadlessTask(bg.HeadlessEvent headlessEvent) async {
  if (headlessEvent.name == bg.Event.LOCATION) {
    final location = headlessEvent.event as bg.Location;
    debugPrint('BG Headless: ${location.coords.latitude}, ${location.coords.longitude}');
  }
}
