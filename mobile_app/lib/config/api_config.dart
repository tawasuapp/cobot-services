class ApiConfig {
  static const String devBaseUrl = 'https://admin.cobot.qa/api';
  static const String prodBaseUrl = 'https://admin.cobot.qa/api';

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: devBaseUrl,
  );

  // Auth endpoints
  static const String login = '/auth/login';
  static const String fcmToken = '/auth/fcm-token';

  // Job endpoints
  static const String jobs = '/jobs';
  static const String operatorJobs = '/jobs/operator';
  static const String todaysJobs = '/jobs/today';

  // Location endpoints
  static const String locationUpdate = '/location/update';

  // QR endpoints
  static const String qrScan = '/qr/scan';

  // Report endpoints
  static const String reports = '/reports';
}
