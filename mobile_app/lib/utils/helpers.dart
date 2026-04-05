import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

class Helpers {
  /// Format a DateTime to a human-readable time string.
  static String formatTime(DateTime dateTime) {
    return DateFormat('h:mm a').format(dateTime);
  }

  /// Format a DateTime to a human-readable date string.
  static String formatDate(DateTime dateTime) {
    return DateFormat('MMM d, yyyy').format(dateTime);
  }

  /// Format a DateTime to a full date-time string.
  static String formatDateTime(DateTime dateTime) {
    return DateFormat('MMM d, yyyy h:mm a').format(dateTime);
  }

  /// Get a relative time string (e.g., "in 2 hours", "30 min ago").
  static String relativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = dateTime.difference(now);

    if (diff.isNegative) {
      final absDiff = diff.abs();
      if (absDiff.inMinutes < 1) return 'just now';
      if (absDiff.inMinutes < 60) return '${absDiff.inMinutes} min ago';
      if (absDiff.inHours < 24) return '${absDiff.inHours}h ago';
      return '${absDiff.inDays}d ago';
    } else {
      if (diff.inMinutes < 1) return 'now';
      if (diff.inMinutes < 60) return 'in ${diff.inMinutes} min';
      if (diff.inHours < 24) return 'in ${diff.inHours}h';
      return 'in ${diff.inDays}d';
    }
  }

  /// Open Google Maps navigation to the given coordinates.
  /// Uses device's real GPS location as origin.
  static Future<bool> openGoogleMapsNavigation(
    double latitude,
    double longitude,
  ) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '&destination=$latitude,$longitude'
      '&travelmode=driving',
    );
    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  /// Open a phone dialer with the given number.
  static Future<bool> openPhoneDialer(String phoneNumber) async {
    final uri = Uri.parse('tel:$phoneNumber');
    if (await canLaunchUrl(uri)) {
      return launchUrl(uri);
    }
    return false;
  }
}
