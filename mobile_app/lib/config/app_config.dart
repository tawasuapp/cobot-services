class AppConfig {
  static const String appName = 'Cobot Services';
  static const String appVersion = '1.0.0';

  // Location tracking interval in seconds
  static const int locationUpdateInterval = 30;

  // Job refresh interval in seconds
  static const int jobRefreshInterval = 60;

  // Secure storage keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String rememberMeKey = 'remember_me';
}
