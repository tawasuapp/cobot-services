import 'dart:math';
import '../models/job.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class ArrivalDetectionService {
  /// Default radius applied when the admin-configured value cannot be read
  /// from the backend. Overridden per-call via `thresholdMeters` so the IVD
  /// app honors the value set in the dashboard's Settings > System tab.
  static const double defaultArrivalThresholdMeters = 100.0;

  final ApiService _apiService = ApiService();

  /// Calculates distance between two coordinates using the Haversine formula.
  /// Returns distance in meters.
  double haversineDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const double earthRadiusMeters = 6371000;
    final double dLat = _degreesToRadians(lat2 - lat1);
    final double dLon = _degreesToRadians(lon2 - lon1);

    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degreesToRadians(lat1)) *
            cos(_degreesToRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);

    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  double _degreesToRadians(double degrees) {
    return degrees * pi / 180;
  }

  /// Checks if the current position is within the arrival threshold of the
  /// job's customer location. If within range, notifies the backend.
  /// Returns true if arrived.
  Future<bool> checkArrival({
    required double currentLat,
    required double currentLng,
    required Job job,
    double thresholdMeters = defaultArrivalThresholdMeters,
  }) async {
    final double distance = haversineDistance(
      currentLat,
      currentLng,
      job.customer.latitude,
      job.customer.longitude,
    );

    if (distance <= thresholdMeters) {
      try {
        await _apiService.post(
          ApiConfig.jobArriveUrl(job.id),
          data: {
            'latitude': currentLat,
            'longitude': currentLng,
            'distance_meters': distance,
          },
        );
        return true;
      } catch (e) {
        // Even if the API call fails, we detected arrival locally.
        // Return true so the UI can navigate; the backend call can retry.
        return true;
      }
    }

    return false;
  }
}
