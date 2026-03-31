class ApiConfig {
  static const String devBaseUrl = 'http://10.0.2.2:3000/api/v1';
  static const String prodBaseUrl = 'https://api.cobotservices.com/api/v1';

  static const bool isProduction = bool.fromEnvironment('dart.vm.product');

  static String get baseUrl => isProduction ? prodBaseUrl : devBaseUrl;

  // Endpoints
  static const String login = '/auth/login';
  static const String jobs = '/jobs';
  static const String jobArrive = '/jobs/{id}/arrive';
  static const String jobStatus = '/jobs/{id}/status';
  static const String locationUpdate = '/location/update';

  static String jobArriveUrl(String jobId) =>
      '/jobs/$jobId/arrive';

  static String jobStatusUrl(String jobId) =>
      '/jobs/$jobId/status';
}
