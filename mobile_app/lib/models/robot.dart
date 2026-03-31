class Robot {
  final String id;
  final String serialNumber;
  final String model;
  final String status;
  final String? firmwareVersion;

  Robot({
    required this.id,
    required this.serialNumber,
    required this.model,
    required this.status,
    this.firmwareVersion,
  });

  factory Robot.fromJson(Map<String, dynamic> json) {
    return Robot(
      id: json['id'] as String,
      serialNumber: json['serial_number'] as String,
      model: json['model'] as String,
      status: json['status'] as String,
      firmwareVersion: json['firmware_version'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'serial_number': serialNumber,
      'model': model,
      'status': status,
      'firmware_version': firmwareVersion,
    };
  }
}
