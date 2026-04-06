class ApiConfig {
  static const String devBaseUrl = 'https://admin.cobot.qa/api';
  static const String prodBaseUrl = 'https://admin.cobot.qa/api';

  static const bool isProduction = bool.fromEnvironment('dart.vm.product');

  static String get baseUrl => isProduction ? prodBaseUrl : devBaseUrl;

  // Endpoints
  static const String login = '/auth/login';
  static const String ivdSession = '/auth/ivd-session';
  static const String jobs = '/jobs';
  static const String jobArrive = '/jobs/{id}/arrive';
  static const String jobStatus = '/jobs/{id}/status';
  static const String locationUpdate = '/location/update';

  static String jobArriveUrl(String jobId) =>
      '/jobs/$jobId/arrive';

  static String jobStatusUrl(String jobId) =>
      '/jobs/$jobId/status';
}
