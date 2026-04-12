import 'package:flutter/material.dart';
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

  /// Open Waze navigation to the given coordinates (falls back to web if
  /// Waze is not installed).
  static Future<bool> openWazeNavigation(
    double latitude,
    double longitude,
  ) async {
    final wazeApp = Uri.parse('waze://?ll=$latitude,$longitude&navigate=yes');
    final wazeWeb = Uri.parse(
      'https://waze.com/ul?ll=$latitude,$longitude&navigate=yes',
    );
    if (await canLaunchUrl(wazeApp)) {
      return launchUrl(wazeApp, mode: LaunchMode.externalApplication);
    }
    return launchUrl(wazeWeb, mode: LaunchMode.externalApplication);
  }

  /// Prompt the user to pick between Waze and Google Maps, then open it.
  /// Google Maps is the backup choice.
  static Future<void> chooseNavigationApp(
    BuildContext context,
    double latitude,
    double longitude,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('Navigate with',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            ListTile(
              leading: const Icon(Icons.navigation, color: Colors.blue),
              title: const Text('Waze'),
              subtitle: const Text('Preferred'),
              onTap: () {
                Navigator.pop(ctx);
                openWazeNavigation(latitude, longitude);
              },
            ),
            ListTile(
              leading: const Icon(Icons.map, color: Colors.green),
              title: const Text('Google Maps'),
              subtitle: const Text('Backup'),
              onTap: () {
                Navigator.pop(ctx);
                openGoogleMapsNavigation(latitude, longitude);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
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
