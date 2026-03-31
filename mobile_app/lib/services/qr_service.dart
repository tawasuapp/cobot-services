import 'dart:convert';

class QrParseResult {
  final bool isValid;
  final String? jobId;
  final String? customerId;
  final String? type;
  final String? errorMessage;

  QrParseResult({
    required this.isValid,
    this.jobId,
    this.customerId,
    this.type,
    this.errorMessage,
  });
}

class QrService {
  /// Parses QR code data and validates its structure.
  /// Expected JSON format:
  /// {
  ///   "type": "cobot_customer" | "cobot_robot",
  ///   "job_id": "...",
  ///   "customer_id": "..."
  /// }
  static QrParseResult parseQrData(String rawData) {
    try {
      final data = jsonDecode(rawData) as Map<String, dynamic>;

      if (!data.containsKey('type')) {
        return QrParseResult(
          isValid: false,
          errorMessage: 'Missing "type" field in QR code',
        );
      }

      final type = data['type'] as String?;
      if (type != 'cobot_customer' && type != 'cobot_robot') {
        return QrParseResult(
          isValid: false,
          errorMessage: 'Invalid QR code type: $type',
        );
      }

      final jobId = data['job_id'] as String?;
      final customerId = data['customer_id'] as String?;

      if (jobId == null || jobId.isEmpty) {
        return QrParseResult(
          isValid: false,
          errorMessage: 'Missing "job_id" in QR code',
        );
      }

      return QrParseResult(
        isValid: true,
        jobId: jobId,
        customerId: customerId,
        type: type,
      );
    } catch (e) {
      return QrParseResult(
        isValid: false,
        errorMessage: 'Invalid QR code format: not valid JSON',
      );
    }
  }
}
